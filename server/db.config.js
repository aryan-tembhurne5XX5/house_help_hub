
// Database configuration for Node.js backend

const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || 'house_help_hub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// For async/await use
const promisePool = pool.promise();

module.exports = {
  pool,
  promisePool
};
