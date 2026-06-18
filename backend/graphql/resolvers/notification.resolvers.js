
import { GraphQLError } from 'graphql';

const notificationResolvers = {
  Query: {
    // ─── Get User Notifications ─────────────────────────────────────────────
    userNotifications: async (_, { userId }, { pool }) => {
      const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      return rows.map(r => ({ ...r, is_read: !!r.is_read }));
    },

    // ─── Get Worker Notifications ───────────────────────────────────────────
    workerNotifications: async (_, { workerId }, { pool }) => {
      const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE worker_id = ? ORDER BY created_at DESC LIMIT 50',
        [workerId]
      );
      return rows.map(r => ({ ...r, is_read: !!r.is_read }));
    },
  },

  Mutation: {
    // ─── Mark Notification as Read ──────────────────────────────────────────
    markNotificationRead: async (_, { notificationId }, { pool }) => {
      const [result] = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
        [notificationId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Notification not found', { extensions: { code: 'NOT_FOUND' } });
      }

      return { message: 'Notification marked as read' };
    },

    // ─── Mark All User Notifications as Read ────────────────────────────────
    markAllUserNotificationsRead: async (_, { userId }, { pool }) => {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
      return { message: 'All notifications marked as read' };
    },

    // ─── Mark All Worker Notifications as Read ──────────────────────────────
    markAllWorkerNotificationsRead: async (_, { workerId }, { pool }) => {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE worker_id = ?',
        [workerId]
      );
      return { message: 'All notifications marked as read' };
    },
  },
};

export default notificationResolvers;
