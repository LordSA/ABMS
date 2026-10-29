const db = require('../database/db');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');
const supabaseSync = require('./supabaseSync');

/**
 * Preview payment allocation breakdown without persisting changes.
 */
function previewAllocation(userId, requestedAmount) {
  const card = db.prepare("SELECT * FROM hybrid_cards WHERE user_id = ? AND status = 'ACTIVE'").get(userId);
  if (!card) {
    throw new Error('Active Hybrid Card not found for this account.');
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(card.account_id);
  if (!account) {
    throw new Error('Associated debit account not found.');
  }

  const safeLimitRow = db.prepare('SELECT * FROM safe_limits WHERE user_id = ? AND account_id = ?').get(userId, account.id);
  const isSafeLimitEnabled = safeLimitRow ? Boolean(safeLimitRow.is_enabled) : false;
  const safeLimitAmount = isSafeLimitEnabled && safeLimitRow ? safeLimitRow.safe_limit_amount : 0.0;

  const currentDebit = account.balance;
  const currentCredit = card.available_credit;

  // Available debit strictly above the safe limit
  const availableDebitAboveSafeLimit = isSafeLimitEnabled 
    ? Math.max(0, currentDebit - safeLimitAmount)
    : currentDebit;

  const debitPortion = Math.min(requestedAmount, availableDebitAboveSafeLimit);
  const remainingNeeded = requestedAmount - debitPortion;

  let creditPortion = 0;
  let canCover = false;
  let declineReason = null;

  if (remainingNeeded <= currentCredit) {
    creditPortion = remainingNeeded;
    canCover = true;
  } else {
    declineReason = `Insufficient funds. Needed $${remainingNeeded.toFixed(2)} on credit, but only $${currentCredit.toFixed(2)} available. Total combined limit is $${(availableDebitAboveSafeLimit + currentCredit).toFixed(2)}.`;
  }

  // Check if minor requires parental approval
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  let requiresParentalApproval = false;
  let parentLink = null;

  if (user && user.role === 'MINOR') {
    parentLink = db.prepare("SELECT * FROM parent_child_links WHERE minor_user_id = ? AND status = 'VERIFIED'").get(userId);
    if (parentLink && requestedAmount >= (parentLink.requires_approval_above || 0)) {
      requiresParentalApproval = true;
    }
  }

  return {
    canCover,
    declineReason,
    requestedAmount,
    currentDebit,
    currentCredit,
    isSafeLimitEnabled,
    safeLimitAmount,
    availableDebitAboveSafeLimit,
    debitPortion,
    creditPortion,
    debitBalanceAfter: currentDebit - debitPortion,
    creditLimitAfter: currentCredit - creditPortion,
    requiresParentalApproval,
    parentLink
  };
}

/**
 * Execute or request hybrid card payment
 */
function processHybridPayment(userId, { amount, merchant, purpose, pin }) {
  const card = db.prepare('SELECT * FROM hybrid_cards WHERE user_id = ?').get(userId);
  if (!card) {
    throw new Error('No hybrid card assigned to user.');
  }

  if (card.status !== 'ACTIVE') {
    throw new Error(`Hybrid Card is currently ${card.status}. Transaction rejected.`);
  }

  if (pin && card.pin !== pin) {
    throw new Error('Invalid Card PIN. Transaction declined.');
  }

  const preview = previewAllocation(userId, amount);

  if (!preview.canCover) {
    // Record failed transaction attempt
    const refId = `TXN-DEC-${Date.now()}`;
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, failure_reason)
      VALUES (?, ?, ?, ?, 'HYBRID_CARD_PURCHASE', ?, 0, 0, ?, ?, 'FAILED', ?)
    `).run(refId, userId, card.account_id, card.id, amount, merchant, purpose || 'Hybrid Card Purchase', preview.declineReason);

    createNotification(userId, 'Card Transaction Declined', `Your payment of $${amount.toFixed(2)} at ${merchant} was declined: ${preview.declineReason}`, 'TRANSACTION');
    logAudit(userId, 'CARD_PAYMENT_DECLINED', 'TRANSACTION', refId, `Declined payment of $${amount} at ${merchant}: ${preview.declineReason}`);

    return {
      success: false,
      status: 'DECLINED',
      reason: preview.declineReason,
      referenceId: refId
    };
  }

  // Check if parental approval is required for minor
  if (preview.requiresParentalApproval && preview.parentLink) {
    const requestCode = `APR-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    
    // Auto expires in 20 minutes
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const reqResult = db.prepare(`
      INSERT INTO parental_approval_requests (request_code, minor_user_id, parent_user_id, account_id, card_id, amount, merchant, purpose, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(requestCode, userId, preview.parentLink.parent_user_id, card.account_id, card.id, amount, merchant, purpose || 'Minor Card Purchase', expiresAt);

    const refId = `TXN-PEND-${Date.now()}`;
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, parental_approval_id)
      VALUES (?, ?, ?, ?, 'HYBRID_CARD_PURCHASE', ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
    `).run(refId, userId, card.account_id, card.id, amount, preview.debitPortion, preview.creditPortion, merchant, purpose || 'Pending Parent Approval', reqResult.lastInsertRowid);

    // Notify Parent
    const minorUser = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    createNotification(
      preview.parentLink.parent_user_id,
      'Approval Needed: Minor Card Payment',
      `${minorUser ? minorUser.name : 'Your dependent'} is requesting authorization for a $${amount.toFixed(2)} payment at "${merchant}".`,
      'APPROVAL_REQUEST',
      { approvalId: reqResult.lastInsertRowid, requestCode, amount, merchant }
    );

    // Notify Minor
    createNotification(
      userId,
      'Payment Submitted for Approval',
      `Your $${amount.toFixed(2)} purchase at "${merchant}" has been sent to your parent for approval.`,
      'APPROVAL_REQUEST',
      { approvalId: reqResult.lastInsertRowid, requestCode }
    );

    logAudit(userId, 'APPROVAL_REQUEST_SUBMITTED', 'PARENTAL_APPROVAL', reqResult.lastInsertRowid, `Submitted $${amount} payment for parent approval.`);

    // Sync to Supabase in real-time
    supabaseSync.syncCreateApprovalRequest({
      request_code: requestCode,
      minor_user_id: userId,
      parent_user_id: preview.parentLink.parent_user_id,
      account_id: card.account_id,
      card_id: card.id,
      amount,
      merchant,
      purpose: purpose || 'Minor Card Purchase',
      expires_at: expiresAt
    });

    supabaseSync.syncTransaction({
      reference_id: refId,
      user_id: userId,
      account_id: card.account_id,
      card_id: card.id,
      type: 'HYBRID_CARD_PURCHASE',
      total_amount: amount,
      debit_portion: preview.debitPortion,
      credit_portion: preview.creditPortion,
      recipient_info: merchant,
      description: purpose || 'Pending Parent Approval',
      status: 'PENDING_APPROVAL',
      parental_approval_id: reqResult.lastInsertRowid
    });

    return {
      success: true,
      status: 'PENDING_APPROVAL',
      message: 'Payment requires parental approval. An authorization alert has been sent to your parent/guardian.',
      requestCode,
      expiresAt,
      breakdown: {
        totalAmount: amount,
        estimatedDebit: preview.debitPortion,
        estimatedCredit: preview.creditPortion,
        preservedSafeLimit: preview.safeLimitAmount
      }
    };
  }

  // Adult or approved transaction: execute atomic settlement
  return executeSettlement({
    userId,
    accountId: card.account_id,
    cardId: card.id,
    amount,
    merchant,
    purpose,
    debitPortion: preview.debitPortion,
    creditPortion: preview.creditPortion,
    safeLimitAmount: preview.safeLimitAmount,
    isSafeLimitEnabled: preview.isSafeLimitEnabled,
    currentDebit: preview.currentDebit,
    currentCredit: preview.currentCredit
  });
}

