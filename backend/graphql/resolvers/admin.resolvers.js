
import { GraphQLError } from 'graphql';

const adminResolvers = {
  Query: {
    // ─── Dashboard Stats ────────────────────────────────────────────────────
    dashboardStats: async (_, __, { pool }) => {
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const [workers] = await pool.query('SELECT COUNT(*) as count FROM workers');
      const [bookings] = await pool.query('SELECT COUNT(*) as count FROM bookings');
      const [revenue] = await pool.query('SELECT SUM(total_price) as sum FROM bookings WHERE status = "completed"');

      return {
        totalUsers: users[0].count,
        totalWorkers: workers[0].count,
        totalBookings: bookings[0].count,
        totalRevenue: revenue[0].sum || 0,
      };
    },

    // ─── Get All Users ──────────────────────────────────────────────────────
    allUsers: async (_, __, { pool }) => {
      const [rows] = await pool.query(
        'SELECT user_id, name, email, phone, created_at FROM users ORDER BY created_at DESC'
      );
      return rows;
    },

    // ─── Get All Workers ────────────────────────────────────────────────────
    allWorkers: async (_, __, { pool }) => {
      const [rows] = await pool.query(
        'SELECT worker_id, name, email, phone, created_at, avg_rating FROM workers ORDER BY created_at DESC'
      );
      return rows.map(r => ({
        ...r,
        avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : 0,
      }));
    },

    // ─── Get All Bookings ───────────────────────────────────────────────────
    allBookings: async (_, __, { pool }) => {
      const [rows] = await pool.query(`
        SELECT b.booking_id, b.ticket_number, b.status, b.created_at, b.total_price,
               u.name as user_name, w.name as worker_name, s.name as service_name
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN workers w ON b.worker_id = w.worker_id
        JOIN services s ON b.service_id = s.service_id
        ORDER BY b.created_at DESC
      `);
      return rows;
    },

    // ─── Service Analytics ──────────────────────────────────────────────────
    serviceAnalytics: async (_, { serviceId }, { pool }) => {
      let query = `
        SELECT 
          COUNT(b.booking_id) as totalBookings,
          SUM(b.total_price) as totalRevenue,
          AVG(r.rating) as averageRating
        FROM bookings b
        LEFT JOIN reviews r ON b.booking_id = r.booking_id
      `;
      const params = [];
      
      if (serviceId) {
        query += ' WHERE b.service_id = ?';
        params.push(serviceId);
      }
      
      const [rows] = await pool.query(query, params);
      return {
        totalBookings: rows[0].totalBookings || 0,
        totalRevenue: rows[0].totalRevenue || 0,
        averageRating: rows[0].averageRating ? parseFloat(rows[0].averageRating) : 0,
      };
    },

    // ─── Revenue Analytics ──────────────────────────────────────────────────
    revenueAnalytics: async (_, { period }, { pool }) => {
      // period can be 'week', 'month', 'year'. Defaulting to 7 days for simplicity.
      const limit = period === 'month' ? 30 : period === 'year' ? 365 : 7;
      
      const [rows] = await pool.query(`
        SELECT 
          DATE(booking_date) as date,
          SUM(total_price) as revenue,
          COUNT(booking_id) as bookings
        FROM bookings
        WHERE status = 'completed' AND booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(booking_date)
        ORDER BY date ASC
      `, [limit]);
      
      return rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        revenue: r.revenue || 0,
        bookings: r.bookings || 0
      }));
    },
  },

  Mutation: {
    // ─── Verify Worker ──────────────────────────────────────────────────────
    verifyWorker: async (_, { workerId }, { pool }) => {
      const [result] = await pool.query('UPDATE workers SET is_verified = TRUE WHERE worker_id = ?', [workerId]);
      if (result.affectedRows === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }
      
      await pool.query(
        `INSERT INTO notifications (user_id, worker_id, title, message, type)
         VALUES (NULL, ?, 'Account Verified', 'Your worker account has been verified by an admin.', 'system')`,
        [workerId]
      );
      
      return { message: 'Worker verified successfully' };
    },

    // ─── Block User ─────────────────────────────────────────────────────────
    blockUser: async (_, { userId, isBlocked }, { pool }) => {
      const [result] = await pool.query('UPDATE users SET is_blocked = ? WHERE user_id = ?', [isBlocked ? 1 : 0, userId]);
      if (result.affectedRows === 0) {
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully` };
    },

    // ─── Block Worker ───────────────────────────────────────────────────────
    blockWorker: async (_, { workerId, isBlocked }, { pool }) => {
      const [result] = await pool.query('UPDATE workers SET is_blocked = ? WHERE worker_id = ?', [isBlocked ? 1 : 0, workerId]);
      if (result.affectedRows === 0) {
        throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { message: `Worker ${isBlocked ? 'blocked' : 'unblocked'} successfully` };
    },

    // ─── Delete User ────────────────────────────────────────────────────────
    deleteUser: async (_, { userId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        // Delete related records first due to foreign keys
        await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM bookings WHERE user_id = ?', [userId]);

        const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
        }

        await pool.query('COMMIT');
        return { message: 'User deleted successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },

    // ─── Delete Worker ──────────────────────────────────────────────────────
    deleteWorker: async (_, { workerId }, { pool }) => {
      await pool.query('START TRANSACTION');

      try {
        await pool.query('DELETE FROM notifications WHERE worker_id = ?', [workerId]);
        await pool.query('DELETE FROM worker_availability WHERE worker_id = ?', [workerId]);
        await pool.query('DELETE FROM worker_services WHERE worker_id = ?', [workerId]);

        const [result] = await pool.query('DELETE FROM workers WHERE worker_id = ?', [workerId]);

        if (result.affectedRows === 0) {
          await pool.query('ROLLBACK');
          throw new GraphQLError('Worker not found', { extensions: { code: 'NOT_FOUND' } });
        }

        await pool.query('COMMIT');
        return { message: 'Worker deleted successfully' };
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    },
  },
};

export default adminResolvers;
