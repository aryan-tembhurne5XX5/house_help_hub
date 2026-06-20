import { GraphQLError } from 'graphql';

/**
 * Ensures a user is authenticated.
 * @param {object} context GraphQL context
 */
export const requireAuth = (context) => {
  if (!context.user) {
    throw new GraphQLError('Unauthorized', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

/**
 * Ensures a user has a specific role.
 * @param {object} context GraphQL context
 * @param {string|string[]} roles Allowed role(s)
 */
export const requireRole = (context, roles) => {
  requireAuth(context);
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (!allowedRoles.includes(context.user.role)) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
};

/**
 * Helper to ensure user is an Admin.
 */
export const requireAdmin = (context) => requireRole(context, 'admin');

/**
 * Helper to ensure user is a Worker.
 */
export const requireWorker = (context) => requireRole(context, 'worker');

/**
 * Helper to ensure user is a User (customer).
 */
export const requireUser = (context) => requireRole(context, 'user');
