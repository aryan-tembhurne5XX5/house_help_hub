
import request from 'supertest';
import app from '../server.js';
import { pool } from '../db.js';

describe('Booking API Endpoints', () => {
  let userId, workerId, serviceId, bookingId;

  const testUser = {
    name: 'Booking User',
    email: `bookuser_${Date.now()}@example.com`,
    password: 'password123'
  };

  const testWorker = {
    name: 'Booking Worker',
    email: `bookworker_${Date.now()}@example.com`,
    password: 'password123',
    phone: '1234567890'
  };

  beforeAll(async () => {
    // 1. Create a user
    const userRes = await request(app).post('/api/users/register').send(testUser);
    userId = userRes.body.user_id;

    // 2. Create a worker
    const workerRes = await request(app).post('/api/workers/register').send(testWorker);
    workerId = workerRes.body.worker_id;

    // 3. Create a service
    const [serviceRes] = await pool.query("INSERT INTO services (name, base_price) VALUES ('Test Booking Service', 30.00)");
    serviceId = serviceRes.insertId;

    // 4. Assign service to worker
    await pool.query("INSERT INTO worker_services (worker_id, service_id, price_per_hour) VALUES (?, ?, 30.00)", [workerId, serviceId]);
  });

  afterAll(async () => {
    // Clean up
    if (bookingId) {
      await pool.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    }
    await pool.query('DELETE FROM worker_services WHERE service_id = ?', [serviceId]);
    await pool.query('DELETE FROM services WHERE service_id = ?', [serviceId]);
    await pool.query('DELETE FROM workers WHERE worker_id = ?', [workerId]);
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking successfully', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .send({
          userId,
          workerId,
          serviceId,
          bookingDate: '2026-12-01',
          bookingTime: '10:00',
          durationHours: 2,
          address: '123 Booking St'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('bookingId');
      expect(response.body).toHaveProperty('ticketNumber');
      
      bookingId = response.body.bookingId;
    });

    it('should fail if worker does not offer the service', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .send({
          userId,
          workerId,
          serviceId: 99999, // Invalid service
          bookingDate: '2026-12-01',
          bookingTime: '10:00',
          durationHours: 2,
          address: '123 Booking St'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Worker does not offer this service');
    });
  });

  describe('PUT /api/bookings/:id/accept', () => {
    it('should allow a worker to accept a booking', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/accept`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Booking accepted successfully');

      // Verify status in DB
      const [rows] = await pool.query('SELECT status FROM bookings WHERE booking_id = ?', [bookingId]);
      expect(rows[0].status).toBe('confirmed');
    });

    it('should fail to accept an already confirmed booking', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/accept`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not found or already processed');
    });
  });

  describe('PUT /api/bookings/:id/cancel', () => {
    it('should fail to cancel a confirmed booking within 12 hours', async () => {
      // Temporarily update booking date to today to test 12-hour rule
      await pool.query("UPDATE bookings SET booking_date = CURRENT_DATE, booking_time = ADDTIME(CURRENT_TIME, '02:00:00') WHERE booking_id = ?", [bookingId]);

      const response = await request(app)
        .put(`/api/bookings/${bookingId}/cancel`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('within 12 hours');
    });
  });

});
