
import { GraphQLError } from 'graphql';
import { requireWorker, requireAuth } from '../../middleware/permissions.js';

const workerResolvers = {
  Query: {
    // ─── Get Worker Profile ─────────────────────────────────────────────────
    workerProfile: async (_, { workerId }, context) => {
      // "workerProfile, workerRequests: Worker only. Must also verify ownership."
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
        [workerId]
      );

      if (rows.length === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Get worker's services
      const [services] = await context.pool.query(
        `SELECT s.service_id, s.name, ws.price_per_hour 
         FROM worker_services ws
         JOIN services s ON ws.service_id = s.service_id
         WHERE ws.worker_id = ?`,
        [workerId]
      );

      // Get worker's availability
      const [availability] = await context.pool.query(
        'SELECT day_of_week, time_slot, is_available FROM worker_availability WHERE worker_id = ?',
        [workerId]
      );

      // Get worker's reviews
      const [reviews] = await context.pool.query(
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

      return {
        ...rows[0],
        avg_rating: rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0,
        services,
        availability: availability.map(a => ({ ...a, is_available: !!a.is_available })),
        reviews,
      };
    },

    // ─── Get Worker's Service Requests ──────────────────────────────────────
    workerRequests: async (_, { workerId }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        `SELECT b.*, u.name AS user_name, u.profile_pic AS user_profile_pic, u.phone AS user_phone,
                s.name AS service_name, b.ticket_number
         FROM bookings b
         JOIN users u ON b.user_id = u.user_id
         JOIN services s ON b.service_id = s.service_id
         WHERE b.worker_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
         ORDER BY b.created_at DESC`,
        [workerId]
      );
      return rows;
    },

    // ─── Get All Services ───────────────────────────────────────────────────
    services: async (_, __, { pool }) => {
      const [rows] = await pool.query('SELECT * FROM services ORDER BY name ASC');
      return rows;
    },

    // ─── Get Available Workers ──────────────────────────────────────────────
    availableWorkers: async (_, { serviceId, date, time }, context) => {
      requireAuth(context);

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
      const [rows] = await context.pool.query(
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
           AND b.status IN ('confirmed', 'completed')
         )`,
        [serviceId, dayOfWeek, timeSlot, date, time]
      );

      return rows.map(r => ({
        ...r,
        avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : 0,
      }));
    },

    // ─── Search Workers ─────────────────────────────────────────────────────
    searchWorkers: async (_, { query }, context) => {
      requireAuth(context);

      const searchTerm = `%${query}%`;
      const [rows] = await context.pool.query(
        `SELECT worker_id, name, email, phone, bio, profile_pic, avg_rating 
         FROM workers 
         WHERE name LIKE ? OR bio LIKE ? 
         ORDER BY avg_rating DESC`,
        [searchTerm, searchTerm]
      );
      return rows.map(r => ({
        ...r,
        avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : 0,
      }));
    },

    // ─── Worker Reviews ─────────────────────────────────────────────────────
    workerReviews: async (_, { workerId }, context) => {
      requireAuth(context);

      const [rows] = await context.pool.query(
        `SELECT r.review_id, r.rating, r.comment, r.created_at,
                u.name AS reviewer_name, u.profile_pic AS reviewer_pic
         FROM reviews r
         JOIN bookings b ON r.booking_id = b.booking_id
         JOIN users u ON b.user_id = u.user_id
         WHERE b.worker_id = ?
         ORDER BY r.created_at DESC`,
        [workerId]
      );
      return rows;
    },
  },

  Mutation: {
    // ─── Update Worker Profile ──────────────────────────────────────────────
    updateWorkerProfile: async (_, { workerId, input }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const { name, phone, address, bio } = input;

      const [result] = await context.pool.query(
        'UPDATE workers SET name = ?, phone = ?, address = ?, bio = ? WHERE worker_id = ?',
        [name, phone, address || null, bio || null, workerId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const [updatedWorker] = await context.pool.query(
        'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
        [workerId]
      );

      return {
        ...updatedWorker[0],
        avg_rating: updatedWorker[0].avg_rating ? parseFloat(updatedWorker[0].avg_rating) : 0,
      };
    },

    // ─── Register Worker Services ───────────────────────────────────────────
    registerWorkerServices: async (_, { workerId, services }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      await context.pool.query('START TRANSACTION');

      try {
        // Delete existing worker services
        await context.pool.query('DELETE FROM worker_services WHERE worker_id = ?', [workerId]);

        // Insert new worker services
        const selectedServices = services.filter(service => service.selected);

        if (selectedServices.length === 0) {
          await context.pool.query('ROLLBACK');
          throw new GraphQLError('At least one service must be selected', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        for (const service of selectedServices) {
          await context.pool.query(
            'INSERT INTO worker_services (worker_id, service_id, price_per_hour) VALUES (?, ?, ?)',
            [workerId, service.id, service.rate]
          );
        }

        await context.pool.query('COMMIT');
        return { message: 'Worker services updated successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Update Worker Availability ─────────────────────────────────────────
    updateWorkerAvailability: async (_, { workerId, availability }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      await context.pool.query('START TRANSACTION');

      try {
        // Delete existing worker availability
        await context.pool.query('DELETE FROM worker_availability WHERE worker_id = ?', [workerId]);

        // Insert new worker availability
        for (const [day, slots] of Object.entries(availability)) {
          for (const [timeSlot, isAvailable] of Object.entries(slots)) {
            await context.pool.query(
              'INSERT INTO worker_availability (worker_id, day_of_week, time_slot, is_available) VALUES (?, ?, ?, ?)',
              [workerId, day, timeSlot, isAvailable ? 1 : 0]
            );
          }
        }

        await context.pool.query('COMMIT');
        return { message: 'Worker availability updated successfully' };
      } catch (error) {
        await context.pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default workerResolvers;
