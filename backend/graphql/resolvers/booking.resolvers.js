
import { GraphQLError } from 'graphql';
import { differenceInHours } from 'date-fns';
import { z } from 'zod';
import xss from 'xss';
import { requireAuth, requireUser, requireWorker, requireRole } from '../../middleware/permissions.js';

// Helper to generate unique ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TK-${timestamp}-${random}`;
};

// Zod schema for booking creation
const createBookingSchema = z.object({
  userId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().min(1, "Booking time is required"),
  durationHours: z.number().positive("Duration must be positive"),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional().nullable(),
});

const bookingResolvers = {
  Query: {
    // ─── Get Booking Details ────────────────────────────────────────────────
    bookingDetails: async (_, { bookingId }, context) => {
      requireAuth(context);

      const [rows] = await context.pool.query(
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
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = rows[0];

      // Object-level authorization: only booking owner, assigned worker, or admin
      if (context.user.role === 'admin') {
        return booking;
      }
      if (context.user.role === 'user' && booking.user_id === context.user.id) {
        return booking;
      }
      if (context.user.role === 'worker' && booking.worker_id === context.user.id) {
        return booking;
      }

      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    },

    // ─── Booking Timeline ───────────────────────────────────────────────────
    bookingTimeline: async (_, { bookingId }, context) => {
      requireAuth(context);

      const [bookingRows] = await context.pool.query(`
        SELECT b.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
               w.name as worker_name, w.phone as worker_phone, w.profile_pic as worker_profile_pic,
               s.name as service_name
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN workers w ON b.worker_id = w.worker_id
        JOIN services s ON b.service_id = s.service_id
        WHERE b.booking_id = ?
      `, [bookingId]);

      if (bookingRows.length === 0) {
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = bookingRows[0];

      // Object-level authorization: only booking owner, assigned worker, or admin
      const isOwner = context.user.role === 'user' && booking.user_id === context.user.id;
      const isAssignedWorker = context.user.role === 'worker' && booking.worker_id === context.user.id;
      const isAdmin = context.user.role === 'admin';

      if (!isOwner && !isAssignedWorker && !isAdmin) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const events = [];

      events.push({
        id: 'evt_1',
        title: 'Booking Requested',
        description: `Booking #${booking.ticket_number} was requested.`,
        timestamp: booking.created_at,
        status: 'pending'
      });

      if (['confirmed', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_2',
          title: 'Booking Accepted',
          description: `Worker ${booking.worker_name} accepted the request.`,
          timestamp: booking.created_at,
          status: 'confirmed'
        });
      }

      if (booking.status === 'completed') {
        events.push({
          id: 'evt_3',
          title: 'Service Completed',
          description: `The service was completed successfully.`,
          timestamp: new Date().toISOString(),
          status: 'completed'
        });
      }

      if (booking.status === 'canceled') {
        events.push({
          id: 'evt_cancel',
          title: 'Booking Canceled',
          description: `The booking was canceled.`,
          timestamp: new Date().toISOString(),
          status: 'canceled'
        });
      }
      
      if (booking.status === 'rejected') {
        events.push({
          id: 'evt_reject',
          title: 'Booking Rejected',
          description: `The worker declined the booking request.`,
          timestamp: new Date().toISOString(),
          status: 'rejected'
        });
      }

      return {
        booking,
        events
      };
    },
  },

  Mutation: {
    // ─── Create Booking ─────────────────────────────────────────────────────
    createBooking: async (_, { input }, context) => {
      requireUser(context);

      // Validate input with Zod
      const parseResult = createBookingSchema.safeParse(input);
      if (!parseResult.success) {
        throw new GraphQLError(parseResult.error.errors[0].message, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const { userId, serviceId, workerId, bookingDate, bookingTime, durationHours, address, notes } = parseResult.data;

      // Ensure user can only create bookings for themselves
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      // Sanitize user inputs
      const sanitizedAddress = xss(address);
      const sanitizedNotes = notes ? xss(notes) : null;

      await context.pool.query('START TRANSACTION');

      try {
        // Get service price for the specific worker
        const [serviceRows] = await context.pool.query(
          'SELECT price_per_hour FROM worker_services WHERE worker_id = ? AND service_id = ?',
          [workerId, serviceId]
        );

        if (serviceRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Worker does not offer this service', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const pricePerHour = serviceRows[0].price_per_hour;
        const totalPrice = pricePerHour * durationHours;
        const ticketNumber = generateTicketNumber();

        // Check if worker is available and not already booked
        const [existingBookings] = await context.pool.query(
          `SELECT booking_id FROM bookings
           WHERE worker_id = ?
           AND booking_date = ?
           AND booking_time = ?
           AND status IN ('confirmed', 'completed') FOR UPDATE`,
          [workerId, bookingDate, bookingTime]
        );

        if (existingBookings.length > 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Worker is no longer available at this time', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Insert new booking
        const [result] = await context.pool.query(
          `INSERT INTO bookings (user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, total_price, notes, ticket_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, workerId, serviceId, bookingDate, bookingTime, durationHours, sanitizedAddress, totalPrice, sanitizedNotes, ticketNumber]
        );

        // Create notification for worker
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (NULL, ?, 'New Booking Request', ?, 'booking_request')`,
          [workerId, `You have a new booking request for ticket ${ticketNumber}`]
        );

        await context.pool.query('COMMIT');
        return {
          message: 'Booking created successfully',
          bookingId: result.insertId,
          ticketNumber,
        };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Accept Booking ─────────────────────────────────────────────────────
    acceptBooking: async (_, { bookingId }, context) => {
      requireWorker(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT user_id, worker_id, ticket_number, booking_date, booking_time FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or already processed', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        // Ensure only the assigned worker can accept
        if (booking.worker_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        const [result] = await context.pool.query(
          'UPDATE bookings SET status = "confirmed" WHERE booking_id = ? AND status = "pending"',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Failed to accept booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for the user whose booking was accepted
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Booking Confirmed', ?, 'booking_status')`,
          [booking.user_id, `Your booking ${booking.ticket_number} has been confirmed`]
        );

        // Find overlapping pending bookings
        const [overlappingRows] = await context.pool.query(
          'SELECT booking_id, user_id, ticket_number FROM bookings WHERE worker_id = ? AND booking_date = ? AND booking_time = ? AND booking_id != ? AND status = "pending"',
          [booking.worker_id, booking.booking_date, booking.booking_time, bookingId]
        );

        // Auto-reject overlapping bookings and notify users
        if (overlappingRows.length > 0) {
          const overlappingIds = overlappingRows.map(r => r.booking_id);
          await context.pool.query(
            'UPDATE bookings SET status = "rejected" WHERE booking_id IN (?)',
            [overlappingIds]
          );

          for (const overlap of overlappingRows) {
            await context.pool.query(
              `INSERT INTO notifications (user_id, worker_id, title, message, type)
               VALUES (?, NULL, 'Booking Rejected', ?, 'booking_status')`,
              [overlap.user_id, `Your booking request ${overlap.ticket_number} was rejected because the worker accepted another booking for this time slot.`]
            );
          }
        }

        await context.pool.query('COMMIT');
        return { message: 'Booking accepted successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Reject Booking ─────────────────────────────────────────────────────
    rejectBooking: async (_, { bookingId }, context) => {
      requireWorker(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT user_id, worker_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or already processed', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        // Ensure only the assigned worker can reject
        if (booking.worker_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        const [result] = await context.pool.query(
          'UPDATE bookings SET status = "rejected" WHERE booking_id = ? AND status = "pending"',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Failed to reject booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for user
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Booking Rejected', ?, 'booking_status')`,
          [booking.user_id, `Your booking ${booking.ticket_number} was rejected by the worker`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Booking rejected successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Cancel Booking ─────────────────────────────────────────────────────
    cancelBooking: async (_, { bookingId }, context) => {
      requireUser(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT user_id, worker_id, ticket_number, booking_date, booking_time, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        // Ensure only the booking owner can cancel
        if (booking.user_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError(`Cannot cancel a booking that is already ${booking.status}`, { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Cancellation policy: Cannot cancel if within 12 hours of the booking time
        const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = differenceInHours(bookingDateTime, now);

        if (booking.status === 'confirmed' && hoursDifference < 12) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Cannot cancel confirmed bookings within 12 hours of the scheduled time', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const [result] = await context.pool.query(
          'UPDATE bookings SET status = "canceled" WHERE booking_id = ?',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Failed to cancel booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for worker
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (NULL, ?, 'Booking Cancelled', ?, 'booking_status')`,
          [booking.worker_id, `Booking ${booking.ticket_number} has been cancelled by the user`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Booking cancelled successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Complete Booking ───────────────────────────────────────────────────
    completeBooking: async (_, { bookingId }, context) => {
      requireWorker(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT user_id, worker_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "confirmed" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or not in confirmed state', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        // Ensure only the assigned worker can complete
        if (booking.worker_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        const [result] = await context.pool.query(
          'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Failed to complete booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for user
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Service Completed', ?, 'booking_status')`,
          [booking.user_id, `Your service for booking ${booking.ticket_number} has been marked as completed. Please leave a review!`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Booking completed successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default bookingResolvers;
