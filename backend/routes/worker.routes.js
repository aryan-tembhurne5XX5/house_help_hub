
import express from 'express';
import { pool } from '../db.js';
import { validateProfileUpdate } from '../middleware/validate.js';

const router = express.Router();

// ─── Get Worker Profile ─────────────────────────────────────────────────────

router.get('/workers/:workerId/profile', async (req, res, next) => {
  const { workerId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
      [workerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Get worker's services
    const [services] = await pool.query(
      `SELECT s.service_id, s.name, ws.price_per_hour 
       FROM worker_services ws
       JOIN services s ON ws.service_id = s.service_id
       WHERE ws.worker_id = ?`,
      [workerId]
    );

    // Get worker's availability
    const [availability] = await pool.query(
      'SELECT day_of_week, time_slot, is_available FROM worker_availability WHERE worker_id = ?',
      [workerId]
    );

    // Get worker's reviews
    const [reviews] = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name, u.profile_pic AS reviewer_pic
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.worker_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [workerId]
    );

    const workerProfile = {
      ...rows[0],
      services,
      availability,
      reviews,
    };

    res.json(workerProfile);
  } catch (error) {
    next(error);
  }
});

// ─── Update Worker Profile ──────────────────────────────────────────────────

router.put('/workers/:workerId/profile', validateProfileUpdate, async (req, res, next) => {
  const { workerId } = req.params;
  const { name, phone, address, bio } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE workers SET name = ?, phone = ?, address = ?, bio = ? WHERE worker_id = ?',
      [name, phone, address || null, bio || null, workerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const [updatedWorker] = await pool.query(
      'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
      [workerId]
    );

    res.json(updatedWorker[0]);
  } catch (error) {
    next(error);
  }
});

// ─── Get All Services ───────────────────────────────────────────────────────

router.get('/services', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Get Available Workers ──────────────────────────────────────────────────

router.get('/workers/available', async (req, res, next) => {
  const { serviceId, date, time } = req.query;

  try {
    // Convert day of week from date
    const bookingDate = new Date(date);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][bookingDate.getDay()];

    // Determine time slot based on time
    let timeSlot = 'morning';
    const hourOfDay = parseInt(time.split(':')[0]);
    if (hourOfDay >= 12 && hourOfDay < 17) {
      timeSlot = 'afternoon';
    } else if (hourOfDay >= 17) {
      timeSlot = 'evening';
    }

    // Find available workers who provide this service and are available at the requested time
    const [rows] = await pool.query(
      `SELECT w.worker_id, w.name, w.phone, w.profile_pic, w.avg_rating, ws.price_per_hour 
       FROM workers w
       JOIN worker_services ws ON w.worker_id = ws.worker_id
       JOIN worker_availability wa ON w.worker_id = wa.worker_id
       WHERE ws.service_id = ?
       AND wa.day_of_week = ?
       AND wa.time_slot = ?
       AND wa.is_available = 1
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.worker_id = w.worker_id
         AND b.booking_date = ?
         AND b.booking_time = ?
         AND b.status IN ('confirmed', 'pending')
       )`,
      [serviceId, dayOfWeek, timeSlot, date, time]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Register Worker Services ───────────────────────────────────────────────

router.post('/workers/:workerId/services', async (req, res, next) => {
  const { workerId } = req.params;
  const { services } = req.body;

  try {
    await pool.query('START TRANSACTION');

    // Delete existing worker services
    await pool.query('DELETE FROM worker_services WHERE worker_id = ?', [workerId]);

    // Insert new worker services
    const selectedServices = services.filter(service => service.selected);

    if (selectedServices.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'At least one service must be selected' });
    }

    for (const service of selectedServices) {
      await pool.query(
        'INSERT INTO worker_services (worker_id, service_id, price_per_hour) VALUES (?, ?, ?)',
        [workerId, service.id, service.rate]
      );
    }

    await pool.query('COMMIT');
    res.json({ message: 'Worker services updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// ─── Update Worker Availability ─────────────────────────────────────────────

router.post('/workers/:workerId/availability', async (req, res, next) => {
  const { workerId } = req.params;
  const { availability } = req.body;

  try {
    await pool.query('START TRANSACTION');

    // Delete existing worker availability
    await pool.query('DELETE FROM worker_availability WHERE worker_id = ?', [workerId]);

    // Insert new worker availability
    for (const [day, slots] of Object.entries(availability)) {
      for (const [timeSlot, isAvailable] of Object.entries(slots)) {
        await pool.query(
          'INSERT INTO worker_availability (worker_id, day_of_week, time_slot, is_available) VALUES (?, ?, ?, ?)',
          [workerId, day, timeSlot, isAvailable ? 1 : 0]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ message: 'Worker availability updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// ─── Get Worker's Service Requests ──────────────────────────────────────────

router.get('/workers/:workerId/requests', async (req, res, next) => {
  const { workerId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT b.*, u.name AS user_name, u.profile_pic AS user_profile_pic, u.phone AS user_phone,
              s.name AS service_name, b.ticket_number
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       WHERE b.worker_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
       ORDER BY b.created_at DESC`,
      [workerId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
