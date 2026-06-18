
import { GraphQLError } from 'graphql';

const reviewResolvers = {
  Mutation: {
    // ─── Create Review ──────────────────────────────────────────────────────
    createReview: async (_, { bookingId, rating, comment }, { pool }) => {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new GraphQLError('Rating must be between 1 and 5', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await pool.query('START TRANSACTION');

      try {
        // Verify booking exists, is completed, and belongs to a worker
        const [bookingRows] = await pool.query(
          'SELECT user_id, worker_id, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        if (booking.status !== 'completed') {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Can only review completed bookings', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Check if review already exists
        const [existingReview] = await pool.query(
          'SELECT review_id FROM reviews WHERE booking_id = ?',
          [bookingId]
        );

        if (existingReview.length > 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Review already exists for this booking', { extensions: { code: 'BAD_USER_INPUT' } });
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
           VALUES (NULL, ?, 'New Review Received', ?, 'system')`,
          [booking.worker_id, `You received a ${rating}-star review for a completed service.`]
        );

        await pool.query('COMMIT');
        return { message: 'Review submitted successfully', reviewId: result.insertId };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default reviewResolvers;
