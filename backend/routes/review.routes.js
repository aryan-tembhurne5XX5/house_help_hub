
import express from 'express';
import { pool } from '../db.js';
import { validateReview } from '../middleware/validate.js';

const router = express.Router();

// ─── Create a review ────────────────────────────────────────────────────────

router.post('/reviews', validateReview, async (req, res, next) => {
  const { bookingId, rating, comment } = req.body;

  try {
    await pool.query('START TRANSACTION');

    // Verify booking exists, is completed, and belongs to a worker
    const [bookingRows] = await pool.query(
      'SELECT user_id, worker_id, status FROM bookings WHERE booking_id = ? FOR UPDATE',
      [bookingId]
    );

    if (bookingRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRows[0];

    if (booking.status !== 'completed') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Check if review already exists
    const [existingReview] = await pool.query(
      'SELECT review_id FROM reviews WHERE booking_id = ?',
      [bookingId]
    );

    if (existingReview.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Review already exists for this booking' });
    }

    // Insert review
    const [result] = await pool.query(
      'INSERT INTO reviews (booking_id, rating, comment) VALUES (?, ?, ?)',
      [bookingId, rating, comment || null]
    );

    // Update worker's average rating
    const [avgResult] = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       WHERE b.worker_id = ?`,
      [booking.worker_id]
    );

    const newAvgRating = avgResult[0].avg_rating ? parseFloat(avgResult[0].avg_rating).toFixed(1) : rating;

    await pool.query(
      'UPDATE workers SET avg_rating = ? WHERE worker_id = ?',
      [newAvgRating, booking.worker_id]
    );

    // Notify worker
    await pool.query(
      `INSERT INTO notifications (user_id, worker_id, title, message, type)
       VALUES (NULL, ?, 'New Review Received', 'You received a ${rating}-star review for a completed service.', 'system')`,
      [booking.worker_id]
    );

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Review submitted successfully', reviewId: result.insertId });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

export default router;
