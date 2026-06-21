
import { GraphQLError } from 'graphql';
import { requireUser } from '../../middleware/permissions.js';

const userResolvers = {
  Query: {
    // ─── Get User Profile ───────────────────────────────────────────────────
    userProfile: async (_, { userId }, context) => {
      requireUser(context);
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        'SELECT user_id, name, email, phone, address, profile_pic, latitude, longitude, location_text, created_at FROM users WHERE user_id = ?',
        [userId]
      );

      if (rows.length === 0) {
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      }

      return rows[0];
    },

    // ─── Get User's Bookings ────────────────────────────────────────────────
    userBookings: async (_, { userId }, context) => {
      requireUser(context);
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        `SELECT b.*, s.name AS service_name, w.name AS worker_name, 
                w.phone AS worker_phone, w.profile_pic AS worker_profile_pic
         FROM bookings b
         JOIN services s ON b.service_id = s.service_id
         LEFT JOIN workers w ON b.worker_id = w.worker_id
         WHERE b.user_id = ?
         ORDER BY b.booking_date DESC, b.booking_time DESC`,
        [userId]
      );
      return rows;
    },
  },

  Mutation: {
    // ─── Update User Profile ────────────────────────────────────────────────
    updateUserProfile: async (_, { userId, input }, context) => {
      requireUser(context);
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const { name, phone, address, latitude, longitude, location_text } = input;

      const [result] = await context.pool.query(
        'UPDATE users SET name = ?, phone = ?, address = ?, latitude = ?, longitude = ?, location_text = ? WHERE user_id = ?',
        [name, phone || null, address || null, latitude || null, longitude || null, location_text || null, userId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const [updatedUser] = await context.pool.query(
        'SELECT user_id, name, email, phone, address, profile_pic, latitude, longitude, location_text, created_at FROM users WHERE user_id = ?',
        [userId]
      );

      return updatedUser[0];
    },
  },
};

export default userResolvers;
