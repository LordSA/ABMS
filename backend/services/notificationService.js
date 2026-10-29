const db = require('../database/db');

function createNotification(userId, title, message, type = 'SYSTEM', metadata = null) {
  try {
    const metaString = metadata ? JSON.stringify(metadata) : null;
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, title, message, type, metaString);
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

module.exports = { createNotification };
