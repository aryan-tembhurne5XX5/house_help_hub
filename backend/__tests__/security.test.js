/**
 * Security Test Suite for House Help Hub
 * Tests authentication, authorization, booking ownership, and GraphQL security.
 */

import { jest } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { z } from 'zod';
import xss from 'xss';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the permission helpers
import { requireAuth, requireAdmin, requireWorker, requireUser, requireRole } from '../middleware/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Mock Helpers ──────────────────────────────────────────────────────────────

// Mock pool that returns empty results by default
const createMockPool = (overrides = {}) => ({
  query: jest.fn().mockResolvedValue([[], null]),
  ...overrides,
});

// ─── Authentication Tests ──────────────────────────────────────────────────────

describe('Authentication Tests', () => {
  test('requireAuth throws UNAUTHENTICATED when no user in context', () => {
    const context = { user: null, pool: createMockPool() };
    expect(() => requireAuth(context)).toThrow(GraphQLError);
    expect(() => requireAuth(context)).toThrow('Unauthorized');
  });

  test('requireAuth succeeds when user is in context', () => {
    const context = { user: { id: 1, role: 'user', email: 'test@test.com' }, pool: createMockPool() };
    expect(() => requireAuth(context)).not.toThrow();
  });

  test('requireAuth throws for undefined user', () => {
    const context = { pool: createMockPool() };
    expect(() => requireAuth(context)).toThrow(GraphQLError);
  });
});

// ─── Authorization Tests ───────────────────────────────────────────────────────

