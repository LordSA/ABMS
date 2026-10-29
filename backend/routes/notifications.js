const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).count;

  res.json({
    success: true,
    notifications,
    unreadCount
  });
});

// POST /api/notifications/read/:id
router.post('/read/:id', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({ success: true, message: 'Notification marked as read.' });
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `).run(req.user.id);

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = router;
