
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:8080',
    credentials: true
  }
};

module.exports = config;
