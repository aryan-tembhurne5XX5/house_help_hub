
import { GraphQLError } from 'graphql';
import { requireWorker, requireAuth } from '../../middleware/permissions.js';
import { calculateDistance, calculateRecommendationScore } from '../../utils/location.js';

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
        'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, latitude, longitude, location_text, service_radius_km, created_at FROM workers WHERE worker_id = ?',
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
         WHERE b.worker_id = ? AND b.status IN ('pending', 'confirmed', 'accepted', 'travelling', 'arrived', 'waiting_for_schedule', 'in_progress', 'completed')
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
    availableWorkers: async (_, { serviceId, date, time, latitude, longitude, radiusKm }, context) => {
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
        `SELECT w.worker_id, w.name, w.phone, w.profile_pic, w.avg_rating, w.latitude, w.longitude, w.location_text, w.service_radius_km, ws.price_per_hour,
                (SELECT COUNT(*) FROM bookings b2 WHERE b2.worker_id = w.worker_id AND b2.status = 'completed') as completed_jobs
         FROM workers w
         JOIN worker_services ws ON w.worker_id = ws.worker_id
         JOIN worker_availability wa ON w.worker_id = wa.worker_id
         WHERE ws.service_id = ?
         AND wa.day_of_week = ?
         AND wa.time_slot = ?
         AND wa.is_available = 1
         AND w.is_blocked = 0
         AND NOT EXISTS (
           SELECT 1 FROM bookings b
           WHERE b.worker_id = w.worker_id
           AND b.booking_date = ?
           AND b.booking_time = ?
           AND b.status IN ('confirmed', 'completed')
         )`,
        [serviceId, dayOfWeek, timeSlot, date, time]
      );

      let workers = rows.map(r => {
        const avg_rating = r.avg_rating ? parseFloat(r.avg_rating) : 0;
        let distanceKm = null;
        let recommendationScore = null;

        if (latitude !== undefined && longitude !== undefined && r.latitude && r.longitude) {
          distanceKm = calculateDistance(latitude, longitude, r.latitude, r.longitude);
        }

        recommendationScore = calculateRecommendationScore(distanceKm, avg_rating, r.completed_jobs, true);

        return {
          ...r,
          avg_rating,
          distanceKm,
          recommendationScore
        };
      });

      // Filter by radius if provided and user passed coordinates
      if (latitude !== undefined && longitude !== undefined) {
        workers = workers.filter(w => {
          // Compare distance against the stricter of: user's requested radius OR worker's service radius
          const effectiveRadius = Math.min(radiusKm || 1000, w.service_radius_km || 1000);
          return w.distanceKm !== null && w.distanceKm <= effectiveRadius;
        });
      }

      // Sort by recommendation score
      workers.sort((a, b) => b.recommendationScore - a.recommendationScore);

      return workers;
    },

    // ─── Nearby Workers ───────────────────────────────────────────────────────
    nearbyWorkers: async (_, { latitude, longitude, radiusKm, serviceId }, context) => {
      requireAuth(context);

      let query = `
        SELECT w.worker_id, w.name, w.phone, w.profile_pic, w.avg_rating, w.latitude, w.longitude, w.location_text, w.service_radius_km,
               (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.worker_id AND b.status = 'completed') as completed_jobs,
               (SELECT MIN(price_per_hour) FROM worker_services ws WHERE ws.worker_id = w.worker_id) as price_per_hour
        FROM workers w
        WHERE w.is_blocked = 0 AND w.latitude IS NOT NULL AND w.longitude IS NOT NULL
      `;
      let params = [];

      if (serviceId) {
        query = `
          SELECT w.worker_id, w.name, w.phone, w.profile_pic, w.avg_rating, w.latitude, w.longitude, w.location_text, w.service_radius_km, ws.price_per_hour,
                 (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.worker_id AND b.status = 'completed') as completed_jobs
          FROM workers w
          JOIN worker_services ws ON w.worker_id = ws.worker_id
          WHERE w.is_blocked = 0 AND w.latitude IS NOT NULL AND w.longitude IS NOT NULL
          AND ws.service_id = ?
        `;
        params.push(serviceId);
      }

      const [rows] = await context.pool.query(query, params);

      let workers = rows.map(r => {
        const avg_rating = r.avg_rating ? parseFloat(r.avg_rating) : 0;
        const distanceKm = calculateDistance(latitude, longitude, r.latitude, r.longitude);
        const recommendationScore = calculateRecommendationScore(distanceKm, avg_rating, r.completed_jobs, true);

        return {
          ...r,
          avg_rating,
          distanceKm,
          recommendationScore
        };
      });

      // Filter by radius
      workers = workers.filter(w => {
        const effectiveRadius = Math.min(radiusKm || 1000, w.service_radius_km || 1000);
        return w.distanceKm <= effectiveRadius;
      });

      // Sort by distance natively, then recommendation score could be used
      workers.sort((a, b) => b.recommendationScore - a.recommendationScore);

      return workers;
    },

    // ─── Worker Location ──────────────────────────────────────────────────────
    workerLocation: async (_, { workerId }, context) => {
      requireAuth(context);

      if (context.user.role === 'user') {
        const [activeBookings] = await context.pool.query(
          `SELECT booking_id FROM bookings 
           WHERE user_id = ? AND worker_id = ? AND status IN ('accepted', 'confirmed', 'travelling', 'arrived', 'waiting_for_schedule', 'in_progress')`,
          [context.user.id, workerId]
        );
        if (activeBookings.length === 0) {
          throw new GraphQLError('Forbidden: You can only track workers for active bookings', { extensions: { code: 'FORBIDDEN' } });
        }
      } else if (context.user.role === 'worker' && context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        'SELECT * FROM worker_locations WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 1',
        [workerId]
      );
      
      if (rows.length > 0) {
        return rows[0];
      }

      // Fallback to worker base profile location
      const [workerRows] = await context.pool.query(
        'SELECT latitude, longitude, updated_at FROM workers WHERE worker_id = ?',
        [workerId]
      );

      return workerRows[0] || null;
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

    // ─── Worker Coverage ────────────────────────────────────────────────────
    workerCoverage: async (_, { workerId }, context) => {
      requireAuth(context);

      const [rows] = await context.pool.query(
        'SELECT service_radius_km FROM workers WHERE worker_id = ?',
        [workerId]
      );

      if (rows.length === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Mock covered areas since we don't have a real GIS boundary database
      return {
        worker_id: workerId,
        radiusKm: rows[0].service_radius_km || 10,
        coveredAreas: ['Local District', 'Neighboring Zone']
      };
    },
  },

  Mutation: {
    // ─── Update Worker Profile ──────────────────────────────────────────────
    updateWorkerProfile: async (_, { workerId, input }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const { name, phone, address, bio, latitude, longitude, location_text, service_radius_km } = input;

      const [result] = await context.pool.query(
        'UPDATE workers SET name = ?, phone = ?, address = ?, bio = ?, latitude = ?, longitude = ?, location_text = ?, service_radius_km = ? WHERE worker_id = ?',
        [name, phone, address || null, bio || null, latitude || null, longitude || null, location_text || null, service_radius_km || 10, workerId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const [updatedWorker] = await context.pool.query(
        'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, latitude, longitude, location_text, service_radius_km, created_at FROM workers WHERE worker_id = ?',
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
    // ─── Update Worker Radius ───────────────────────────────────────────────
    updateWorkerRadius: async (_, { radiusKm }, context) => {
      requireWorker(context);
      
      await context.pool.query(
        'UPDATE workers SET service_radius_km = ? WHERE worker_id = ?',
        [radiusKm, context.user.id]
      );
      
      return { message: 'Service radius updated successfully' };
    },

    // ─── Update Location (Live tracking or general update) ──────────────────
    updateLocation: async (_, { latitude, longitude, locationText }, context) => {
      requireAuth(context);
      const { id, role } = context.user;

      if (role === 'worker') {
        // Update base location
        await context.pool.query(
          'UPDATE workers SET latitude = ?, longitude = ?, location_text = COALESCE(?, location_text) WHERE worker_id = ?',
          [latitude, longitude, locationText || null, id]
        );
        
        // Log live location
        await context.pool.query(
          'INSERT INTO worker_locations (worker_id, latitude, longitude) VALUES (?, ?, ?)',
          [id, latitude, longitude]
        );

        // Phase 13: Location-Based Notifications
        const [activeBookings] = await context.pool.query(
          `SELECT b.booking_id, b.user_id, u.latitude AS user_lat, u.longitude AS user_lng
           FROM bookings b
           JOIN users u ON b.user_id = u.user_id
           WHERE b.worker_id = ? AND b.status IN ('accepted', 'confirmed')`,
          [id]
        );

        for (const booking of activeBookings) {
          if (booking.user_lat && booking.user_lng) {
            const distance = calculateDistance(latitude, longitude, booking.user_lat, booking.user_lng);
            if (distance <= 1.0) { // within 1 km
              const [recentNotifs] = await context.pool.query(
                `SELECT notification_id FROM notifications 
                 WHERE user_id = ? AND type = 'worker_arriving' AND created_at > NOW() - INTERVAL 1 HOUR`,
                [booking.user_id]
              );

              if (recentNotifs.length === 0) {
                await context.pool.query(
                  `INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, 'Worker Arriving Soon', 'Your worker is less than 1km away!', 'worker_arriving')`,
                  [booking.user_id]
                );
              }
            }
          }
        }
      } else if (role === 'user') {
        await context.pool.query(
          'UPDATE users SET latitude = ?, longitude = ?, location_text = COALESCE(?, location_text) WHERE user_id = ?',
          [latitude, longitude, locationText || null, id]
        );
      }

      return { message: 'Location updated successfully' };
    },

    // ─── Update Worker Radius ───────────────────────────────────────────────
    updateWorkerRadius: async (_, { radiusKm }, context) => {
      requireWorker(context);
      
      if (radiusKm <= 0 || radiusKm > 100) {
        throw new GraphQLError('Invalid radius. Must be between 1 and 100 km', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await context.pool.query(
        'UPDATE workers SET service_radius_km = ? WHERE worker_id = ?',
        [radiusKm, context.user.id]
      );

      return { message: 'Service radius updated successfully' };
    },
  },
};

export default workerResolvers;