function executeSettlement({ userId, accountId, cardId, amount, merchant, purpose, debitPortion, creditPortion, safeLimitAmount, isSafeLimitEnabled, currentDebit, currentCredit, approvalId = null }) {
  const refId = `TXN-HYB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const settleTx = db.transaction(() => {
    // 1. Deduct from debit balance
    if (debitPortion > 0) {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(debitPortion, accountId);
    }

    // 2. Deduct from card credit limit
    if (creditPortion > 0) {
      db.prepare('UPDATE hybrid_cards SET available_credit = available_credit - ? WHERE id = ?').run(creditPortion, cardId);
    }

    // 3. Record or update completed transaction (avoid duplicate if previously pending approval)
    let txId;
    let finalRefId = refId;
    if (approvalId) {
      const existingTx = db.prepare('SELECT id, reference_id FROM transactions WHERE parental_approval_id = ?').get(approvalId);
      if (existingTx) {
        txId = existingTx.id;
        finalRefId = existingTx.reference_id;
        db.prepare(`
          UPDATE transactions
          SET status = 'SUCCESS', debit_portion = ?, credit_portion = ?, description = ?
          WHERE id = ?
        `).run(debitPortion, creditPortion, purpose || 'Smart Hybrid Card Purchase (Parent Approved)', txId);
      }
    }

    if (!txId) {
      const txStmt = db.prepare(`
        INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, parental_approval_id)
        VALUES (?, ?, ?, ?, 'HYBRID_CARD_PURCHASE', ?, ?, ?, ?, ?, 'SUCCESS', ?)
      `);
      const txResult = txStmt.run(finalRefId, userId, accountId, cardId, amount, debitPortion, creditPortion, merchant, purpose || 'Smart Hybrid Card Purchase', approvalId);
      txId = txResult.lastInsertRowid;
    }

    // 4. Record detailed payment allocation
    db.prepare(`
      INSERT INTO payment_allocations (
        transaction_id, requested_amount, safe_limit_active, safe_limit_value,
        debit_balance_before, debit_deducted, debit_balance_after,
        credit_limit_before, credit_deducted, credit_limit_after, allocation_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txId,
      amount,
      isSafeLimitEnabled ? 1 : 0,
      safeLimitAmount,
      currentDebit,
      debitPortion,
      currentDebit - debitPortion,
      currentCredit,
      creditPortion,
      currentCredit - creditPortion,
      isSafeLimitEnabled 
        ? `Safe Limit of $${safeLimitAmount.toFixed(2)} protected. Debit paid $${debitPortion.toFixed(2)}, Credit covered $${creditPortion.toFixed(2)}.`
        : `Direct split: Debit $${debitPortion.toFixed(2)}, Credit $${creditPortion.toFixed(2)}.`
    );

    return { txId, refId: finalRefId };
  });

  const result = settleTx();

  const newDebit = currentDebit - debitPortion;
  const newCredit = currentCredit - creditPortion;

  // Real-time Supabase sync
  supabaseSync.syncTransaction({
    reference_id: refId,
    user_id: userId,
    account_id: accountId,
    card_id: cardId,
    type: 'HYBRID_CARD_PURCHASE',
    total_amount: amount,
    debit_portion: debitPortion,
    credit_portion: creditPortion,
    recipient_info: merchant,
    description: purpose || 'Smart Hybrid Card Purchase',
    status: 'SUCCESS',
    parental_approval_id: approvalId
  });

  if (debitPortion > 0) {
    supabaseSync.syncAccountBalance(accountId, newDebit);
  }
  if (creditPortion > 0) {
    supabaseSync.syncCardAvailableCredit(cardId, newCredit);
  }

  // 5. Notifications & Alerts
  let splitMsg = `Paid $${amount.toFixed(2)} at ${merchant}. `;
  if (debitPortion > 0 && creditPortion > 0) {
    splitMsg += `Split: $${debitPortion.toFixed(2)} from Debit Account and $${creditPortion.toFixed(2)} charged to Credit line.`;
  } else if (creditPortion > 0) {
    splitMsg += `Charged 100% ($${creditPortion.toFixed(2)}) to Credit line to protect Safe Limit.`;
  } else {
    splitMsg += `Paid 100% ($${debitPortion.toFixed(2)}) from Debit balance.`;
  }

  createNotification(userId, 'Hybrid Card Purchase Successful', splitMsg, 'TRANSACTION', {
    txId: result.txId,
    refId: result.refId,
    amount,
    debitPortion,
    creditPortion
  });

  // Check if debit balance is nearing Safe Limit
  if (isSafeLimitEnabled && newDebit <= safeLimitAmount * 1.15) {
    createNotification(
      userId,
      'Safe Limit Warning',
      `Your debit balance ($${newDebit.toFixed(2)}) is approaching your protected Safe Limit of $${safeLimitAmount.toFixed(2)}. Subsequent card purchases will automatically route to Credit.`,
      'SAFE_LIMIT_ALERT',
      { currentDebit: newDebit, safeLimitAmount }
    );
  }

  // Check if credit is low
  const cardData = db.prepare('SELECT credit_limit FROM hybrid_cards WHERE id = ?').get(cardId);
  if (cardData && newCredit <= cardData.credit_limit * 0.2) {
    createNotification(
      userId,
      'Low Available Credit Alert',
      `Your available credit limit is now $${newCredit.toFixed(2)} (below 20% of your $${cardData.credit_limit.toFixed(2)} limit). Consider making a credit repayment.`,
      'LOW_CREDIT',
      { availableCredit: newCredit, totalLimit: cardData.credit_limit }
    );
  }

  logAudit(userId, 'HYBRID_PURCHASE_SETTLED', 'TRANSACTION', result.refId, `Settled $${amount} at ${merchant}. Debit: $${debitPortion}, Credit: $${creditPortion}`);

  return {
    success: true,
    status: 'SUCCESS',
    referenceId: result.refId,
    transactionId: result.txId,
    allocation: {
      totalAmount: amount,
      debitDeducted: debitPortion,
      creditDeducted: creditPortion,
      newDebitBalance: newDebit,
      newAvailableCredit: newCredit,
      safeLimitAmount,
      isSafeLimitEnabled
    }
  };
}

module.exports = {
  previewAllocation,
  processHybridPayment,
  executeSettlement
};
