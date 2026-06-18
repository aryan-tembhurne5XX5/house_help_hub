
import { GraphQLError } from 'graphql';
import { differenceInHours } from 'date-fns';

// Helper to generate unique ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TK-${timestamp}-${random}`;
};

const bookingResolvers = {
  Query: {
    // ─── Get Booking Details ────────────────────────────────────────────────
    bookingDetails: async (_, { bookingId }, { pool }) => {
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
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      return rows[0];
    },
    // ─── Booking Timeline ───────────────────────────────────────────────────
    bookingTimeline: async (_, { bookingId }, { pool }) => {
      const [bookingRows] = await pool.query(`
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
    createBooking: async (_, { input }, { pool }) => {
      const { userId, serviceId, workerId, bookingDate, bookingTime, durationHours, address, notes } = input;

      // Validate required fields
      if (!userId || !serviceId || !workerId || !bookingDate || !bookingTime || !durationHours || !address) {
        throw new GraphQLError('All required fields must be provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await pool.query('START TRANSACTION');

      try {
        // Get service price for the specific worker
        const [serviceRows] = await pool.query(
          'SELECT price_per_hour FROM worker_services WHERE worker_id = ? AND service_id = ?',
          [workerId, serviceId]
        );

        if (serviceRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Worker does not offer this service', { extensions: { code: 'BAD_USER_INPUT' } });
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
           AND status IN ('confirmed', 'pending') FOR UPDATE`,
          [workerId, bookingDate, bookingTime]
        );

        if (existingBookings.length > 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Worker is no longer available at this time', { extensions: { code: 'BAD_USER_INPUT' } });
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
           VALUES (NULL, ?, 'New Booking Request', ?, 'booking_request')`,
          [workerId, `You have a new booking request for ticket ${ticketNumber}`]
        );

        await pool.query('COMMIT');
        return {
          message: 'Booking created successfully',
          bookingId: result.insertId,
          ticketNumber,
        };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Accept Booking ─────────────────────────────────────────────────────
    acceptBooking: async (_, { bookingId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await pool.query(
          'SELECT user_id, worker_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or already processed', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        const [result] = await pool.query(
          'UPDATE bookings SET status = "confirmed" WHERE booking_id = ? AND status = "pending"',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Failed to accept booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for user
        await pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Booking Confirmed', ?, 'booking_status')`,
          [booking.user_id, `Your booking ${booking.ticket_number} has been confirmed`]
        );

        await pool.query('COMMIT');
        return { message: 'Booking accepted successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Reject Booking ─────────────────────────────────────────────────────
    rejectBooking: async (_, { bookingId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await pool.query(
          'SELECT user_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "pending" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or already processed', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        const [result] = await pool.query(
          'UPDATE bookings SET status = "rejected" WHERE booking_id = ? AND status = "pending"',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Failed to reject booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for user
        await pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Booking Rejected', ?, 'booking_status')`,
          [booking.user_id, `Your booking ${booking.ticket_number} was rejected by the worker`]
        );

        await pool.query('COMMIT');
        return { message: 'Booking rejected successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Cancel Booking ─────────────────────────────────────────────────────
    cancelBooking: async (_, { bookingId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await pool.query(
          'SELECT worker_id, ticket_number, booking_date, booking_time, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
          await pool.query('ROLLBACK');
          throw new GraphQLError(`Cannot cancel a booking that is already ${booking.status}`, { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Cancellation policy: Cannot cancel if within 12 hours of the booking time
        const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = differenceInHours(bookingDateTime, now);

        if (booking.status === 'confirmed' && hoursDifference < 12) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Cannot cancel confirmed bookings within 12 hours of the scheduled time', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const [result] = await pool.query(
          'UPDATE bookings SET status = "canceled" WHERE booking_id = ?',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Failed to cancel booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for worker
        await pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (NULL, ?, 'Booking Cancelled', ?, 'booking_status')`,
          [booking.worker_id, `Booking ${booking.ticket_number} has been cancelled by the user`]
        );

        await pool.query('COMMIT');
        return { message: 'Booking cancelled successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Complete Booking ───────────────────────────────────────────────────
    completeBooking: async (_, { bookingId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await pool.query(
          'SELECT user_id, ticket_number FROM bookings WHERE booking_id = ? AND status = "confirmed" FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or not in confirmed state', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const booking = bookingRows[0];

        const [result] = await pool.query(
          'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Failed to complete booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Create notification for user
        await pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type)
           VALUES (?, NULL, 'Service Completed', ?, 'booking_status')`,
          [booking.user_id, `Your service for booking ${booking.ticket_number} has been marked as completed. Please leave a review!`]
        );

        await pool.query('COMMIT');
        return { message: 'Booking completed successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default bookingResolvers;
