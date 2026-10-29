const db = require('../database/db');

function logAudit(userId, action, entityType, entityId, details, ipAddress = '127.0.0.1') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, action, entityType, String(entityId || ''), details, ipAddress);
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
}

module.exports = { logAudit };
