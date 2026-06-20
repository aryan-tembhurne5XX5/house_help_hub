
import { GraphQLError } from 'graphql';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import xss from 'xss';
import { generateToken } from '../../middleware/auth.js';

// Simple in-memory rate limiter for auth mutations
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

const checkRateLimit = (ip, action) => {
  const key = `${ip}:${action}`;
  const now = Date.now();
  if (!rateLimitCache.has(key)) {
    rateLimitCache.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  const record = rateLimitCache.get(key);
  if (now > record.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (record.count >= MAX_REQUESTS) {
    throw new GraphQLError('Too many requests, please try again later.', { extensions: { code: 'TOO_MANY_REQUESTS' } });
  }
  record.count += 1;
};

// Zod schemas
const registerUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const registerWorkerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});


const authResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      return {
        id: user.id,
        role: user.role,
        email: user.email,
      };
    },
  },
  Mutation: {
    // ─── Register User ────────────────────────────────────────────────────────
    registerUser: async (_, { input }, { pool, req }) => {
      if (req && req.ip) checkRateLimit(req.ip, 'registerUser');

      // Validate input
      const parseResult = registerUserSchema.safeParse(input);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      let { name, email, password, phone, address } = parseResult.data;
      address = address ? xss(address) : null;

      // Check if user already exists
      const [existingUsers] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        throw new GraphQLError('User with this email already exists', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate avatar based on name
      const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

      // Insert new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, phone, address, profile_pic) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone || null, address || null, profilePic]
      );

      // Generate JWT token
      const token = generateToken({ id: result.insertId, email, role: 'user' });

      return {
        token,
        user_id: result.insertId,
        name,
        email,
        profile_pic: profilePic,
        role: 'user',
      };
    },

    // ─── Register Worker ──────────────────────────────────────────────────────
    registerWorker: async (_, { input }, { pool, req }) => {
      if (req && req.ip) checkRateLimit(req.ip, 'registerWorker');

      const parseResult = registerWorkerSchema.safeParse(input);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      let { name, email, password, phone, address, bio } = parseResult.data;
      address = address ? xss(address) : null;
      bio = bio ? xss(bio) : null;

      const [existingWorkers] = await pool.query('SELECT worker_id FROM workers WHERE email = ?', [email]);
      if (existingWorkers.length > 0) {
        throw new GraphQLError('Worker with this email already exists', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

      const [result] = await pool.query(
        'INSERT INTO workers (name, email, password, phone, address, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone, address || null, bio || null, profilePic]
      );

      const token = generateToken({ id: result.insertId, email, role: 'worker' });

      return {
        token,
        worker_id: result.insertId,
        name,
        email,
        profile_pic: profilePic,
        role: 'worker',
      };
    },

    // ─── Login User ───────────────────────────────────────────────────────────
    loginUser: async (_, args, { pool, req }) => {
      if (req && req.ip) checkRateLimit(req.ip, 'loginUser');

      const parseResult = loginSchema.safeParse(args);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const { email, password } = parseResult.data;

      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

      if (users.length === 0) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      // Check if user is blocked
      if (user.is_blocked) {
        throw new GraphQLError('Account blocked', { extensions: { code: 'FORBIDDEN' } });
      }

      const token = generateToken({ id: user.user_id, email: user.email, role: 'user' });

      return {
        token,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        profile_pic: user.profile_pic,
        phone: user.phone,
        address: user.address,
        role: 'user',
      };
    },

    // ─── Login Worker ─────────────────────────────────────────────────────────
    loginWorker: async (_, args, { pool, req }) => {
      if (req && req.ip) checkRateLimit(req.ip, 'loginWorker');

      const parseResult = loginSchema.safeParse(args);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const { email, password } = parseResult.data;

      const [workers] = await pool.query('SELECT * FROM workers WHERE email = ?', [email]);

      if (workers.length === 0) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const worker = workers[0];
      const passwordMatch = await bcrypt.compare(password, worker.password);

      if (!passwordMatch) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      // Check if worker is blocked
      if (worker.is_blocked) {
        throw new GraphQLError('Account blocked', { extensions: { code: 'FORBIDDEN' } });
      }

      const token = generateToken({ id: worker.worker_id, email: worker.email, role: 'worker' });

      return {
        token,
        worker_id: worker.worker_id,
        name: worker.name,
        email: worker.email,
        profile_pic: worker.profile_pic,
        phone: worker.phone,
        address: worker.address,
        bio: worker.bio,
        avg_rating: worker.avg_rating ? parseFloat(worker.avg_rating) : 0,
        role: 'worker',
      };
    },

    // ─── Login Admin ──────────────────────────────────────────────────────────
    loginAdmin: async (_, args, { pool, req }) => {
      if (req && req.ip) checkRateLimit(req.ip, 'loginAdmin');

      const parseResult = loginSchema.safeParse(args);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const { email, password } = parseResult.data;

      const [admins] = await pool.query('SELECT * FROM users WHERE email = ? AND is_superuser = TRUE', [email]);

      if (admins.length === 0) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const admin = admins[0];
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (!passwordMatch) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      // Check if admin is blocked
      if (admin.is_blocked) {
        throw new GraphQLError('Account blocked', { extensions: { code: 'FORBIDDEN' } });
      }

      const token = generateToken({ id: admin.user_id, email: admin.email, role: 'admin' });

      return {
        token,
        admin_id: admin.user_id,
        name: admin.name,
        email: admin.email,
        profile_pic: admin.profile_pic,
        role: 'admin',
      };
    },

    // ─── Change User Password ─────────────────────────────────────────────
    changeUserPassword: async (_, { userId, currentPassword, newPassword }, context) => {
      if (!context.user || context.user.role !== 'user' || context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      if (!newPassword || newPassword.length < 6) {
        throw new GraphQLError('New password must be at least 6 characters', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const [users] = await context.pool.query('SELECT password FROM users WHERE user_id = ?', [userId]);
      if (users.length === 0) {
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, users[0].password);
      if (!passwordMatch) {
        throw new GraphQLError('Current password is incorrect', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await context.pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);

      return { message: 'Password updated successfully' };
    },

    // ─── Change Worker Password ───────────────────────────────────────────
    changeWorkerPassword: async (_, { workerId, currentPassword, newPassword }, context) => {
      if (!context.user || context.user.role !== 'worker' || context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      if (!newPassword || newPassword.length < 6) {
        throw new GraphQLError('New password must be at least 6 characters', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const [rows] = await context.pool.query('SELECT password FROM workers WHERE worker_id = ?', [workerId]);
      if (rows.length === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const worker = rows[0];
      const isMatch = await bcrypt.compare(currentPassword, worker.password);
      if (!isMatch) {
        throw new GraphQLError('Incorrect current password', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await context.pool.query('UPDATE workers SET password = ? WHERE worker_id = ?', [hashedPassword, workerId]);

      return { message: 'Password changed successfully' };
    },

    // ─── Forgot Password ──────────────────────────────────────────────────────
    forgotPassword: async (_, { email, role }, { pool }) => {
      const table = role === 'worker' ? 'workers' : 'users';
      const queryStr = role === 'admin'
        ? `SELECT email FROM ${table} WHERE email = ? AND is_superuser = TRUE`
        : `SELECT email FROM ${table} WHERE email = ?`;
      
      const [rows] = await pool.query(queryStr, [email]);
      if (rows.length === 0) {
        // Return success anyway to prevent email enumeration
        return { message: 'If that email exists, a reset link has been sent.' };
      }

      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      await pool.query(
        'INSERT INTO password_resets (email, role, token, expires_at) VALUES (?, ?, ?, ?)',
        [email, role, token, expiresAt]
      );

      // In a real app, send an email here. We'll just log it.
      console.log(`\n\n[PASSWORD RESET LINK]: http://localhost:8080/auth/reset-password?token=${token}\n\n`);

      return { message: 'If that email exists, a reset link has been sent.' };
    },

    // ─── Reset Password ───────────────────────────────────────────────────────
    resetPassword: async (_, { token, newPassword }, { pool }) => {
      if (!newPassword || newPassword.length < 6) {
        throw new GraphQLError('New password must be at least 6 characters', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const [rows] = await pool.query(
        'SELECT email, role FROM password_resets WHERE token = ? AND expires_at > NOW()',
        [token]
      );

      if (rows.length === 0) {
        throw new GraphQLError('Invalid or expired reset token', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const { email, role } = rows[0];
      const table = role === 'worker' ? 'workers' : 'users';
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await pool.query('START TRANSACTION');
      try {
        await pool.query(`UPDATE ${table} SET password = ? WHERE email = ?`, [hashedPassword, email]);
        await pool.query('DELETE FROM password_resets WHERE email = ? AND role = ?', [email, role]);
        await pool.query('COMMIT');
        return { message: 'Password has been reset successfully.' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default authResolvers;
