import { GraphQLError } from 'graphql';

const supportResolvers = {
  Mutation: {
    // ─── Create Support Ticket ──────────────────────────────────────────────
    createSupportTicket: async (_, { subject, message }, { pool, user }) => {
      // Allow unauthenticated users to create tickets as well (or restrict if user is provided)
      let userId = null;
      let workerId = null;

      if (user) {
        if (user.role === 'user') userId = user.id;
        if (user.role === 'worker') workerId = user.id;
      }

      try {
        await pool.query(
          'INSERT INTO support_tickets (user_id, worker_id, subject, message, status) VALUES (?, ?, ?, ?, ?)',
          [userId, workerId, subject, message, 'open']
        );
        return { message: 'Support ticket submitted successfully. Our team will review it shortly.' };
      } catch (error) {
        throw new GraphQLError('Failed to submit support ticket', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },
  },
};

export default supportResolvers;
