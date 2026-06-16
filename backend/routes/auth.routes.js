
import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import { generateToken, authenticate } from '../middleware/auth.js';
import {
  validateUserRegistration,
  validateWorkerRegistration,
  validateLogin,
  validatePasswordChange,
} from '../middleware/validate.js';

const router = express.Router();

// ─── User Registration ──────────────────────────────────────────────────────

router.post('/users/register', validateUserRegistration, async (req, res, next) => {
  const { name, email, password, phone, address } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
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

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user_id: result.insertId,
      name,
      email,
      profile_pic: profilePic,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Worker Registration ────────────────────────────────────────────────────

router.post('/workers/register', validateWorkerRegistration, async (req, res, next) => {
  const { name, email, password, phone, address, bio } = req.body;

  try {
    const [existingWorkers] = await pool.query('SELECT worker_id FROM workers WHERE email = ?', [email]);
    if (existingWorkers.length > 0) {
      return res.status(400).json({ message: 'Worker with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

    const [result] = await pool.query(
      'INSERT INTO workers (name, email, password, phone, address, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, address || null, bio || null, profilePic]
    );

    const token = generateToken({ id: result.insertId, email, role: 'worker' });

    res.status(201).json({
      message: 'Worker registered successfully',
      token,
      worker_id: result.insertId,
      name,
      email,
      profile_pic: profilePic,
    });
  } catch (error) {
    next(error);
  }
});

// ─── User Login ─────────────────────────────────────────────────────────────

router.post('/users/login', validateLogin, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.user_id, email: user.email, role: 'user' });

    // Return user data without password
    const { password: _, ...userData } = user;
    res.json({ ...userData, token });
  } catch (error) {
    next(error);
  }
});

// ─── Worker Login ───────────────────────────────────────────────────────────

router.post('/workers/login', validateLogin, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [workers] = await pool.query('SELECT * FROM workers WHERE email = ?', [email]);

    if (workers.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const worker = workers[0];
    const passwordMatch = await bcrypt.compare(password, worker.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: worker.worker_id, email: worker.email, role: 'worker' });

    const { password: _, ...workerData } = worker;
    res.json({ ...workerData, token });
  } catch (error) {
    next(error);
  }
});

// ─── Admin Login ────────────────────────────────────────────────────────────

router.post('/admins/login', validateLogin, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const admin = admins[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: admin.admin_id, email: admin.email, role: 'admin' });

    const { password: _, ...adminData } = admin;
    res.json({ ...adminData, token });
  } catch (error) {
    next(error);
  }
});

// ─── Change Password ────────────────────────────────────────────────────────

router.put('/users/:userId/password', validatePasswordChange, async (req, res, next) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await pool.query('SELECT password FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/workers/:workerId/password', validatePasswordChange, async (req, res, next) => {
  const { workerId } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const [workers] = await pool.query('SELECT password FROM workers WHERE worker_id = ?', [workerId]);
    if (workers.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, workers[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE workers SET password = ? WHERE worker_id = ?', [hashedPassword, workerId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
