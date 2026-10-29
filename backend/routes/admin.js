const express = require('express');
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditService');

const router = express.Router();

// Apply admin role requirement to all routes in this file
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  const totalDeposits = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM accounts').get().total;
  
  const creditStats = db.prepare(`
    SELECT 
      COALESCE(SUM(credit_limit), 0) as totalCreditLimit,
      COALESCE(SUM(available_credit), 0) as totalAvailableCredit
    FROM hybrid_cards
  `).get();

  const totalCreditUsed = creditStats.totalCreditLimit - creditStats.totalAvailableCredit;

  const totalTxCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  const failedTxCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status IN ('FAILED', 'REJECTED', 'EXPIRED')").get().count;
  const pendingApprovals = db.prepare("SELECT COUNT(*) as count FROM parental_approval_requests WHERE status = 'PENDING'").get().count;

  res.json({
    success: true,
    metrics: {
      totalUsers,
      totalAccounts,
      totalDeposits,
      totalCreditLimit: creditStats.totalCreditLimit,
      totalCreditUsed,
      totalCreditAvailable: creditStats.totalAvailableCredit,
      totalTxCount,
      failedTxCount,
      pendingApprovals
    }
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.dob, u.phone, u.status, u.created_at,
           a.id as account_id, a.account_number, a.balance,
           c.id as card_id, c.card_number, c.credit_limit, c.available_credit, c.status as card_status,
           s.safe_limit_amount
    FROM users u
    LEFT JOIN accounts a ON a.user_id = u.id
    LEFT JOIN hybrid_cards c ON c.account_id = a.id
    LEFT JOIN safe_limits s ON s.account_id = a.id
    ORDER BY u.id ASC
  `).all();

  res.json({ success: true, users });
});

// POST /api/admin/users/:id/status
router.post('/users/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'FROZEN', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  logAudit(req.user.id, 'ADMIN_USER_STATUS_CHANGE', 'USER', req.params.id, `Changed user status to ${status}`);

  res.json({ success: true, message: `User status updated to ${status}.` });
});

// POST /api/admin/users/:id/credit-limit
router.post('/users/:id/credit-limit', (req, res) => {
  const { creditLimit } = req.body;
  const numLimit = parseFloat(creditLimit);

  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ success: false, message: 'Valid positive credit limit required.' });
  }

  const card = db.prepare('SELECT id, credit_limit, available_credit FROM hybrid_cards WHERE user_id = ?').get(req.params.id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'No card found for this user.' });
  }

  const creditUsed = card.credit_limit - card.available_credit;
  const newAvailable = Math.max(0, numLimit - creditUsed);

  db.prepare('UPDATE hybrid_cards SET credit_limit = ?, available_credit = ? WHERE id = ?').run(numLimit, newAvailable, card.id);
  logAudit(req.user.id, 'ADMIN_CREDIT_LIMIT_OVERRIDE', 'HYBRID_CARD', card.id, `Adjusted credit limit to $${numLimit}`);

  res.json({ success: true, message: `Credit limit updated to $${numLimit.toFixed(2)}.` });
});

// GET /api/admin/transactions
router.get('/transactions', (req, res) => {
  const { status, type, limit = 100 } = req.query;

  let query = `
    SELECT t.*, u.name as customer_name, u.email as customer_email,
           a.account_number, c.card_number,
           par.request_code, pu.name as parent_approver_name
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN hybrid_cards c ON c.id = t.card_id
    LEFT JOIN parental_approval_requests par ON par.id = t.parental_approval_id
    LEFT JOIN users pu ON pu.id = par.parent_user_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const transactions = db.prepare(query).all(...params);

  res.json({ success: true, transactions });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT 150
  `).all();

  res.json({ success: true, logs });
});

module.exports = router;
