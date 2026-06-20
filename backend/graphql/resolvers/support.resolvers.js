import { GraphQLError } from 'graphql';
import xss from 'xss';
import { requireAuth } from '../../middleware/permissions.js';

const supportResolvers = {
  Mutation: {
    // ─── Create Support Ticket ──────────────────────────────────────────────
    createSupportTicket: async (_, { subject, message }, context) => {
      requireAuth(context);

      let userId = null;
      let workerId = null;

      if (context.user.role === 'user') userId = context.user.id;
      if (context.user.role === 'worker') workerId = context.user.id;

      // Sanitize inputs for XSS
      const sanitizedSubject = xss(subject);
      const sanitizedMessage = xss(message);

      try {
        await context.pool.query(
          'INSERT INTO support_tickets (user_id, worker_id, subject, message, status) VALUES (?, ?, ?, ?, ?)',
          [userId, workerId, sanitizedSubject, sanitizedMessage, 'open']
        );
        return { message: 'Support ticket submitted successfully. Our team will review it shortly.' };
      } catch (error) {
        throw new GraphQLError('Failed to submit support ticket', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },
  },
};

export default supportResolvers;
