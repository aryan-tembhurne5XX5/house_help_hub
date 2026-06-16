
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// ─── Get User Notifications ───────────────────────────────────────────────────

router.get('/users/:userId/notifications', async (req, res, next) => {
  const { userId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Get Worker Notifications ─────────────────────────────────────────────────

router.get('/workers/:workerId/notifications', async (req, res, next) => {
  const { workerId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE worker_id = ? ORDER BY created_at DESC LIMIT 50',
      [workerId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── Mark Notification as Read ──────────────────────────────────────────────

router.put('/notifications/:notificationId/read', async (req, res, next) => {
  const { notificationId } = req.params;

  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
      [notificationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// ─── Mark All Notifications as Read for User ────────────────────────────────

router.put('/users/:userId/notifications/read-all', async (req, res, next) => {
    const { userId } = req.params;
  
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
});

// ─── Mark All Notifications as Read for Worker ──────────────────────────────

router.put('/workers/:workerId/notifications/read-all', async (req, res, next) => {
    const { workerId } = req.params;
  
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE worker_id = ?',
        [workerId]
      );
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
});

export default router;
