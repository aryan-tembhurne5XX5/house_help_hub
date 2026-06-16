
import request from 'supertest';
import app from '../server.js';
import { pool } from '../db.js';

describe('Authentication API Endpoints', () => {
  
  const testUser = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'password123',
    phone: '1234567890'
  };

  const testWorker = {
    name: 'Test Worker',
    email: `testworker_${Date.now()}@example.com`,
    password: 'password123',
    phone: '0987654321'
  };

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    await pool.query('DELETE FROM workers WHERE email = ?', [testWorker.email]);
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user_id');
      expect(response.body.email).toBe(testUser.email);
    });

    it('should fail if email already exists', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail validation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({ name: 'Incomplete User' }); // Missing email and password

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/users/login', () => {
    it('should login user successfully', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.email).toBe(testUser.email);
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/workers/register', () => {
    it('should register a new worker successfully', async () => {
      const response = await request(app)
        .post('/api/workers/register')
        .send(testWorker);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.email).toBe(testWorker.email);
    });
  });

});
