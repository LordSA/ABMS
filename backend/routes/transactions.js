const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/transactions
router.get('/', authenticateToken, (req, res) => {
  const { type, status, search, minAmount, maxAmount, rail, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT t.*, a.account_number, c.card_number,
           p.safe_limit_active, p.safe_limit_value, p.debit_deducted, p.credit_deducted,
           p.debit_balance_after, p.credit_limit_after, p.allocation_notes,
           par.request_code as approval_request_code
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN hybrid_cards c ON c.id = t.card_id
    LEFT JOIN payment_allocations p ON p.transaction_id = t.id
    LEFT JOIN parental_approval_requests par ON par.id = t.parental_approval_id
    WHERE t.user_id = ?
  `;
  const params = [req.user.id];

  let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?';
  const countParams = [req.user.id];

  if (rail === 'CREDIT') {
    query += " AND (t.credit_portion > 0 OR t.type = 'CREDIT_REPAYMENT')";
    countQuery += " AND (t.credit_portion > 0 OR t.type = 'CREDIT_REPAYMENT')";
  } else if (rail === 'DEBIT') {
    query += ' AND (t.debit_portion > 0 OR t.type = \'DEPOSIT\')';
    countQuery += ' AND (t.debit_portion > 0 OR t.type = \'DEPOSIT\')';
  }

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
    countQuery += ' AND t.type = ?';
    countParams.push(type);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
    countQuery += ' AND t.status = ?';
    countParams.push(status);
  }

  if (minAmount) {
    const minVal = parseFloat(minAmount);
    query += ' AND t.total_amount >= ?';
    params.push(minVal);
    countQuery += ' AND t.total_amount >= ?';
    countParams.push(minVal);
  }

  if (maxAmount) {
    const maxVal = parseFloat(maxAmount);
    query += ' AND t.total_amount <= ?';
    params.push(maxVal);
    countQuery += ' AND t.total_amount <= ?';
    countParams.push(maxVal);
  }

  if (search) {
    query += ' AND (t.reference_id LIKE ? OR t.recipient_info LIKE ? OR t.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
    countQuery += ' AND (t.reference_id LIKE ? OR t.recipient_info LIKE ? OR t.description LIKE ?)';
    countParams.push(s, s, s);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const transactions = db.prepare(query).all(...params);

  // Filtered total count for accurate pagination
  const countRow = db.prepare(countQuery).get(...countParams);

  res.json({
    success: true,
    transactions,
    total: countRow ? countRow.total : 0,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// GET /api/transactions/:id/receipt
router.get('/:id/receipt', authenticateToken, (req, res) => {
  const tx = db.prepare(`
    SELECT t.*, u.name as customer_name, u.email as customer_email,
           a.account_number, c.card_number,
           p.safe_limit_active, p.safe_limit_value, p.debit_balance_before, p.debit_deducted, p.debit_balance_after,
           p.credit_limit_before, p.credit_deducted, p.credit_limit_after, p.allocation_notes,
           par.request_code, par.merchant as requested_merchant, par.status as approval_status,
           pu.name as parent_approver_name
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN hybrid_cards c ON c.id = t.card_id
    LEFT JOIN payment_allocations p ON p.transaction_id = t.id
    LEFT JOIN parental_approval_requests par ON par.id = t.parental_approval_id
    LEFT JOIN users pu ON pu.id = par.parent_user_id
    WHERE t.id = ? AND (t.user_id = ? OR ? = 'ADMIN' OR t.user_id IN (
      SELECT minor_user_id FROM parent_child_links WHERE parent_user_id = ?
    ))
  `).get(req.params.id, req.user.id, req.user.role, req.user.id);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'Transaction receipt not found or unauthorized.' });
  }

  res.json({ success: true, receipt: tx });
});

// GET /api/transactions/export/csv
router.get('/export/csv', authenticateToken, (req, res) => {
  const transactions = db.prepare(`
    SELECT t.reference_id, t.type, t.total_amount, t.debit_portion, t.credit_portion,
           t.recipient_info, t.description, t.status, t.created_at
    FROM transactions t
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);

  let csv = 'Reference ID,Type,Total Amount,Debit Portion,Credit Portion,Recipient / Merchant,Description,Status,Date\n';
  transactions.forEach(t => {
    csv += `"${t.reference_id}","${t.type}",${t.total_amount},${t.debit_portion},${t.credit_portion},"${(t.recipient_info || '').replace(/"/g, '""')}","${(t.description || '').replace(/"/g, '""')}","${t.status}","${t.created_at}"\n`;
  });

  res.header('Content-Type', 'text/csv');
  res.attachment(`ABMS_Statement_${Date.now()}.csv`);
  res.send(csv);
});

module.exports = router;
