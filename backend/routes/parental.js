const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { executeSettlement } = require('../services/cardAllocationService');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const supabaseSync = require('../services/supabaseSync');

const router = express.Router();

// Helper to auto-expire stale pending requests
function expireStaleRequests() {
  db.prepare(`
    UPDATE parental_approval_requests
    SET status = 'EXPIRED', resolved_at = CURRENT_TIMESTAMP
    WHERE status = 'PENDING' AND expires_at < datetime('now')
  `).run();

  // Also update corresponding pending transactions
  db.prepare(`
    UPDATE transactions
    SET status = 'EXPIRED', failure_reason = 'Parental approval expired.'
    WHERE status = 'PENDING_APPROVAL' AND parental_approval_id IN (
      SELECT id FROM parental_approval_requests WHERE status = 'EXPIRED'
    )
  `).run();
}

// GET /api/parental/linked-children (For Parent)
router.get('/linked-children', authenticateToken, (req, res) => {
  expireStaleRequests();

  const children = db.prepare(`
    SELECT l.id as link_id, l.relationship, l.requires_approval_above, l.status as link_status,
           u.id as minor_id, u.name as minor_name, u.email as minor_email, u.dob,
           a.id as account_id, a.account_number, a.balance as debit_balance,
           c.id as card_id, c.card_number, c.credit_limit, c.available_credit, c.status as card_status,
           s.safe_limit_amount
    FROM parent_child_links l
    JOIN users u ON u.id = l.minor_user_id
    LEFT JOIN accounts a ON a.user_id = u.id
    LEFT JOIN hybrid_cards c ON c.account_id = a.id
    LEFT JOIN safe_limits s ON s.account_id = a.id
    WHERE l.parent_user_id = ?
    ORDER BY u.name ASC
  `).all(req.user.id);

  res.json({ success: true, children });
});

// GET /api/parental/my-parent (For Minor)
router.get('/my-parent', authenticateToken, (req, res) => {
  const link = db.prepare(`
    SELECT l.id as link_id, l.relationship, l.requires_approval_above, l.status,
           u.name as parent_name, u.email as parent_email, u.phone as parent_phone
    FROM parent_child_links l
    JOIN users u ON u.id = l.parent_user_id
    WHERE l.minor_user_id = ? AND l.status = 'VERIFIED'
  `).get(req.user.id);

  res.json({ success: true, parent: link || null });
});

