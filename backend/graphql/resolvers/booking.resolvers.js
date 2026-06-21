
import { GraphQLError } from 'graphql';
import { differenceInHours } from 'date-fns';
import { z } from 'zod';
import xss from 'xss';
import axios from 'axios';
import { requireAuth, requireUser, requireWorker, requireRole } from '../../middleware/permissions.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TK-${timestamp}-${random}`;
};

/**
 * Haversine distance between two lat/lng points, in kilometers.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Max arrival distance in km (100 meters)
const MAX_ARRIVAL_DISTANCE_KM = 0.1;

// Max booking window in days
const MAX_BOOKING_DAYS_AHEAD = 7;

// ─── Zod Schema ─────────────────────────────────────────────────────────────

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

// ─── Resolvers ──────────────────────────────────────────────────────────────

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
            distanceKm = summary.distance / 1000;
            durationMin = summary.duration / 60;
            
            const coords = response.data.features[0].geometry.coordinates;
            if (coords && Array.isArray(coords)) {
              routeCoordinates = coords.map(coord => [coord[1], coord[0]]);
            }
          }
        } catch (error) {
          console.error("OpenRouteService API error:", error.message);
        }
      }

      // Fallback: Calculate Haversine distance
      if (distanceKm === 0) {
        distanceKm = haversineDistance(wLoc.latitude, wLoc.longitude, bLoc.latitude, bLoc.longitude);
        distanceKm = distanceKm * 1.2; // 20% overhead for road routing
        durationMin = distanceKm * 2; // ~30 km/h average city speed
        
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

      // Object-level authorization
      const isOwner = context.user.role === 'user' && booking.user_id === context.user.id;
      const isAssignedWorker = context.user.role === 'worker' && booking.worker_id === context.user.id;
      const isAdmin = context.user.role === 'admin';

      if (!isOwner && !isAssignedWorker && !isAdmin) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const events = [];
      const ACTIVE_STATUSES = ['accepted', 'travelling', 'arrived', 'service_started', 'completion_requested', 'completed'];

      // 1. Booking Requested (always shown)
      events.push({
        id: 'evt_1',
        title: 'Booking Requested',
        description: `Booking #${booking.ticket_number} was requested.`,
        timestamp: booking.created_at,
        status: 'pending'
      });

      // 2. Booking Accepted
      if (ACTIVE_STATUSES.includes(booking.status)) {
        events.push({
          id: 'evt_2',
          title: 'Booking Accepted',
          description: `Worker ${booking.worker_name} accepted the booking.`,
          timestamp: booking.created_at, // TODO: store accepted_at separately
          status: 'accepted'
        });
      }

      // Helper to format delay
      const formatDelay = (minutes) => {
        if (minutes === null || minutes === undefined) return null;
        if (minutes > 0) return `+${minutes} min late`;
        if (minutes < 0) return `${Math.abs(minutes)} min early`;
        return `On time`;
      };

      // 3. Worker Travelling (use real timestamp)
      if (['travelling', 'arrived', 'waiting_for_schedule', 'service_started', 'completion_requested', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_travel',
          title: 'Worker Travelling',
          description: `Worker ${booking.worker_name} has started travelling to your location.`,
          timestamp: booking.travel_started_at || booking.created_at,
          status: 'travelling',
          notes: booking.travel_duration_minutes ? `Travel took ${booking.travel_duration_minutes} minutes.` : null
        });
      }

      // 4. Worker Arrived (use real timestamp)
      if (['arrived', 'waiting_for_schedule', 'service_started', 'completion_requested', 'completed'].includes(booking.status)) {
        let delayStr = null;
        let notesStr = null;
        if (booking.arrival_delay_minutes !== null) {
           delayStr = formatDelay(booking.arrival_delay_minutes);
        } else if (booking.early_arrival_minutes !== null) {
           delayStr = formatDelay(-booking.early_arrival_minutes);
           notesStr = `Worker arrived ${booking.early_arrival_minutes} minutes early.`;
        }

        events.push({
          id: 'evt_arrive',
          title: 'Worker Arrived',
          description: `Worker ${booking.worker_name} has arrived at your location.`,
          timestamp: booking.arrived_at || booking.created_at,
          status: 'arrived',
          delay: delayStr,
          notes: notesStr
        });
      }

      // 5. Service Started (use real timestamp)
      if (['service_started', 'completion_requested', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_start',
          title: 'Service Started',
          description: `The service has officially started.`,
          timestamp: booking.service_started_at || booking.created_at,
          status: 'service_started',
          delay: booking.service_start_delay_minutes !== null ? formatDelay(booking.service_start_delay_minutes) : null
        });
      }

      // 6. Completion Requested
      if (['completion_requested', 'completed'].includes(booking.status)) {
        events.push({
          id: 'evt_completion_req',
          title: 'Completion Requested',
          description: `Worker ${booking.worker_name} has requested service completion.`,
          timestamp: booking.completion_requested_at || booking.created_at,
          status: 'completion_requested',
          notes: booking.service_duration_minutes ? `Service duration: ${Math.floor(booking.service_duration_minutes / 60)}h ${booking.service_duration_minutes % 60}m` : null
        });
      }

      // 7. Completed
      if (booking.status === 'completed') {
        events.push({
          id: 'evt_3',
          title: 'Service Completed',
          description: `The service was completed and confirmed by the customer.`,
          timestamp: booking.completion_requested_at || booking.created_at,
          status: 'completed'
        });
      }

      // Canceled
      if (booking.status === 'canceled') {
        events.push({
          id: 'evt_cancel',
          title: 'Booking Canceled',
          description: `The booking was canceled.`,
          timestamp: new Date().toISOString(),
          status: 'canceled'
        });
      }
      
      // Rejected
      if (booking.status === 'rejected') {
        events.push({
          id: 'evt_reject',
          title: 'Booking Rejected',
          description: `The worker declined the booking request.`,
          timestamp: new Date().toISOString(),
          status: 'rejected'
        });
      }

      // Under Review
      if (booking.status === 'under_review') {
        events.push({
          id: 'evt_review',
          title: 'Under Review',
          description: `The booking is under admin review due to a reported issue.`,
          timestamp: new Date().toISOString(),
          status: 'under_review'
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

      // ─── DATE VALIDATION: Max 7 days ahead, no past dates ─────────────
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const bookingDateObj = new Date(bookingDate + 'T00:00:00');
      const todayObj = new Date(todayStr + 'T00:00:00');

      if (isNaN(bookingDateObj.getTime())) {
        throw new GraphQLError('Invalid booking date', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      if (bookingDateObj < todayObj) {
        throw new GraphQLError('Cannot book in the past', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const maxDate = new Date(todayObj);
      maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);

      if (bookingDateObj > maxDate) {
        throw new GraphQLError(`Booking date cannot be more than ${MAX_BOOKING_DAYS_AHEAD} days in the future`, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // ─── TIME VALIDATION: Valid hour slots only ───────────────────────
      const validTimes = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
                          '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
      if (!validTimes.includes(bookingTime)) {
        throw new GraphQLError('Invalid booking time slot', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // If booking is today, ensure the time hasn't already passed
      if (bookingDate === todayStr) {
        const [hours] = bookingTime.split(':').map(Number);
        if (hours <= now.getHours()) {
          throw new GraphQLError('Cannot book a time slot that has already passed today', { extensions: { code: 'BAD_USER_INPUT' } });
        }
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
           AND status IN ('confirmed', 'completed', 'accepted', 'travelling', 'arrived', 'waiting_for_schedule', 'service_started', 'completion_requested') FOR UPDATE`,
          [workerId, bookingDate, bookingTime]
        );

        if (existingBookings.length > 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Worker is no longer available at this time', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Insert new booking
        const [result] = await context.pool.query(
          `INSERT INTO bookings (user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, booking_latitude, booking_longitude, booking_location_text, total_price, notes, ticket_number, scheduled_start_datetime, scheduled_end_datetime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TIMESTAMP(?, ?), DATE_ADD(TIMESTAMP(?, ?), INTERVAL ? HOUR))`,
          [userId, workerId, serviceId, bookingDate, bookingTime, durationHours, sanitizedAddress, latitude, longitude, sanitizedLocationText, totalPrice, sanitizedNotes, ticketNumber, bookingDate, bookingTime, bookingDate, bookingTime, durationHours]
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
    // Status: accepted → travelling
    startTravel: async (_, { bookingId }, context) => {
      requireWorker(context);

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = "travelling", travel_started_at = NOW() WHERE booking_id = ? AND worker_id = ? AND status IN ("accepted", "confirmed")',
        [bookingId, context.user.id]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Cannot start travel. Booking must be in accepted state.', { extensions: { code: 'BAD_USER_INPUT' } });
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
    // Status: travelling → arrived
    // REQUIRES: distance <= 100m from booking location
    markArrived: async (_, { bookingId, latitude, longitude }, context) => {
      requireWorker(context);

      // Get booking with location
      const [bookingRows] = await context.pool.query(
        'SELECT booking_id, worker_id, user_id, ticket_number, booking_latitude, booking_longitude, status, scheduled_start_datetime, travel_started_at FROM bookings WHERE booking_id = ? AND worker_id = ?',
        [bookingId, context.user.id]
      );

      if (bookingRows.length === 0) {
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = bookingRows[0];

      if (booking.status !== 'travelling') {
        throw new GraphQLError('Cannot mark arrived. Worker must be travelling first.', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // ─── LOCATION VALIDATION ──────────────────────────────────────────
      if (booking.booking_latitude && booking.booking_longitude) {
        const distance = haversineDistance(latitude, longitude, booking.booking_latitude, booking.booking_longitude);
        
        if (distance > MAX_ARRIVAL_DISTANCE_KM) {
          throw new GraphQLError(
            `You are ${(distance * 1000).toFixed(0)}m away from the customer. You must be within ${MAX_ARRIVAL_DISTANCE_KM * 1000}m to mark as arrived.`,
            { extensions: { code: 'BAD_USER_INPUT', distanceMeters: Math.round(distance * 1000) } }
          );
        }
      }

      // Calculate travel_duration_minutes
      let travelDurationMinutes = null;
      if (booking.travel_started_at) {
         travelDurationMinutes = Math.floor((new Date() - new Date(booking.travel_started_at)) / 60000);
      }

      let newStatus = 'arrived';
      let arrivalDelayMinutes = null;
      let earlyArrivalMinutes = null;

      if (booking.scheduled_start_datetime) {
        const scheduledTime = new Date(booking.scheduled_start_datetime);
        const now = new Date();
        const diffMinutes = Math.floor((now - scheduledTime) / 60000);
        
        if (diffMinutes < 0) {
           newStatus = 'waiting_for_schedule';
           earlyArrivalMinutes = Math.abs(diffMinutes);
        } else {
           arrivalDelayMinutes = diffMinutes;
        }
      }

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = ?, arrived_at = NOW(), travel_duration_minutes = ?, arrival_delay_minutes = ?, early_arrival_minutes = ? WHERE booking_id = ? AND status = "travelling"',
        [newStatus, travelDurationMinutes, arrivalDelayMinutes, earlyArrivalMinutes, bookingId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to mark arrived', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Notify User
      await context.pool.query(
        `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Worker Arrived', ?, 'booking_status')`,
        [booking.user_id, `Your worker has arrived for booking ${booking.ticket_number}. Please confirm their arrival.`]
      );

      return { message: 'Marked as arrived successfully' };
    },

    // ─── Confirm Arrival (User) ─────────────────────────────────────────────
    // User confirms the worker has physically arrived
    confirmArrival: async (_, { bookingId }, context) => {
      requireUser(context);

      const [bookingRows] = await context.pool.query(
        'SELECT booking_id, user_id, worker_id, ticket_number, status FROM bookings WHERE booking_id = ?',
        [bookingId]
      );

      if (bookingRows.length === 0) {
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = bookingRows[0];

      if (booking.user_id !== context.user.id) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      if (booking.status !== 'arrived' && booking.status !== 'waiting_for_schedule') {
        throw new GraphQLError('Cannot confirm arrival. Worker must be in arrived or waiting for schedule status.', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const [result] = await context.pool.query(
        'UPDATE bookings SET user_confirmed_arrival = TRUE WHERE booking_id = ?',
        [bookingId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to confirm arrival', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Notify worker
      await context.pool.query(
        `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (NULL, ?, 'Arrival Confirmed', ?, 'booking_status')`,
        [booking.worker_id, `Customer confirmed your arrival for booking ${booking.ticket_number}. You can now start the service.`]
      );

      return { message: 'Arrival confirmed successfully' };
    },

    // ─── Start Service (Worker) ─────────────────────────────────────────────
    // Status: arrived → service_started
    // REQUIRES: user_confirmed_arrival = TRUE
    startService: async (_, { bookingId }, context) => {
      requireWorker(context);

      const [bookingRows] = await context.pool.query(
        'SELECT booking_id, worker_id, user_id, ticket_number, status, user_confirmed_arrival, scheduled_start_datetime, arrived_at FROM bookings WHERE booking_id = ? AND worker_id = ?',
        [bookingId, context.user.id]
      );

      if (bookingRows.length === 0) {
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = bookingRows[0];

      if (!['arrived', 'waiting_for_schedule'].includes(booking.status)) {
        throw new GraphQLError('Cannot start service. Booking must be in arrived or waiting_for_schedule status.', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // ─── SCHEDULE VALIDATION ───
      let serviceStartDelayMinutes = null;
      if (booking.scheduled_start_datetime) {
         const scheduledTime = new Date(booking.scheduled_start_datetime);
         const now = new Date();
         if (now < scheduledTime) {
            throw new GraphQLError('Cannot start service before the scheduled time.', { extensions: { code: 'BAD_USER_INPUT' } });
         }
         serviceStartDelayMinutes = Math.floor((now - scheduledTime) / 60000);
      }

      // ─── CONFIRMATION VALIDATION ───
      if (!booking.user_confirmed_arrival) {
        if (booking.arrived_at) {
           const arrivedTime = new Date(booking.arrived_at);
           const now = new Date();
           if ((now - arrivedTime) / 60000 < 10) {
              throw new GraphQLError('Cannot start service. Customer must confirm your arrival first (or wait 10 minutes auto-confirm).', { extensions: { code: 'BAD_USER_INPUT' } });
           }
        } else {
           throw new GraphQLError('Cannot start service. Customer must confirm your arrival first.', { extensions: { code: 'BAD_USER_INPUT' } });
        }
      }

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = "service_started", service_started_at = NOW(), service_start_delay_minutes = ? WHERE booking_id = ? AND status IN ("arrived", "waiting_for_schedule")',
        [serviceStartDelayMinutes, bookingId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to start service', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Notify user
      await context.pool.query(
        `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Service Started', ?, 'booking_status')`,
        [booking.user_id, `The service for booking ${booking.ticket_number} has started.`]
      );

      return { message: 'Service started successfully' };
    },

    // ─── Request Completion (Worker) ────────────────────────────────────────
    // Status: service_started → completion_requested
    // REQUIRES: elapsed time >= booked duration
    requestCompletion: async (_, { bookingId }, context) => {
      requireWorker(context);

      const [bookingRows] = await context.pool.query(
        'SELECT booking_id, worker_id, user_id, ticket_number, status, service_started_at, duration_hours FROM bookings WHERE booking_id = ? AND worker_id = ?',
        [bookingId, context.user.id]
      );

      if (bookingRows.length === 0) {
        throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const booking = bookingRows[0];

      if (booking.status !== 'service_started') {
        throw new GraphQLError('Cannot request completion. Service must be started first.', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // ─── MINIMUM DURATION VALIDATION ──────────────────────────────────
      if (booking.service_started_at) {
        const startTime = new Date(booking.service_started_at);
        const now = new Date();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        const requiredMinutes = booking.duration_hours * 60;

        if (elapsedMinutes < requiredMinutes) {
          const remainingMinutes = Math.ceil(requiredMinutes - elapsedMinutes);
          throw new GraphQLError(
            `Cannot request completion yet. ${remainingMinutes} minutes remaining of the ${booking.duration_hours}-hour booking.`,
            { extensions: { code: 'BAD_USER_INPUT', remainingMinutes, elapsedMinutes: Math.floor(elapsedMinutes), requiredMinutes } }
          );
        }
      }

      // ─── UPDATE & RECORD DURATION ──────────────────────────────────────
      let serviceDurationMinutes = null;
      if (booking.service_started_at) {
         serviceDurationMinutes = Math.floor((new Date() - new Date(booking.service_started_at)) / 60000);
      }

      const [result] = await context.pool.query(
        'UPDATE bookings SET status = "completion_requested", completion_requested_at = NOW(), service_duration_minutes = ? WHERE booking_id = ? AND status = "service_started"',
        [serviceDurationMinutes, bookingId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Failed to request completion', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Notify user
      await context.pool.query(
        `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Service Completion Requested', ?, 'booking_status')`,
        [booking.user_id, `Worker has marked the service for booking ${booking.ticket_number} as finished. Please confirm completion.`]
      );

      return { message: 'Completion requested. Waiting for customer confirmation.' };
    },

    // ─── Confirm Completion (User) ──────────────────────────────────────────
    // Status: completion_requested → completed
    confirmCompletion: async (_, { bookingId }, context) => {
      requireUser(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT booking_id, user_id, worker_id, ticket_number, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        if (booking.user_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        if (booking.status !== 'completion_requested') {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Cannot confirm completion. Worker must request completion first.', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const [result] = await context.pool.query(
          'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
          [bookingId]
        );

        if (result.affectedRows === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Failed to complete booking', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        // Notify worker
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (NULL, ?, 'Service Completed', ?, 'booking_status')`,
          [booking.worker_id, `Customer confirmed completion for booking ${booking.ticket_number}. Great job!`]
        );

        // Notify user about review
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (?, NULL, 'Leave a Review', ?, 'booking_status')`,
          [booking.user_id, `Your service for booking ${booking.ticket_number} is complete! Please leave a review.`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Booking completed successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Report Issue (User) ────────────────────────────────────────────────
    // Status: completion_requested → under_review
    reportIssue: async (_, { bookingId, reason }, context) => {
      requireUser(context);

      await context.pool.query('START TRANSACTION');

      try {
        const [bookingRows] = await context.pool.query(
          'SELECT booking_id, user_id, worker_id, ticket_number, status FROM bookings WHERE booking_id = ? FOR UPDATE',
          [bookingId]
        );

        if (bookingRows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const booking = bookingRows[0];

        if (booking.user_id !== context.user.id) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        if (booking.status !== 'completion_requested') {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('Can only report issues when completion has been requested.', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Update booking status
        await context.pool.query(
          'UPDATE bookings SET status = "under_review" WHERE booking_id = ?',
          [bookingId]
        );

        // Create support ticket
        const sanitizedReason = xss(reason);
        await context.pool.query(
          `INSERT INTO support_tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'open')`,
          [booking.user_id, `Issue with booking ${booking.ticket_number}`, sanitizedReason]
        );

        // Notify worker
        await context.pool.query(
          `INSERT INTO notifications (user_id, worker_id, title, message, type) VALUES (NULL, ?, 'Issue Reported', ?, 'booking_status')`,
          [booking.worker_id, `Customer reported an issue with booking ${booking.ticket_number}. An admin will review.`]
        );

        await context.pool.query('COMMIT');
        return { message: 'Issue reported. An admin will review your case.' };
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

        // Can cancel: pending, accepted, travelling (with penalty)
        const cancellableStatuses = ['pending', 'confirmed', 'accepted', 'travelling'];
        if (!cancellableStatuses.includes(booking.status)) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError(`Cannot cancel a booking that is already ${booking.status}`, { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Cancellation policy: Cannot cancel confirmed/accepted within 12 hours of booking time
        if (['confirmed', 'accepted', 'travelling'].includes(booking.status)) {
          const bookingDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
          const now = new Date();
          const hoursDifference = differenceInHours(bookingDateTime, now);

          if (hoursDifference < 12) {
            await context.pool.query('ROLLBACK');
            throw new GraphQLError('Cannot cancel bookings within 12 hours of the scheduled time', { extensions: { code: 'BAD_USER_INPUT' } });
          }
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
  },
};

export default bookingResolvers;
