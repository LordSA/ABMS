const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { previewAllocation, processHybridPayment } = require('../services/cardAllocationService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// GET /api/cards/my-card
router.get('/my-card', authenticateToken, (req, res) => {
  const card = db.prepare(`
    SELECT c.*, a.balance as debit_balance, a.account_number,
           s.safe_limit_amount, s.is_enabled as safe_limit_enabled
    FROM hybrid_cards c
    JOIN accounts a ON a.id = c.account_id
    LEFT JOIN safe_limits s ON s.account_id = a.id AND s.user_id = c.user_id
    WHERE c.user_id = ?
  `).get(req.user.id);

  if (!card) {
    return res.status(404).json({ success: false, message: 'No Smart Hybrid Card found for this user.' });
  }

  // Calculate used credit
  const usedCredit = Math.max(0, card.credit_limit - card.available_credit);

  res.json({
    success: true,
    card: {
      ...card,
      used_credit: usedCredit,
      total_purchasing_power: (card.debit_balance || 0) + (card.available_credit || 0)
    }
  });
});

// POST /api/cards/safe-limit (Update Safe Limit)
router.post('/safe-limit', authenticateToken, (req, res) => {
  const { safeLimitAmount, isEnabled } = req.body;
  const numLimit = parseFloat(safeLimitAmount);

  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ success: false, message: 'Valid positive safe limit amount is required.' });
  }

  const card = db.prepare('SELECT account_id FROM hybrid_cards WHERE user_id = ?').get(req.user.id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'No card found to associate with Safe Limit.' });
  }

  const enabledVal = isEnabled === undefined ? 1 : (isEnabled ? 1 : 0);

  db.prepare(`
    INSERT INTO safe_limits (user_id, account_id, safe_limit_amount, is_enabled, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, account_id) DO UPDATE SET
      safe_limit_amount = excluded.safe_limit_amount,
      is_enabled = excluded.is_enabled,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, card.account_id, numLimit, enabledVal);

  logAudit(req.user.id, 'SAFE_LIMIT_UPDATED', 'SAFE_LIMIT', card.account_id, `Updated Safe Limit to $${numLimit.toFixed(2)}, Enabled: ${enabledVal === 1}`);

  createNotification(
    req.user.id,
    'Safe Limit Updated',
    `Smart Safe Limit configured to $${numLimit.toFixed(2)} (${enabledVal ? 'Active' : 'Disabled'}). Debit balance above this threshold will be spent first.`,
    'SAFE_LIMIT_ALERT'
  );

  res.json({
    success: true,
    message: 'Safe Limit settings updated successfully.',
    safeLimit: {
      safe_limit_amount: numLimit,
      is_enabled: enabledVal
    }
  });
});

// POST /api/cards/preview-payment (Simulate allocation before submitting)
router.post('/preview-payment', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Enter a valid amount to preview.' });
  }

  try {
    const preview = previewAllocation(req.user.id, numAmount);
    res.json({ success: true, preview });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/cards/pay (Execute POS or Online Card Purchase)
router.post('/pay', authenticateToken, (req, res) => {
  const { amount, merchant, purpose, pin } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Enter a valid purchase amount.' });
  }

  if (!merchant || !merchant.trim()) {
    return res.status(400).json({ success: false, message: 'Merchant name or terminal is required.' });
  }

  try {
    const result = processHybridPayment(req.user.id, {
      amount: numAmount,
      merchant: merchant.trim(),
      purpose: purpose || 'Retail / Online POS Purchase',
      pin
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/cards/toggle-freeze
router.post('/toggle-freeze', authenticateToken, (req, res) => {
  const card = db.prepare('SELECT id, status FROM hybrid_cards WHERE user_id = ?').get(req.user.id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'No card found.' });
  }

  const newStatus = card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
  db.prepare('UPDATE hybrid_cards SET status = ? WHERE id = ?').run(newStatus, card.id);

  logAudit(req.user.id, 'CARD_STATUS_CHANGED', 'HYBRID_CARD', card.id, `Card status changed to ${newStatus}`);

  createNotification(
    req.user.id,
    `Card ${newStatus === 'FROZEN' ? 'Locked' : 'Unlocked'}`,
    `Your Smart Hybrid Card is now ${newStatus}. ${newStatus === 'FROZEN' ? 'All card purchases will be declined until unlocked.' : 'Card is ready for use.'}`,
    'SYSTEM'
  );

  res.json({ success: true, message: `Card is now ${newStatus}.`, newStatus });
});

// POST /api/cards/update-pin
router.post('/update-pin', authenticateToken, (req, res) => {
  const { currentPin, newPin } = req.body;

  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ success: false, message: 'PIN must be exactly 4 numeric digits.' });
  }

  const card = db.prepare('SELECT id, pin FROM hybrid_cards WHERE user_id = ?').get(req.user.id);
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found.' });
  }

  if (card.pin && card.pin !== currentPin) {
    return res.status(400).json({ success: false, message: 'Current PIN is incorrect.' });
  }

  db.prepare('UPDATE hybrid_cards SET pin = ? WHERE id = ?').run(newPin, card.id);
  logAudit(req.user.id, 'CARD_PIN_CHANGED', 'HYBRID_CARD', card.id, 'User changed card PIN');

  createNotification(req.user.id, 'Security Update', 'Your Smart Hybrid Card PIN has been successfully updated.', 'SYSTEM');

  res.json({ success: true, message: 'PIN updated successfully.' });
});

module.exports = router;
