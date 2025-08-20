
const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./example-api');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
