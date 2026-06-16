
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// ─── Dashboard Stats ────────────────────────────────────────────────────────

router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [workers] = await pool.query('SELECT COUNT(*) as count FROM workers');
    const [bookings] = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const [revenue] = await pool.query('SELECT SUM(total_price) as sum FROM bookings WHERE status = "completed"');

    res.json({
      totalUsers: users[0].count,
      totalWorkers: workers[0].count,
      totalBookings: bookings[0].count,
      totalRevenue: revenue[0].sum || 0
    });
  } catch (error) {
    next(error);
  }
});

// ─── Get All Users ──────────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT user_id, name, email, phone, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Delete User ────────────────────────────────────────────────────────────

router.delete('/users/:userId', async (req, res, next) => {
    const { userId } = req.params;
    try {
        await pool.query('START TRANSACTION');
        
        // Delete related records first due to foreign keys (if not using ON DELETE CASCADE)
        await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
        // Note: Bookings should probably be kept for history, so setting user_id to NULL might be better,
        // but for simplicity, we delete them if ON DELETE CASCADE is not set.
        await pool.query('DELETE FROM bookings WHERE user_id = ?', [userId]);
        
        const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
        
        if (result.affectedRows === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }
        
        await pool.query('COMMIT');
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        next(error);
    }
});

// ─── Get All Workers ────────────────────────────────────────────────────────

router.get('/workers', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT worker_id, name, email, phone, created_at, avg_rating FROM workers ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Delete Worker ──────────────────────────────────────────────────────────

router.delete('/workers/:workerId', async (req, res, next) => {
    const { workerId } = req.params;
    try {
        await pool.query('START TRANSACTION');
        
        await pool.query('DELETE FROM notifications WHERE worker_id = ?', [workerId]);
        await pool.query('DELETE FROM worker_availability WHERE worker_id = ?', [workerId]);
        await pool.query('DELETE FROM worker_services WHERE worker_id = ?', [workerId]);
        
        const [result] = await pool.query('DELETE FROM workers WHERE worker_id = ?', [workerId]);
        
        if (result.affectedRows === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Worker not found' });
        }
        
        await pool.query('COMMIT');
        res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        next(error);
    }
});

// ─── Get All Bookings ───────────────────────────────────────────────────────

router.get('/bookings', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.booking_id, b.ticket_number, b.status, b.created_at, b.total_price,
             u.name as user_name, w.name as worker_name, s.name as service_name
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN workers w ON b.worker_id = w.worker_id
      JOIN services s ON b.service_id = s.service_id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