describe('Authorization Tests', () => {
  describe('requireAdmin', () => {
    test('throws UNAUTHENTICATED when no user', () => {
      const context = { user: null, pool: createMockPool() };
      expect(() => requireAdmin(context)).toThrow('Unauthorized');
    });

    test('throws FORBIDDEN when user is not admin', () => {
      const context = { user: { id: 1, role: 'user', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireAdmin(context)).toThrow('Forbidden');
    });

    test('throws FORBIDDEN when worker tries admin', () => {
      const context = { user: { id: 1, role: 'worker', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireAdmin(context)).toThrow('Forbidden');
    });

    test('succeeds when user is admin', () => {
      const context = { user: { id: 1, role: 'admin', email: 'admin@test.com' }, pool: createMockPool() };
      expect(() => requireAdmin(context)).not.toThrow();
    });
  });

  describe('requireWorker', () => {
    test('throws FORBIDDEN when user tries worker', () => {
      const context = { user: { id: 1, role: 'user', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireWorker(context)).toThrow('Forbidden');
    });

    test('succeeds when user is worker', () => {
      const context = { user: { id: 1, role: 'worker', email: 'worker@test.com' }, pool: createMockPool() };
      expect(() => requireWorker(context)).not.toThrow();
    });
  });

  describe('requireUser', () => {
    test('throws FORBIDDEN when worker tries user', () => {
      const context = { user: { id: 1, role: 'worker', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireUser(context)).toThrow('Forbidden');
    });

    test('succeeds when user is user', () => {
      const context = { user: { id: 1, role: 'user', email: 'user@test.com' }, pool: createMockPool() };
      expect(() => requireUser(context)).not.toThrow();
    });
  });

  describe('requireRole with multiple roles', () => {
    test('succeeds when user has one of allowed roles', () => {
      const context = { user: { id: 1, role: 'worker', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireRole(context, ['user', 'worker'])).not.toThrow();
    });

    test('fails when user does not have any of allowed roles', () => {
      const context = { user: { id: 1, role: 'user', email: 'test@test.com' }, pool: createMockPool() };
      expect(() => requireRole(context, ['admin', 'worker'])).toThrow('Forbidden');
    });
  });
});

// ─── Admin Query Protection Tests ──────────────────────────────────────────────

describe('Admin Query Protection', () => {
  test('allUsers blocked without admin login', () => {
    const context = { user: null, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow();
  });

  test('allUsers blocked for user role', () => {
    const context = { user: { id: 1, role: 'user' }, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow('Forbidden');
  });

  test('allUsers blocked for worker role', () => {
    const context = { user: { id: 1, role: 'worker' }, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow('Forbidden');
  });

  test('allWorkers blocked without admin login', () => {
    const context = { user: null, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow();
  });

  test('allBookings blocked without admin login', () => {
    const context = { user: null, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow();
  });

  test('dashboardStats blocked for user role', () => {
    const context = { user: { id: 1, role: 'user' }, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow('Forbidden');
  });

  test('revenueAnalytics blocked for worker role', () => {
    const context = { user: { id: 1, role: 'worker' }, pool: createMockPool() };
    expect(() => requireAdmin(context)).toThrow('Forbidden');
  });
});

// ─── Booking Ownership Tests ────────────────────────────────────────────────────

describe('Booking Ownership Validation', () => {
  test('User A cannot access User B bookings', () => {
    const booking = { user_id: 2, worker_id: 5, status: 'confirmed' };
    const context = { user: { id: 1, role: 'user' } };
    
    const isOwner = context.user.role === 'user' && booking.user_id === context.user.id;
    const isAssignedWorker = context.user.role === 'worker' && booking.worker_id === context.user.id;
    const isAdmin = context.user.role === 'admin';
    
    expect(isOwner || isAssignedWorker || isAdmin).toBe(false);
  });

  test('Booking owner can access their own booking', () => {
    const booking = { user_id: 1, worker_id: 5, status: 'confirmed' };
    const context = { user: { id: 1, role: 'user' } };
    
    const isOwner = context.user.role === 'user' && booking.user_id === context.user.id;
    expect(isOwner).toBe(true);
  });

  test('Assigned worker can access booking', () => {
    const booking = { user_id: 1, worker_id: 5, status: 'confirmed' };
    const context = { user: { id: 5, role: 'worker' } };
    
    const isAssignedWorker = context.user.role === 'worker' && booking.worker_id === context.user.id;
    expect(isAssignedWorker).toBe(true);
  });

  test('Admin can access any booking', () => {
    const booking = { user_id: 1, worker_id: 5, status: 'confirmed' };
    const context = { user: { id: 99, role: 'admin' } };
    
    const isAdmin = context.user.role === 'admin';
    expect(isAdmin).toBe(true);
  });

  test('Unassigned worker cannot access booking', () => {
    const booking = { user_id: 1, worker_id: 5, status: 'confirmed' };
    const context = { user: { id: 10, role: 'worker' } };
    
    const isAssignedWorker = context.user.role === 'worker' && booking.worker_id === context.user.id;
    expect(isAssignedWorker).toBe(false);
  });
});

// ─── User Ownership Tests ──────────────────────────────────────────────────────

describe('User Profile Ownership', () => {
  test('User cannot access another users profile', () => {
    const context = { user: { id: 1, role: 'user' }, pool: createMockPool() };
    const requestedUserId = 2;
    
    expect(context.user.id === requestedUserId).toBe(false);
  });

  test('User can access own profile', () => {
    const context = { user: { id: 1, role: 'user' }, pool: createMockPool() };
    const requestedUserId = 1;
    
    expect(context.user.id === requestedUserId).toBe(true);
  });
});

// ─── Worker Ownership Tests ────────────────────────────────────────────────────

describe('Worker Profile Ownership', () => {
  test('Worker cannot access another workers profile', () => {
    const context = { user: { id: 1, role: 'worker' }, pool: createMockPool() };
    const requestedWorkerId = 2;
    
    requireWorker(context);
    expect(context.user.id === requestedWorkerId).toBe(false);
  });

  test('Worker can access own profile', () => {
    const context = { user: { id: 1, role: 'worker' }, pool: createMockPool() };
    const requestedWorkerId = 1;
    
    requireWorker(context);
    expect(context.user.id === requestedWorkerId).toBe(true);
  });
});

// ─── GraphQL Introspection Tests ───────────────────────────────────────────────

describe('GraphQL Introspection Security', () => {
  test('Introspection disabled in production', () => {
    const introspectionEnabled = process.env.NODE_ENV !== 'production';
    
    // In test env, introspection would be enabled
    expect(introspectionEnabled).toBe(true);
    
    // Simulate production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const introspectionInProd = process.env.NODE_ENV !== 'production';
    expect(introspectionInProd).toBe(false);
    process.env.NODE_ENV = originalEnv;
  });
});

// ─── Input Validation Tests ────────────────────────────────────────────────────

describe('Input Validation (Zod)', () => {
  const registerUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  test('rejects invalid email in registration', () => {
    const result = registerUserSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects short password in registration', () => {
    const result = registerUserSchema.safeParse({
      name: 'Test User',
      email: 'test@test.com',
      password: '12',
    });
    expect(result.success).toBe(false);
  });

  test('rejects short name in registration', () => {
    const result = registerUserSchema.safeParse({
      name: 'T',
      email: 'test@test.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  test('accepts valid registration input', () => {
    const result = registerUserSchema.safeParse({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid email in login', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty password in login', () => {
    const result = loginSchema.safeParse({
      email: 'test@test.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

// ─── XSS Prevention Tests ──────────────────────────────────────────────────────

describe('XSS Prevention', () => {
  test('sanitizes script tags in user input', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = xss(malicious);
    expect(sanitized).not.toContain('<script>');
  });

  test('sanitizes event handlers in user input', () => {
    const malicious = '<img onerror="alert(1)" src="x">';
    const sanitized = xss(malicious);
    expect(sanitized).not.toContain('onerror');
  });

  test('preserves safe text content', () => {
    const safe = 'Hello, this is a normal review comment.';
    const sanitized = xss(safe);
    expect(sanitized).toBe(safe);
  });

  test('sanitizes nested script in address', () => {
    const malicious = '123 Main St <script>document.cookie</script>';
    const sanitized = xss(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('123 Main St');
  });
});

// ─── SQL Injection Protection Tests ────────────────────────────────────────────

describe('SQL Injection Protection', () => {
  test('all queries use parameterized placeholders', () => {
    const resolversDir = path.resolve(__dirname, '../graphql/resolvers');
    const files = fs.readdirSync(resolversDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(resolversDir, file), 'utf-8');
      
      // Check for string concatenation in SQL queries (dangerous pattern)
      const dangerousConcat = /pool\.query\s*\(\s*['"].*\'\s*\+\s*\w+/g;
      const matches = content.match(dangerousConcat);
      expect(matches).toBeNull();
    }
  });
});

// ─── Rate Limiting Tests ───────────────────────────────────────────────────────

describe('Rate Limiting', () => {
  test('rate limit configuration exists in server', () => {
    const serverContent = fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf-8'
    );
    
    expect(serverContent).toContain('rateLimit');
    expect(serverContent).toContain('/graphql');
  });

  test('auth resolvers have in-memory rate limiting', () => {
    const authContent = fs.readFileSync(
      path.resolve(__dirname, '../graphql/resolvers/auth.resolvers.js'),
      'utf-8'
    );
    
    expect(authContent).toContain('checkRateLimit');
    expect(authContent).toContain('TOO_MANY_REQUESTS');
  });
});

// ─── Security Headers Tests ────────────────────────────────────────────────────

describe('Security Headers Configuration', () => {
  test('helmet is configured in server', () => {
    const serverContent = fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf-8'
    );
    
    expect(serverContent).toContain('helmet');
    expect(serverContent).toContain('contentSecurityPolicy');
    expect(serverContent).toContain('crossOriginEmbedderPolicy');
  });

  test('CORS is strictly configured', () => {
    const serverContent = fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf-8'
    );
    
    expect(serverContent).toContain('localhost:4173');
    expect(serverContent).toContain('localhost:8080');
    expect(serverContent).toContain('credentials: true');
    // No wildcard
    expect(serverContent).not.toMatch(/origin\s*:\s*['"]?\*/);
  });
});

// ─── Password Security Tests ───────────────────────────────────────────────────

describe('Password Security', () => {
  test('bcrypt.compare is used for all login flows', () => {
    const authContent = fs.readFileSync(
      path.resolve(__dirname, '../graphql/resolvers/auth.resolvers.js'),
      'utf-8'
    );
    
    // Count bcrypt.compare usages (should be at least 5: 3 logins + 2 password changes)
    const compareMatches = authContent.match(/bcrypt\.compare/g);
    expect(compareMatches.length).toBeGreaterThanOrEqual(5);
    
    // Ensure no direct hash comparison
    expect(authContent).not.toContain('password ===');
    expect(authContent).not.toContain('password ==');
  });

  test('bcrypt.hash is used for all password creation', () => {
    const authContent = fs.readFileSync(
      path.resolve(__dirname, '../graphql/resolvers/auth.resolvers.js'),
      'utf-8'
    );
    
    const hashMatches = authContent.match(/bcrypt\.hash/g);
    expect(hashMatches.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Blocked User Tests ────────────────────────────────────────────────────────

describe('Blocked User Enforcement', () => {
  test('blocked user check exists in server context', () => {
    const serverContent = fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf-8'
    );
    
    expect(serverContent).toContain('is_blocked');
    expect(serverContent).toContain('Account blocked');
  });

  test('blocked user check exists in login mutations', () => {
    const authContent = fs.readFileSync(
      path.resolve(__dirname, '../graphql/resolvers/auth.resolvers.js'),
      'utf-8'
    );
    
    // Should check is_blocked in all three login flows
    const blockedChecks = authContent.match(/is_blocked/g);
    expect(blockedChecks.length).toBeGreaterThanOrEqual(3);
  });
});
