const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const supabaseSync = require('../services/supabaseSync');

const router = express.Router();

// GET /api/credit/status
router.get('/status', authenticateToken, (req, res) => {
  const card = db.prepare(`
    SELECT c.*, a.balance as debit_balance, a.account_number
    FROM hybrid_cards c
    JOIN accounts a ON a.id = c.account_id
    WHERE c.user_id = ?
  `).get(req.user.id);

  if (!card) {
    return res.status(404).json({ success: false, message: 'Hybrid card not found.' });
  }

  const outstandingBalance = Math.max(0, card.credit_limit - card.available_credit);
  const utilizationPercentage = card.credit_limit > 0 ? ((outstandingBalance / card.credit_limit) * 100).toFixed(1) : 0;

  const repayments = db.prepare(`
    SELECT r.*, COALESCE(r.reference_id, (
      SELECT t.reference_id FROM transactions t 
      WHERE t.user_id = r.user_id AND t.type = 'CREDIT_REPAYMENT'
      ORDER BY t.id DESC LIMIT 1
    )) as reference_id
    FROM credit_repayments r
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all(req.user.id);

  res.json({
    success: true,
    credit: {
      cardId: card.id,
      cardNumber: card.card_number,
      creditLimit: card.credit_limit,
      availableCredit: card.available_credit,
      outstandingBalance,
      utilizationPercentage,
      debitBalance: card.debit_balance,
      repayments
    }
  });
});

// POST /api/credit/repay
router.post('/repay', authenticateToken, (req, res) => {
  const { amount, paymentMethod = 'DEBIT_ACCOUNT' } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid repayment amount is required.' });
  }

  const card = db.prepare(`
    SELECT c.*, a.balance as debit_balance, a.id as account_id
    FROM hybrid_cards c
    JOIN accounts a ON a.id = c.account_id
    WHERE c.user_id = ?
  `).get(req.user.id);

  if (!card) {
    return res.status(404).json({ success: false, message: 'Hybrid card not found.' });
  }

  const outstanding = Math.max(0, card.credit_limit - card.available_credit);
  if (outstanding <= 0) {
    return res.status(400).json({ success: false, message: 'No outstanding credit balance to repay. Balance is $0.00.' });
  }

  const repayAmount = Math.min(numAmount, outstanding);

  if (paymentMethod === 'DEBIT_ACCOUNT') {
    if (card.debit_balance < repayAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient debit account balance ($${card.debit_balance.toFixed(2)}) to make repayment of $${repayAmount.toFixed(2)}.`
      });
    }
  }

  const refId = `TXN-REP-${Date.now()}`;

  const repayTx = db.transaction(() => {
    // 1. If paying from debit, deduct from debit
    if (paymentMethod === 'DEBIT_ACCOUNT') {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(repayAmount, card.account_id);
    }

    // 2. Restore available credit (capped at credit_limit)
    db.prepare('UPDATE hybrid_cards SET available_credit = MIN(credit_limit, available_credit + ?) WHERE id = ?').run(repayAmount, card.id);

    // 3. Record transaction
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, ?, 'CREDIT_REPAYMENT', ?, ?, 0, 'Smart Hybrid Credit Line', ?, 'SUCCESS')
    `).run(refId, req.user.id, card.account_id, card.id, repayAmount, paymentMethod === 'DEBIT_ACCOUNT' ? repayAmount : 0, `Credit balance repayment via ${paymentMethod}`);

    // 4. Record credit repayment log
    db.prepare(`
      INSERT INTO credit_repayments (user_id, card_id, account_id, amount, payment_method, reference_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED')
    `).run(req.user.id, card.id, card.account_id, repayAmount, paymentMethod, refId);
  });

  try {
    repayTx();

    const updatedCard = db.prepare('SELECT available_credit, credit_limit FROM hybrid_cards WHERE id = ?').get(card.id);
    const newOutstanding = Math.max(0, updatedCard.credit_limit - updatedCard.available_credit);

    // Sync to Supabase in real-time
    supabaseSync.syncCardAvailableCredit(card.id, updatedCard.available_credit);
    if (paymentMethod === 'DEBIT_ACCOUNT') {
      supabaseSync.syncAccountBalance(card.account_id, card.debit_balance - repayAmount);
    }
    supabaseSync.syncTransaction({
      reference_id: refId,
      user_id: req.user.id,
      account_id: card.account_id,
      card_id: card.id,
      type: 'CREDIT_REPAYMENT',
      total_amount: repayAmount,
      debit_portion: paymentMethod === 'DEBIT_ACCOUNT' ? repayAmount : 0,
      credit_portion: 0,
      recipient_info: 'Smart Hybrid Credit Line',
      description: `Credit balance repayment via ${paymentMethod}`,
      status: 'SUCCESS'
    });

    createNotification(
      req.user.id,
      'Credit Repayment Successful',
      `Repaid $${repayAmount.toFixed(2)} towards your Smart Hybrid Card. New available credit: $${updatedCard.available_credit.toFixed(2)}, Remaining balance: $${newOutstanding.toFixed(2)}.`,
      'TRANSACTION'
    );

    logAudit(req.user.id, 'CREDIT_REPAID', 'HYBRID_CARD', card.id, `Repaid $${repayAmount} via ${paymentMethod}. New outstanding: $${newOutstanding}`);

    res.json({
      success: true,
      message: 'Repayment completed successfully.',
      repaidAmount: repayAmount,
      newAvailableCredit: updatedCard.available_credit,
      newOutstandingBalance: newOutstanding
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Repayment failed: ' + err.message });
  }
});

module.exports = router;
