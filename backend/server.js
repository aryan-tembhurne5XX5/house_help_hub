
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';

import { connectDB, pool } from './db.js';
import { verifyToken } from './middleware/auth.js';

// Import GraphQL schema and resolvers
import typeDefs from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
await connectDB();

// ─── Middleware ─────────────────────────────────────────────────────────────

// Security Headers (allow GraphQL introspection in dev)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:8080',
  credentials: true,
};
app.use(cors(corsOptions));

// Request body parser
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload attacks
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs (higher for GraphQL since it's a single endpoint)
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/graphql', limiter);

// ─── Apollo Server Setup ────────────────────────────────────────────────────

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Log errors in development with full details
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GraphQL Error]', formattedError.message);
      if (error?.originalError) {
        console.error('[Original Error]', error.originalError.message);
        console.error('[Stack]', error.originalError.stack);
      }
    }
    return formattedError;
  },
});

await apolloServer.start();

// Mount GraphQL endpoint
app.use(
  '/graphql',
  cors(corsOptions),
  express.json(),
  expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      // Extract user from JWT token (if present)
      let user = null;
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          user = verifyToken(token);
        }
      } catch (error) {
        // Token is invalid or expired — user remains null
      }

      return { pool, user };
    },
  })
);

// ─── REST Endpoints (kept for non-GraphQL needs) ───────────────────────────

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});



// ─── Start Server ───────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, apolloServer };
