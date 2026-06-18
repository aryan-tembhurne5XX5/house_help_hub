
import authResolvers from './auth.resolvers.js';
import userResolvers from './user.resolvers.js';
import workerResolvers from './worker.resolvers.js';
import bookingResolvers from './booking.resolvers.js';
import reviewResolvers from './review.resolvers.js';
import notificationResolvers from './notification.resolvers.js';
import adminResolvers from './admin.resolvers.js';
import supportResolvers from './support.resolvers.js';
import { GraphQLScalarType, Kind } from 'graphql';

// Custom JSON scalar for the availability object
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

// Deep merge Query and Mutation resolvers from all modules
const resolvers = {
  JSON: JSONScalar,
  Query: {
    ...userResolvers.Query,
    ...workerResolvers.Query,
    ...bookingResolvers.Query,
    ...notificationResolvers.Query,
    ...adminResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...workerResolvers.Mutation,
    ...bookingResolvers.Mutation,
    ...reviewResolvers.Mutation,
    ...notificationResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...supportResolvers.Mutation,
  },
};

export default resolvers;
