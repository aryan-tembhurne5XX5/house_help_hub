
import { GraphQLError } from 'graphql';
import { differenceInHours } from 'date-fns';
import { z } from 'zod';
import xss from 'xss';
import axios from 'axios';
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
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationText: z.string().optional().nullable(),
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

    // ─── Travel Estimate ────────────────────────────────────────────────────
    travelEstimate: async (_, { workerId, bookingId }, context) => {
      requireAuth(context);
      
      const [workerLocationRows] = await context.pool.query(
        'SELECT latitude, longitude FROM worker_locations WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 1',
        [workerId]
      );
      
      let wLoc = workerLocationRows.length > 0 ? workerLocationRows[0] : null;

      // Fallback to worker's base profile location if no live tracking data exists
      if (!wLoc || !wLoc.latitude) {
        const [workerProfileRows] = await context.pool.query(
          'SELECT latitude, longitude FROM workers WHERE worker_id = ?',
          [workerId]
        );
        if (workerProfileRows.length > 0 && workerProfileRows[0].latitude) {
          wLoc = workerProfileRows[0];
        }
      }
      
      const [bookingRows] = await context.pool.query(
        'SELECT booking_latitude as latitude, booking_longitude as longitude FROM bookings WHERE booking_id = ?',
        [bookingId]
      );
      
      if (!wLoc || bookingRows.length === 0 || !wLoc.latitude || !bookingRows[0].latitude) {
        return null;
      }
      
      const bLoc = bookingRows[0];
      
      let distanceKm = 0;
      let durationMin = 0;
      let routeCoordinates = null;

      const apiKey = process.env.OPENROUTESERVICE_API_KEY;

      if (apiKey) {
        try {
          const response = await axios.get('https://api.openrouteservice.org/v2/directions/driving-car', {
            params: {
              api_key: apiKey,
              start: `${wLoc.longitude},${wLoc.latitude}`,
              end: `${bLoc.longitude},${bLoc.latitude}`
            }
          });

          if (response.data && response.data.features && response.data.features.length > 0) {
            const summary = response.data.features[0].properties.summary;
            distanceKm = summary.distance / 1000; // distance is in meters
            durationMin = summary.duration / 60; // duration is in seconds
            
            // OpenRouteService returns geometry as [longitude, latitude]
            // We need to flip it to [latitude, longitude] for react-leaflet Polyline
            const coords = response.data.features[0].geometry.coordinates;
            if (coords && Array.isArray(coords)) {
              routeCoordinates = coords.map(coord => [coord[1], coord[0]]);
            }
          }
        } catch (error) {
          console.error("OpenRouteService API error:", error.message);
          // Fall back to Haversine if API fails
        }
      }

      // Fallback: Calculate Haversine distance
      if (distanceKm === 0) {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(bLoc.latitude - wLoc.latitude);
        const dLon = toRad(bLoc.longitude - wLoc.longitude);
        const lat1 = toRad(wLoc.latitude);
        const lat2 = toRad(bLoc.latitude);

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = R * c;
        
        // Add 20% to account for road routing overhead compared to straight line
        distanceKm = distanceKm * 1.2;
        
        // Mock OpenRouteService duration: Assuming average city speed of 30 km/h = 2 min/km
        durationMin = distanceKm * 2;
        
        // Fallback straight line route
        routeCoordinates = [
          [wLoc.latitude, wLoc.longitude],
          [bLoc.latitude, bLoc.longitude]
        ];
      }
      
      const etaTimestamp = new Date(Date.now() + durationMin * 60000).toISOString();
      
      return {
        distanceKm,
        durationMin,
        etaTimestamp,
        routeCoordinates
      };
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

      if (['confirmed', 'accepted', 'travelling', 'arrived', 'in_progress', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_2',
          title: 'Booking Accepted',
          description: `Worker ${booking.worker_name} accepted the booking.`,
          timestamp: booking.created_at, // Ideally we'd have status timestamps, but using created_at for mock
          status: 'accepted'
        });
      }

      if (['travelling', 'arrived', 'in_progress', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_travel',
          title: 'Worker is Travelling',
          description: `Worker ${booking.worker_name} has started travelling to your location.`,
          timestamp: booking.created_at,
          status: 'travelling'
        });
      }

      if (['arrived', 'in_progress', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_arrive',
          title: 'Worker Arrived',
          description: `Worker ${booking.worker_name} has arrived at your location.`,
          timestamp: booking.created_at,
          status: 'arrived'
        });
      }

      if (['in_progress', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_start',
          title: 'Service Started',
          description: `The service has officially started.`,
          timestamp: booking.created_at,
          status: 'in_progress'
        });
      }

      if (booking.status === 'completed') {
        events.push({
          id: 'evt_3',
          title: 'Service Completed',
          description: `The service was completed successfully.`,
          timestamp: booking.created_at,
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

      const { userId, serviceId, workerId, bookingDate, bookingTime, durationHours, address, latitude, longitude, locationText, notes } = parseResult.data;

      // Ensure user can only create bookings for themselves
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      // Sanitize user inputs
      const sanitizedAddress = xss(address);
      const sanitizedNotes = notes ? xss(notes) : null;
      const sanitizedLocationText = locationText ? xss(locationText) : null;

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
           AND status IN ('confirmed', 'completed', 'accepted') FOR UPDATE`,
          [workerId, bookingDate, bookingTime]
        );

        if (existingBookings.length > 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Worker is no longer available at this time', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Insert new booking
        const [result] = await context.pool.query(
          `INSERT INTO bookings (user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, booking_latitude, booking_longitude, booking_location_text, total_price, notes, ticket_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, workerId, serviceId, bookingDate, bookingTime, durationHours, sanitizedAddress, latitude, longitude, sanitizedLocationText, totalPrice, sanitizedNotes, ticketNumber]
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
          'UPDATE bookings SET status = "accepted" WHERE booking_id = ? AND status = "pending"',
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

    // ─── Start Travel ────────────────────────────────────────────────────────
    startTravel: async (_, { bookingId }, context) => {
      requireWorker(context);

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = "travelling" WHERE booking_id = ? AND worker_id = ? AND status IN ("accepted", "confirmed")',
        [bookingId, context.user.id]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to start travel', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Notify User
      const [bookingRows] = await context.pool.query('SELECT user_id, ticket_number FROM bookings WHERE booking_id = ?', [bookingId]);
      if (bookingRows.length > 0) {
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Worker on the way', ?, 'booking_status')`,
          [bookingRows[0].user_id, `Your worker has started travelling for booking ${bookingRows[0].ticket_number}`]
        );
      }

      return { message: 'Travel started successfully' };
    },

    // ─── Mark Arrived ────────────────────────────────────────────────────────
    markArrived: async (_, { bookingId }, context) => {
      requireWorker(context);

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = "arrived" WHERE booking_id = ? AND worker_id = ? AND status = "travelling"',
        [bookingId, context.user.id]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to mark arrived', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Notify User
      const [bookingRows] = await context.pool.query('SELECT user_id, ticket_number FROM bookings WHERE booking_id = ?', [bookingId]);
      if (bookingRows.length > 0) {
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Worker Arrived', ?, 'booking_status')`,
          [bookingRows[0].user_id, `Your worker has arrived for booking ${bookingRows[0].ticket_number}`]
        );
      }

      return { message: 'Marked as arrived successfully' };
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

        if (booking.status !== 'pending' && booking.status !== 'confirmed' && booking.status !== 'accepted') {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError(`Cannot cancel a booking that is already ${booking.status}`, { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Cancellation policy: Cannot cancel if within 12 hours of the booking time
        const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = differenceInHours(bookingDateTime, now);

        if (['confirmed', 'accepted'].includes(booking.status) && hoursDifference < 12) {
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
          'SELECT user_id, worker_id, ticket_number FROM bookings WHERE booking_id = ? AND status IN ("accepted", "confirmed", "arrived", "in_progress") FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found or not in a completable state', { extensions: { code: 'BAD_USER_INPUT' } });
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
