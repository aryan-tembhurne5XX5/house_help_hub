
import request from 'supertest';
import app from '../server.js';
import { pool } from '../db.js';

describe('Review API Endpoints', () => {
  let userId, workerId, serviceId, bookingId, token;

  const testUser = {
    name: 'Reviewer',
    email: `reviewer_${Date.now()}@example.com`,
    password: 'password123'
  };

  const testWorker = {
    name: 'Reviewed Worker',
    email: `reviewed_${Date.now()}@example.com`,
    password: 'password123',
    phone: '1234567890'
  };

  beforeAll(async () => {
    // 1. Create a user
    const userRes = await request(app).post('/api/users/register').send(testUser);
    userId = userRes.body.user_id;
    token = userRes.body.token;

    // 2. Create a worker
    const workerRes = await request(app).post('/api/workers/register').send(testWorker);
    workerId = workerRes.body.worker_id;

    // 3. Create a service directly in DB (simpler for test setup)
    const [serviceRes] = await pool.query("INSERT INTO services (name, base_price) VALUES ('Test Service', 20.00)");
    serviceId = serviceRes.insertId;

    // 4. Assign service to worker
    await pool.query("INSERT INTO worker_services (worker_id, service_id, price_per_hour) VALUES (?, ?, 20.00)", [workerId, serviceId]);

    // 5. Create a COMPLETED booking
    const [bookingRes] = await pool.query(
      "INSERT INTO bookings (user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, total_price, status, ticket_number) VALUES (?, ?, ?, '2026-01-01', '10:00:00', 2, '123 Test St', 40.00, 'completed', ?)",
      [userId, workerId, serviceId, `TEST-TK-${Date.now()}`]
    );
    bookingId = bookingRes.insertId;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM reviews WHERE booking_id = ?', [bookingId]);
    await pool.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    await pool.query('DELETE FROM worker_services WHERE service_id = ?', [serviceId]);
    await pool.query('DELETE FROM services WHERE service_id = ?', [serviceId]);
    await pool.query('DELETE FROM workers WHERE worker_id = ?', [workerId]);
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
  });

  describe('POST /api/reviews', () => {
    it('should create a review for a completed booking', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: bookingId,
          rating: 5,
          comment: 'Excellent service!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reviewId');

      // Verify worker's average rating was updated
      const [workerRows] = await pool.query('SELECT avg_rating FROM workers WHERE worker_id = ?', [workerId]);
      expect(parseFloat(workerRows[0].avg_rating)).toBe(5.00);
    });

    it('should fail if review already exists for booking', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: bookingId,
          rating: 4,
          comment: 'Another review'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });
  });
});