// GET /api/parental/pending-requests (For Parent)
router.get('/pending-requests', authenticateToken, (req, res) => {
  expireStaleRequests();

  const requests = db.prepare(`
    SELECT r.*, u.name as minor_name, u.email as minor_email,
           a.balance as current_minor_balance,
           c.available_credit as current_minor_credit,
           s.safe_limit_amount
    FROM parental_approval_requests r
    JOIN users u ON u.id = r.minor_user_id
    LEFT JOIN accounts a ON a.id = r.account_id
    LEFT JOIN hybrid_cards c ON c.id = r.card_id
    LEFT JOIN safe_limits s ON s.account_id = a.id
    WHERE r.parent_user_id = ?
    ORDER BY 
      CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
      r.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, requests });
});

// POST /api/parental/approve/:requestId (Parent authorizes payment or transfer)
router.post('/approve/:requestId', authenticateToken, (req, res) => {
  expireStaleRequests();

  const request = db.prepare(`
    SELECT * FROM parental_approval_requests 
    WHERE id = ? AND parent_user_id = ?
  `).get(req.params.requestId, req.user.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Approval request not found or not assigned to you.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
  }

  const isTransfer = (request.merchant && request.merchant.startsWith('Transfer to ')) || !request.card_id;

  if (isTransfer) {
    // ----------------------------------------------------
    // Scenario A: Approve Minor Fund Transfer
    // ----------------------------------------------------
    const fromAccount = request.account_id
      ? db.prepare('SELECT * FROM accounts WHERE id = ?').get(request.account_id)
      : db.prepare('SELECT * FROM accounts WHERE user_id = ? LIMIT 1').get(request.minor_user_id);
    const userCard = request.card_id
      ? db.prepare('SELECT * FROM hybrid_cards WHERE id = ?').get(request.card_id)
      : null;

    if (!fromAccount && !userCard) {
      return res.status(400).json({ success: false, message: 'Source account or credit line for transfer not found.' });
    }

    const isCreditTransfer = Boolean(userCard && (!fromAccount || userCard.available_credit >= request.amount));

    if (isCreditTransfer) {
      if (userCard.available_credit < request.amount) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: Minor's available credit ($${userCard.available_credit.toFixed(2)}) is less than transfer amount ($${request.amount.toFixed(2)}).`
        });
      }
    } else {
      if (fromAccount.balance < request.amount) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: Minor's debit balance ($${fromAccount.balance.toFixed(2)}) is less than transfer amount ($${request.amount.toFixed(2)}).`
        });
      }
    }

    // Extract destination account number if present in merchant text: "Transfer to Recipient (ACC-NUMBER)"
    const match = request.merchant.match(/\(([^)]+)\)/);
    const recipientAccNum = match ? match[1] : null;

    let toAccount = null;
    if (recipientAccNum) {
      toAccount = db.prepare(`
        SELECT a.*, u.name as recipient_name, u.id as recipient_user_id
        FROM accounts a
        JOIN users u ON u.id = a.user_id
        WHERE a.account_number = ? AND a.status = 'ACTIVE'
      `).get(recipientAccNum);
    }

    if (!toAccount) {
      toAccount = db.prepare(`
        SELECT a.*, u.name as recipient_name, u.id as recipient_user_id
        FROM accounts a
        JOIN users u ON u.id = a.user_id
        WHERE a.user_id != ? AND a.status = 'ACTIVE'
        LIMIT 1
      `).get(request.minor_user_id);
    }

    const refId = `TXN-TRF-${Date.now()}`;

    const approveTransferTx = db.transaction(() => {
      // 1. Deduct from minor's account or credit line
      if (isCreditTransfer) {
        db.prepare('UPDATE hybrid_cards SET available_credit = available_credit - ? WHERE id = ?').run(request.amount, userCard.id);
      } else {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(request.amount, fromAccount.id);
      }

      // 2. Credit recipient account
      if (toAccount) {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(request.amount, toAccount.id);
      }

      // 3. Update pending minor transaction to SUCCESS
      const existingTx = db.prepare('SELECT id, reference_id FROM transactions WHERE parental_approval_id = ?').get(request.id);
      if (existingTx) {
        db.prepare(`
          UPDATE transactions
          SET status = 'SUCCESS', debit_portion = ?, credit_portion = ?
          WHERE id = ?
        `).run(isCreditTransfer ? 0 : request.amount, isCreditTransfer ? request.amount : 0, existingTx.id);
      } else {
        db.prepare(`
          INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, parental_approval_id)
          VALUES (?, ?, ?, ?, 'TRANSFER', ?, ?, ?, ?, ?, 'SUCCESS', ?)
        `).run(
          refId,
          request.minor_user_id,
          fromAccount ? fromAccount.id : null,
          userCard ? userCard.id : null,
          request.amount,
          isCreditTransfer ? 0 : request.amount,
          isCreditTransfer ? request.amount : 0,
          request.merchant,
          request.purpose || 'Fund Transfer (Parent Approved)',
          request.id
        );
      }

      // 4. Record receiver incoming transaction
      if (toAccount) {
        db.prepare(`
          INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
          VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, ?, ?, 'SUCCESS')
        `).run(
          `${refId}-RX`,
          toAccount.recipient_user_id,
          toAccount.id,
          request.amount,
          request.amount,
          `From Minor Transfer (Parent Authorized)`,
          'Incoming transfer'
        );
      }

      // 5. Mark approval request as APPROVED
      db.prepare(`
        UPDATE parental_approval_requests
        SET status = 'APPROVED', resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(request.id);
    });

    try {
      approveTransferTx();

      supabaseSync.syncParentalApproval(request.id, 'APPROVED');

      createNotification(
        request.minor_user_id,
        'Transfer Approved by Parent!',
        `Your transfer of $${request.amount.toFixed(2)} was approved by your parent and sent successfully.`,
        'APPROVAL_REQUEST',
        { requestId: request.id, amount: request.amount }
      );

      createNotification(
        req.user.id,
        'Transfer Authorized',
        `You authorized the $${request.amount.toFixed(2)} transfer for your child.`,
        'APPROVAL_REQUEST'
      );

      logAudit(req.user.id, 'PARENTAL_APPROVAL_GRANTED', 'APPROVAL_REQUEST', request.id, `Approved transfer of $${request.amount} for minor #${request.minor_user_id}`);

      return res.json({
        success: true,
        message: 'Transfer request approved and processed successfully.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Transfer settlement failed: ' + err.message });
    }
  }

  // ----------------------------------------------------
  // Scenario B: Approve Minor Card Purchase
  // ----------------------------------------------------
  const card = db.prepare('SELECT * FROM hybrid_cards WHERE id = ?').get(request.card_id);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(request.account_id);
  const safeLimitRow = db.prepare('SELECT * FROM safe_limits WHERE account_id = ?').get(request.account_id);

  if (!account || !card) {
    return res.status(400).json({ success: false, message: 'Minor account or card record not found.' });
  }

  const isSafeLimitEnabled = safeLimitRow ? Boolean(safeLimitRow.is_enabled) : false;
  const safeLimitAmount = isSafeLimitEnabled && safeLimitRow ? safeLimitRow.safe_limit_amount : 0.0;
  const currentDebit = account.balance;
  const currentCredit = card.available_credit;

  // Calculate split allocation
  const availableDebitAboveSafe = isSafeLimitEnabled 
    ? Math.max(0, currentDebit - safeLimitAmount)
    : currentDebit;

  const debitPortion = Math.min(request.amount, availableDebitAboveSafe);
  const remainingNeeded = request.amount - debitPortion;

  if (remainingNeeded > currentCredit) {
    return res.status(400).json({
      success: false,
      message: `Cannot approve: Minor's account has insufficient total funds and credit (Needed $${request.amount.toFixed(2)}, Available: $${(availableDebitAboveSafe + currentCredit).toFixed(2)}).`
    });
  }

  const creditPortion = remainingNeeded;

  try {
    // Execute atomic settlement (updates the existing pending transaction and records payment_allocations)
    const settleResult = executeSettlement({
      userId: request.minor_user_id,
      accountId: account.id,
      cardId: card.id,
      amount: request.amount,
      merchant: request.merchant,
      purpose: request.purpose || 'Parent Approved Minor Purchase',
      debitPortion,
      creditPortion,
      safeLimitAmount,
      isSafeLimitEnabled,
      currentDebit,
      currentCredit,
      approvalId: request.id
    });

    // Mark approval request as APPROVED
    db.prepare(`
      UPDATE parental_approval_requests
      SET status = 'APPROVED', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(request.id);

    // Sync to Supabase
    supabaseSync.syncParentalApproval(request.id, 'APPROVED');

    // Notify Minor
    createNotification(
      request.minor_user_id,
      'Payment Approved by Parent!',
      `Your parent approved the payment of $${request.amount.toFixed(2)} at "${request.merchant}". Payment settled successfully.`,
      'APPROVAL_REQUEST',
      { requestId: request.id, amount: request.amount }
    );

    // Notify Parent
    createNotification(
      req.user.id,
      'Payment Approved',
      `You authorized $${request.amount.toFixed(2)} at "${request.merchant}" for your child.`,
      'APPROVAL_REQUEST'
    );

    logAudit(req.user.id, 'PARENTAL_APPROVAL_GRANTED', 'APPROVAL_REQUEST', request.id, `Approved $${request.amount} for minor #${request.minor_user_id}`);

    res.json({
      success: true,
      message: 'Payment request approved and processed successfully.',
      settlement: settleResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Approval settlement failed: ' + err.message });
  }
});

// POST /api/parental/reject/:requestId (Parent declines payment)
router.post('/reject/:requestId', authenticateToken, (req, res) => {
  const { reason } = req.body;

  const request = db.prepare(`
    SELECT * FROM parental_approval_requests 
    WHERE id = ? AND parent_user_id = ?
  `).get(req.params.requestId, req.user.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Approval request not found.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
  }

  db.prepare(`
    UPDATE parental_approval_requests
    SET status = 'REJECTED', rejection_reason = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason || 'Declined by parent/guardian', request.id);

  supabaseSync.syncParentalApproval(request.id, 'REJECTED', reason || 'Declined by parent/guardian');

  // Update corresponding transaction
  db.prepare(`
    UPDATE transactions
    SET status = 'REJECTED', failure_reason = ?
    WHERE parental_approval_id = ?
  `).run(reason || 'Declined by parent', request.id);

  // Notify Minor
  createNotification(
    request.minor_user_id,
    'Payment Request Declined',
    `Your parent declined the payment of $${request.amount.toFixed(2)} at "${request.merchant}". Reason: ${reason || 'Not authorized'}`,
    'APPROVAL_REQUEST'
  );

  logAudit(req.user.id, 'PARENTAL_APPROVAL_REJECTED', 'APPROVAL_REQUEST', request.id, `Declined payment of $${request.amount}. Reason: ${reason || 'None'}`);

  res.json({ success: true, message: 'Payment request declined.' });
});

// POST /api/parental/update-threshold
router.post('/update-threshold', authenticateToken, (req, res) => {
  const { linkId, requiresApprovalAbove } = req.body;
  const numLimit = parseFloat(requiresApprovalAbove);

  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ success: false, message: 'Enter a valid threshold amount.' });
  }

  db.prepare(`
    UPDATE parent_child_links
    SET requires_approval_above = ?
    WHERE id = ? AND parent_user_id = ?
  `).run(numLimit, linkId, req.user.id);

  logAudit(req.user.id, 'PARENT_THRESHOLD_UPDATED', 'PARENT_CHILD_LINK', linkId, `Updated approval threshold to $${numLimit}`);

  res.json({ success: true, message: 'Approval threshold updated.' });
});

// POST /api/parental/link-child
router.post('/link-child', authenticateToken, (req, res) => {
  const { childEmail, relationship = 'Parent' } = req.body;

  if (!childEmail) {
    return res.status(400).json({ success: false, message: 'Child account email is required.' });
  }

  const childUser = db.prepare('SELECT id, name, role FROM users WHERE email = ?').get(childEmail);
  if (!childUser) {
    return res.status(404).json({ success: false, message: 'User with this email not found.' });
  }

  if (childUser.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot link yourself as dependent.' });
  }

  try {
    db.prepare(`
      INSERT INTO parent_child_links (parent_user_id, minor_user_id, relationship, requires_approval_above, status)
      VALUES (?, ?, ?, 0.0, 'VERIFIED')
      ON CONFLICT(parent_user_id, minor_user_id) DO UPDATE SET status = 'VERIFIED'
    `).run(req.user.id, childUser.id, relationship);

    logAudit(req.user.id, 'PARENT_CHILD_LINKED', 'USER', childUser.id, `Linked child ${childUser.name} (${childEmail})`);

    createNotification(
      childUser.id,
      'Parent Linked',
      `${req.user.name} has linked your bank account as your ${relationship}. Parental approval will apply to eligible payments.`,
      'SYSTEM'
    );

    res.json({ success: true, message: `Successfully linked ${childUser.name} to your parent portal.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Linking failed: ' + err.message });
  }
});

module.exports = router;
