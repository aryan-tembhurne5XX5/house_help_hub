
import express from 'express';
import { pool } from '../db.js';
import { validateBooking } from '../middleware/validate.js';
import { differenceInHours } from 'date-fns';

const router = express.Router();

// Helper to generate unique ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TK-${timestamp}-${random}`;
};

// ─── Get booking details ────────────────────────────────────────────────────

router.get('/bookings/:bookingId', async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT b.*, u.name AS user_name, u.phone AS user_phone, u.email AS user_email,
              w.name AS worker_name, w.phone AS worker_phone, w.profile_pic AS worker_profile_pic,
              s.name AS service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       JOIN services s ON b.service_id = s.service_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// ─── Create a new booking (for users) ───────────────────────────────────────

router.post('/bookings', validateBooking, async (req, res, next) => {
  const { userId, serviceId, workerId, bookingDate, bookingTime, durationHours, address, notes } = req.body;

  try {
    // Get service price for the specific worker
    const [serviceRows] = await pool.query(
      'SELECT price_per_hour FROM worker_services WHERE worker_id = ? AND service_id = ?',
      [workerId, serviceId]
    );

    if (serviceRows.length === 0) {
      return res.status(400).json({ message: 'Worker does not offer this service' });
    }

    const pricePerHour = serviceRows[0].price_per_hour;
    const totalPrice = pricePerHour * durationHours;
    const ticketNumber = generateTicketNumber();

    // Check if worker is available and not already booked
    const [existingBookings] = await pool.query(
      `SELECT booking_id FROM bookings
       WHERE worker_id = ?
       AND booking_date = ?
       AND booking_time = ?
       AND status IN ('confirmed', 'pending')`,
      [workerId, bookingDate, bookingTime]
    );

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Worker is no longer available at this time' });
    }

    // Insert new booking
    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, total_price, notes, ticket_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, workerId, serviceId, bookingDate, bookingTime, durationHours, address, totalPrice, notes, ticketNumber]
    );

    // Create notification for worker
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (NULL, ?, 'New Booking Request', 'You have a new booking request for ticket ${ticketNumber}', 'booking_request')`,
      [workerId]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertId,
      ticketNumber
    });
  } catch (error) {
    next(error);
  }
});

// ─── Accept a booking request (for workers) ─────────────────────────────────

router.put('/bookings/:bookingId/accept', async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    await pool.query('START TRANSACTION');

    const [bookingRows] = await pool.query('SELECT user_id, worker_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE', [bookingId]);
    if (bookingRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }

    const booking = bookingRows[0];

    const [result] = await pool.query(
      'UPDATE bookings SET status = "confirmed" WHERE booking_id = ? AND status = "pending"',
      [bookingId]
    );

    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Failed to accept booking' });
    }

    // Create notification for user
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (?, NULL, 'Booking Confirmed', 'Your booking ${booking.ticket_number} has been confirmed', 'booking_status')`,
      [booking.user_id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Booking accepted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// ─── Reject a booking request (for workers) ─────────────────────────────────

router.put('/bookings/:bookingId/reject', async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    await pool.query('START TRANSACTION');

    const [bookingRows] = await pool.query('SELECT user_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE', [bookingId]);
    if (bookingRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }

    const booking = bookingRows[0];

    const [result] = await pool.query(
      'UPDATE bookings SET status = "cancelled" WHERE booking_id = ? AND status = "pending"',
      [bookingId]
    );

    if (result.affectedRows === 0) {
       await pool.query('ROLLBACK');
       return res.status(400).json({ message: 'Failed to reject booking' });
    }

    // Create notification for user
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (?, NULL, 'Booking Rejected', 'Your booking ${booking.ticket_number} was rejected by the worker', 'booking_status')`,
      [booking.user_id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Booking rejected successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// ─── Cancel a booking (for users) ───────────────────────────────────────────

router.put('/bookings/:bookingId/cancel', async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    await pool.query('START TRANSACTION');

    const [bookingRows] = await pool.query(
      'SELECT worker_id, ticket_number, booking_date, booking_time, status FROM bookings WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );

    if (bookingRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRows[0];

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot cancel a booking that is already ${booking.status}` });
    }

    // Cancellation policy: Cannot cancel if within 12 hours of the booking time
    const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
    const now = new Date();
    const hoursDifference = differenceInHours(bookingDateTime, now);

    if (booking.status === 'confirmed' && hoursDifference < 12) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot cancel confirmed bookings within 12 hours of the scheduled time' });
    }

    const [result] = await pool.query(
      'UPDATE bookings SET status = "cancelled" WHERE booking_id = ?',
      [bookingId]
    );

    if (result.affectedRows === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ message: 'Failed to cancel booking' });
    }

    // Create notification for worker
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (NULL, ?, 'Booking Cancelled', 'Booking ${booking.ticket_number} has been cancelled by the user', 'booking_status')`,
      [booking.worker_id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// ─── Complete a booking (for workers) ───────────────────────────────────────

router.put('/bookings/:bookingId/complete', async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    await pool.query('START TRANSACTION');

    const [bookingRows] = await pool.query('SELECT user_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "confirmed" FOR UPDATE', [bookingId]);
    
    if (bookingRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or not in confirmed state' });
    }

    const booking = bookingRows[0];

    const [result] = await pool.query(
      'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
      [bookingId]
    );

    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Failed to complete booking' });
    }

    // Create notification for user
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (?, NULL, 'Service Completed', 'Your service for booking ${booking.ticket_number} has been marked as completed. Please leave a review!', 'booking_status')`,
      [booking.user_id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Booking completed successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

export default router;
