
import { GraphQLError } from 'graphql';
import { requireUser, requireWorker, requireAuth } from '../../middleware/permissions.js';

const notificationResolvers = {
  Query: {
    // ─── Get User Notifications ─────────────────────────────────────────────
    userNotifications: async (_, { userId }, context) => {
      requireUser(context);
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      return rows.map(r => ({ ...r, is_read: !!r.is_read }));
    },

    // ─── Get Worker Notifications ───────────────────────────────────────────
    workerNotifications: async (_, { workerId }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [rows] = await context.pool.query(
        'SELECT * FROM notifications WHERE worker_id = ? ORDER BY created_at DESC LIMIT 50',
        [workerId]
      );
      return rows.map(r => ({ ...r, is_read: !!r.is_read }));
    },
  },

  Mutation: {
    // ─── Mark Notification as Read ──────────────────────────────────────────
    markNotificationRead: async (_, { notificationId }, context) => {
      requireAuth(context);

      // Verify ownership of the notification
      const [notifRows] = await context.pool.query(
        'SELECT user_id, worker_id FROM notifications WHERE notification_id = ?',
        [notificationId]
      );

      if (notifRows.length === 0) {
        throw new GraphQLError('Notification not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const notif = notifRows[0];
      const isOwner =
        (context.user.role === 'user' && notif.user_id === context.user.id) ||
        (context.user.role === 'worker' && notif.worker_id === context.user.id) ||
        context.user.role === 'admin';

      if (!isOwner) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      const [result] = await context.pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
        [notificationId]
      );

      if (result.affectedRows === 0) {
        throw new GraphQLError('Notification not found', { extensions: { code: 'NOT_FOUND' } });
      }

      return { message: 'Notification marked as read' };
    },

    // ─── Mark All User Notifications as Read ────────────────────────────────
    markAllUserNotificationsRead: async (_, { userId }, context) => {
      requireUser(context);
      if (context.user.id !== userId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      await context.pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
      return { message: 'All notifications marked as read' };
    },

    // ─── Mark All Worker Notifications as Read ──────────────────────────────
    markAllWorkerNotificationsRead: async (_, { workerId }, context) => {
      requireWorker(context);
      if (context.user.id !== workerId) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }

      await context.pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE worker_id = ?',
        [workerId]
      );
      return { message: 'All notifications marked as read' };
    },
  },
};

export default notificationResolvers;
