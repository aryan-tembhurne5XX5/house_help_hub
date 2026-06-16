
import express from 'express';
import { pool } from '../db.js';
import { validateProfileUpdate } from '../middleware/validate.js';

const router = express.Router();

// ─── Get User Profile ───────────────────────────────────────────────────────

router.get('/users/:userId/profile', async (req, res, next) => {
  const { userId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, name, email, phone, address, profile_pic, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// ─── Update User Profile ────────────────────────────────────────────────────

router.put('/users/:userId/profile', validateProfileUpdate, async (req, res, next) => {
  const { userId } = req.params;
  const { name, phone, address } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE user_id = ?',
      [name, phone || null, address || null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [updatedUser] = await pool.query(
      'SELECT user_id, name, email, phone, address, profile_pic, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    next(error);
  }
});

// ─── Get User's Bookings ────────────────────────────────────────────────────

router.get('/users/:userId/bookings', async (req, res, next) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS service_name, w.name AS worker_name, 
              w.phone AS worker_phone, w.profile_pic AS worker_profile_pic
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
