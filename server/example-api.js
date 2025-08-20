
// Example API endpoints for House Help Hub
// This file demonstrates how you would implement the backend API

const express = require('express');
const router = express.Router();
const { promisePool } = require('./db.config');

// Get all services
router.get('/services', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM services');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving services' });
  }
});

// Get worker's service requests
router.get('/workers/:workerId/requests', async (req, res) => {
  const { workerId } = req.params;
  try {
    const [rows] = await promisePool.query(
      `SELECT b.*, u.name AS user_name, s.name AS service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       WHERE b.worker_id = ? AND b.status IN ('pending', 'confirmed')`,
      [workerId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving service requests' });
  }
});

// Accept a booking request
router.put('/bookings/:bookingId/accept', async (req, res) => {
  const { bookingId } = req.params;
  const { workerId } = req.body;
  
  try {
    // Start a transaction
    await promisePool.query('START TRANSACTION');
    
    // Update booking status
    const [result] = await promisePool.query(
      'UPDATE bookings SET status = "confirmed", worker_id = ? WHERE booking_id = ? AND status = "pending"',
      [workerId, bookingId]
    );
    
    if (result.affectedRows === 0) {
      await promisePool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }
    
    // Commit the transaction
    await promisePool.query('COMMIT');
    res.json({ message: 'Booking accepted successfully' });
  } catch (error) {
    await promisePool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error accepting booking' });
  }
});

// Reject a booking request
router.put('/bookings/:bookingId/reject', async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    const [result] = await promisePool.query(
      'UPDATE bookings SET status = "rejected" WHERE booking_id = ? AND status = "pending"',
      [bookingId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }
    
    res.json({ message: 'Booking rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error rejecting booking' });
  }
});

// Create a new booking (for users)
router.post('/bookings', async (req, res) => {
  const { userId, serviceId, bookingDate, bookingTime, durationHours, address, notes } = req.body;
  
  try {
    // Get service price
    const [serviceRows] = await promisePool.query('SELECT base_price FROM services WHERE service_id = ?', [serviceId]);
    
    if (serviceRows.length === 0) {
      return res.status(400).json({ message: 'Service not found' });
    }
    
    const basePrice = serviceRows[0].base_price;
    const totalPrice = basePrice * durationHours;
    
    // Insert new booking
    const [result] = await promisePool.query(
      `INSERT INTO bookings (user_id, service_id, booking_date, booking_time, duration_hours, address, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, serviceId, bookingDate, bookingTime, durationHours, address, totalPrice, notes]
    );
    
    res.status(201).json({ 
      message: 'Booking created successfully',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Get user's bookings
router.get('/users/:userId/bookings', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await promisePool.query(
      `SELECT b.*, s.name AS service_name, w.name AS worker_name, w.phone AS worker_phone
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving bookings' });
  }
});

module.exports = router;
