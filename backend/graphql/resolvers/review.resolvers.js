
import { GraphQLError } from 'graphql';
import { z } from 'zod';
import xss from 'xss';
import { requireAuth, requireUser } from '../../middleware/permissions.js';

// Zod schema for review
const createReviewSchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().optional().nullable(),
});

const reviewResolvers = {
  Mutation: {
    // ─── Create Review ──────────────────────────────────────────────────────
    createReview: async (_, args, context) => {
      requireUser(context);

      // Validate input with Zod
      const parseResult = createReviewSchema.safeParse(args);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const { bookingId, rating, comment } = parseResult.data;

      // Sanitize comment for XSS
      const sanitizedComment = comment ? xss(comment) : null;

      await context.pool.query('START TRANSACTION');

      try {
        // Verify booking exists, is completed, and belongs to a worker
        const [bookingRows] = await context.pool.query(
          'SELECT user_id, worker_id, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        // Ensure review is created by the booking owner
        if (booking.user_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        if (booking.status !== 'completed') {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Can only review completed bookings', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Check if review already exists
        const [existingReview] = await context.pool.query(
          'SELECT review_id FROM reviews WHERE booking_id = ?',
          [bookingId]
        );

        if (existingReview.length > 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Review already exists for this booking', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Insert review
        const [result] = await context.pool.query(
          'INSERT INTO reviews (booking_id, rating, comment) VALUES (?, ?, ?)',
          [bookingId, rating, sanitizedComment]
        );

        // Update worker's average rating
        const [avgResult] = await context.pool.query(
          `SELECT AVG(rating) as avg_rating FROM reviews r
           JOIN bookings b ON r.booking_id = b.booking_id
           WHERE b.worker_id = ?`,
          [booking.worker_id]
        );

        const newAvgRating = avgResult[0].avg_rating ? parseFloat(avgResult[0].avg_rating).toFixed(1) : rating;

        await context.pool.query(
          'UPDATE workers SET avg_rating = ? WHERE worker_id = ?',
          [newAvgRating, booking.worker_id]
        );

        // Notify worker
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (NULL, ?, 'New Review Received', ?, 'system')`,
          [booking.worker_id, `You received a ${rating}-star review for a completed service.`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Review submitted successfully', reviewId: result.insertId };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default reviewResolvers;
