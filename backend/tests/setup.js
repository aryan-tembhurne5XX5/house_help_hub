
import { pool } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

// Global setup before all tests
beforeAll(async () => {
  // Ensure we are connected to the DB
  try {
    await pool.getConnection();
  } catch (error) {
    console.error('Test DB connection failed:', error);
    process.exit(1);
  }
});

// Clean up after each test
afterEach(async () => {
  // Clean up test tables here if needed, or leave it to individual tests
});

// Close connection pool after all tests complete
afterAll(async () => {
  await pool.end();
});
