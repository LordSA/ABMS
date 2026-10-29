const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const supabaseSync = require('../services/supabaseSync');

const router = express.Router();

// GET /api/accounts/banks (List of genuine Indian banks)
router.get('/banks', authenticateToken, (req, res) => {
  const banks = db.prepare("SELECT * FROM supported_banks WHERE status = 'ACTIVE' ORDER BY bank_name ASC").all();
  res.json({ success: true, banks });
});

// GET /api/accounts/banks/:bankCode/branches (Verified branches with genuine IFSC)
router.get('/banks/:bankCode/branches', authenticateToken, (req, res) => {
  const { bankCode } = req.params;
  const branches = db.prepare("SELECT * FROM bank_branches WHERE bank_code = ? AND status = 'ACTIVE' ORDER BY branch_name ASC").all(bankCode.toUpperCase());
  res.json({ success: true, branches });
});

// POST /api/accounts/create (Open a new bank account)
router.post('/create', authenticateToken, (req, res) => {
  const { accountType = 'SAVINGS', initialDeposit = 1000 } = req.body;
  const depositNum = parseFloat(initialDeposit) || 1000;

  if (!['SAVINGS', 'CHECKING'].includes(accountType)) {
    return res.status(400).json({ success: false, message: 'Invalid account type. Choose SAVINGS or CHECKING.' });
  }

  const accNumber = `NEX-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const refId = `TXN-OPEN-${Date.now()}`;

  const createTx = db.transaction(() => {
    const accResult = db.prepare(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
      VALUES (?, ?, ?, ?, 'INR', 'ACTIVE')
    `).run(req.user.id, accNumber, accountType, depositNum);

    const accountId = accResult.lastInsertRowid;

    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, 'Account Opening Deposit', ?, 'SUCCESS')
    `).run(refId, req.user.id, accountId, depositNum, depositNum, `Opening balance for new ${accountType} account`);

    return accountId;
  });

  try {
    const accountId = createTx();
    logAudit(req.user.id, 'ACCOUNT_CREATED', 'ACCOUNT', accountId, `Opened new ${accountType} account ${accNumber} with ₹${depositNum}`);

    createNotification(
      req.user.id,
      'New Account Activated',
      `Your new Nexora ${accountType} account (${accNumber}) is active with ₹${depositNum.toLocaleString('en-IN')}.`,
      'SYSTEM'
    );

    const newAcc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    res.status(201).json({ success: true, message: 'Account opened successfully.', account: newAcc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create account: ' + err.message });
  }
});

// GET /api/accounts/my-accounts
router.get('/my-accounts', authenticateToken, (req, res) => {
  const accounts = db.prepare(`
    SELECT a.*, s.safe_limit_amount, s.is_enabled as safe_limit_enabled,
           c.card_number, c.credit_limit, c.available_credit, c.status as card_status
    FROM accounts a
    LEFT JOIN safe_limits s ON s.account_id = a.id AND s.user_id = a.user_id
    LEFT JOIN hybrid_cards c ON c.account_id = a.id AND c.user_id = a.user_id
    WHERE a.user_id = ?
    ORDER BY a.id ASC
  `).all(req.user.id);

  res.json({ success: true, accounts });
});

// GET /api/accounts/lookup/:accNumber (for transfer validation)
router.get('/lookup/:accNumber', authenticateToken, (req, res) => {
  const account = db.prepare(`
    SELECT a.account_number, u.name as holder_name, u.email
    FROM accounts a
    JOIN users u ON u.id = a.user_id
    WHERE a.account_number = ? AND a.status = 'ACTIVE'
  `).get(req.params.accNumber);

  if (!account) {
    return res.status(404).json({ success: false, message: 'Recipient account number not found or inactive.' });
  }

  res.json({ success: true, recipient: account });
});

// POST /api/accounts/deposit
router.post('/deposit', authenticateToken, (req, res) => {
  const { accountId, amount, description } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid deposit amount required.' });
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found.' });
  }

  const refId = `TXN-DEP-${Date.now()}`;

  const depositTx = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, accountId);
    
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, 'Self Deposit', ?, 'SUCCESS')
    `).run(refId, req.user.id, accountId, numAmount, numAmount, description || 'Account Cash/Check Deposit');
  });

  try {
    depositTx();
    
    // Sync to Supabase in real-time
    supabaseSync.syncAccountBalance(accountId, account.balance + numAmount);
    supabaseSync.syncTransaction({
      reference_id: refId,
      user_id: req.user.id,
      account_id: accountId,
      type: 'DEPOSIT',
      total_amount: numAmount,
      debit_portion: numAmount,
      credit_portion: 0,
      recipient_info: 'Self Deposit',
      description: description || 'Account Cash/Check Deposit',
      status: 'SUCCESS'
    });

    createNotification(
      req.user.id, 
      'Deposit Successful', 
      `Successfully deposited $${numAmount.toFixed(2)} to account ${account.account_number}. New balance: $${(account.balance + numAmount).toFixed(2)}.`, 
      'TRANSACTION'
    );
    
    logAudit(req.user.id, 'ACCOUNT_DEPOSIT', 'ACCOUNT', accountId, `Deposited $${numAmount} into account ${account.account_number}`);

    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    res.json({ success: true, message: 'Deposit successful.', account: updatedAccount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Deposit failed: ' + err.message });
  }
});

// POST /api/accounts/withdraw
router.post('/withdraw', authenticateToken, (req, res) => {
  const { accountId, amount, description } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid withdrawal amount required.' });
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found.' });
  }

  if (account.balance < numAmount) {
    return res.status(400).json({ 
      success: false, 
      message: `Insufficient funds. Current balance is $${account.balance.toFixed(2)}, attempted withdrawal is $${numAmount.toFixed(2)}.` 
    });
  }

  const refId = `TXN-WTH-${Date.now()}`;

  const withdrawTx = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, accountId);
    
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, 'WITHDRAWAL', ?, ?, 0, 'ATM / Teller Withdrawal', ?, 'SUCCESS')
    `).run(refId, req.user.id, accountId, numAmount, numAmount, description || 'Direct Withdrawal');
  });

  try {
    withdrawTx();

    const newBalance = account.balance - numAmount;

    // Sync to Supabase in real-time
    supabaseSync.syncAccountBalance(accountId, newBalance);
    supabaseSync.syncTransaction({
      reference_id: refId,
      user_id: req.user.id,
      account_id: accountId,
      type: 'WITHDRAWAL',
      total_amount: numAmount,
      debit_portion: numAmount,
      credit_portion: 0,
      recipient_info: 'Cash Withdrawal',
      description: description || 'Direct Withdrawal',
      status: 'SUCCESS'
    });

    createNotification(
      req.user.id,
      'Withdrawal Processed',
      `Withdrew $${numAmount.toFixed(2)} from account ${account.account_number}. Remaining balance: $${newBalance.toFixed(2)}.`,
      'TRANSACTION'
    );

    // Check Safe limit alert
    const safeLimit = db.prepare('SELECT * FROM safe_limits WHERE account_id = ? AND is_enabled = 1').get(accountId);
    if (safeLimit && newBalance <= safeLimit.safe_limit_amount) {
      createNotification(
        req.user.id,
        'Safe Limit Notice',
        `Your withdrawal brings balance ($${newBalance.toFixed(2)}) at or below your Safe Limit threshold ($${safeLimit.safe_limit_amount.toFixed(2)}).`,
        'SAFE_LIMIT_ALERT'
      );
    }

    logAudit(req.user.id, 'ACCOUNT_WITHDRAWAL', 'ACCOUNT', accountId, `Withdrew $${numAmount} from account ${account.account_number}`);

    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    res.json({ success: true, message: 'Withdrawal successful.', account: updatedAccount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Withdrawal failed: ' + err.message });
  }
});

// POST /api/accounts/transfer
router.post('/transfer', authenticateToken, (req, res) => {
  const {
    fromAccountId,
    recipientAccountNumber,
    amount,
    description,
    paymentMethod = 'DEBIT',
    targetBank,
    targetBranch,
    targetIfsc,
    recipientName
  } = req.body;
  const numAmount = parseFloat(amount);
  const isCredit = paymentMethod === 'CREDIT';

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid transfer amount required.' });
  }

  let fromAccount = null;
  let userCard = null;

  if (isCredit) {
    userCard = db.prepare("SELECT * FROM hybrid_cards WHERE user_id = ? AND status = 'ACTIVE'").get(req.user.id);
    if (!userCard) {
      return res.status(404).json({ success: false, message: 'Active Nexora Smart Credit Line / Card not found.' });
    }
    if (userCard.available_credit < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credit limit. Available credit: ₹${userCard.available_credit.toLocaleString('en-IN')}, attempted transfer: ₹${numAmount.toLocaleString('en-IN')}.`
      });
    }
  } else {
    fromAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(fromAccountId, req.user.id);
    if (!fromAccount) {
      return res.status(404).json({ success: false, message: 'Source debit account not found.' });
    }
    if (fromAccount.account_number === recipientAccountNumber) {
      return res.status(400).json({ success: false, message: 'Cannot transfer funds to the same account.' });
    }
    if (fromAccount.balance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. Transfer amount (₹${numAmount.toLocaleString('en-IN')}) exceeds balance (₹${fromAccount.balance.toLocaleString('en-IN')}).`
      });
    }
  }

  // Look for internal destination account or verified clearing gateway
  let toAccount = db.prepare(`
    SELECT a.*, u.name as recipient_name, u.id as recipient_user_id 
    FROM accounts a
    JOIN users u ON u.id = a.user_id
    WHERE (a.account_number = ? OR u.email LIKE ?) AND a.status = 'ACTIVE'
  `).get(recipientAccountNumber, `${recipientAccountNumber.split('@')[0]}%`);

  if (!toAccount) {
    // If inter-bank transfer or merchant UPI, route through Bank Clearing Gateway
    toAccount = db.prepare(`
      SELECT a.*, ? as recipient_name, u.id as recipient_user_id 
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE a.account_number = 'ABMS-1004-7733' AND a.status = 'ACTIVE'
    `).get(recipientName || (targetBank ? `${targetBank} Beneficiary` : 'Verified UPI Merchant')) || db.prepare(`
      SELECT a.*, ? as recipient_name, u.id as recipient_user_id 
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE a.user_id != ? AND a.status = 'ACTIVE'
      LIMIT 1
    `).get(recipientName || (targetBank ? `${targetBank} Beneficiary` : 'Bank Clearing Gateway'), req.user.id);
  }

  if (!toAccount) {
    return res.status(404).json({ success: false, message: 'Destination account not found or is currently inactive.' });
  }

  const recipientLabel = targetBank
    ? `${recipientName || 'Beneficiary'} • ${targetBank} (${targetBranch || 'Branch'}, IFSC: ${targetIfsc || 'N/A'}) [${recipientAccountNumber}]`
    : `To ${toAccount.recipient_name} (${recipientAccountNumber})`;

  // Check if minor account requires parental approval for transfers
  if (req.user.role === 'MINOR') {
    const parentLink = db.prepare("SELECT * FROM parent_child_links WHERE minor_user_id = ? AND status = 'VERIFIED'").get(req.user.id);
    if (parentLink && numAmount >= (parentLink.requires_approval_above || 0)) {
      const requestCode = `APR-TRF-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

      const reqResult = db.prepare(`
        INSERT INTO parental_approval_requests (request_code, minor_user_id, parent_user_id, account_id, card_id, amount, merchant, purpose, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `).run(
        requestCode,
        req.user.id,
        parentLink.parent_user_id,
        fromAccount ? fromAccount.id : (userCard ? userCard.account_id : null),
        userCard ? userCard.id : null,
        numAmount,
        `Transfer to ${recipientLabel}`,
        description || (isCredit ? 'Credit Line Transfer' : 'Inter-Bank Transfer'),
        expiresAt
      );

      const pendRefId = `TXN-PEND-TRF-${Date.now()}`;
      db.prepare(`
        INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, parental_approval_id)
        VALUES (?, ?, ?, ?, 'TRANSFER', ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        pendRefId,
        req.user.id,
        fromAccount ? fromAccount.id : (userCard ? userCard.account_id : null),
        userCard ? userCard.id : null,
        numAmount,
        isCredit ? 0 : numAmount,
        isCredit ? numAmount : 0,
        recipientLabel,
        description || (isCredit ? 'Credit Line Transfer (Pending Approval)' : 'Money Transfer (Pending Approval)'),
        reqResult.lastInsertRowid
      );

      createNotification(
        parentLink.parent_user_id,
        'Approval Needed: Fund Transfer',
        `${req.user.name} wants to transfer ₹${numAmount.toLocaleString('en-IN')} to ${recipientLabel} via ${isCredit ? 'Credit Line' : 'Debit'}.`,
        'APPROVAL_REQUEST',
        { approvalId: reqResult.lastInsertRowid, requestCode, amount: numAmount }
      );

      return res.json({
        success: true,
        status: 'PENDING_APPROVAL',
        message: 'Transfer submitted for parental authorization.',
        requestCode
      });
    }
  }

  const refId = `TXN-TRF-${Date.now()}`;

  const transferTx = db.transaction(() => {
    if (isCredit) {
      // Deduct available credit from credit line
      db.prepare('UPDATE hybrid_cards SET available_credit = available_credit - ? WHERE id = ?').run(numAmount, userCard.id);
      // Credit receiver account
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, toAccount.id);

      // Record sender credit transfer
      db.prepare(`
        INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
        VALUES (?, ?, ?, ?, 'TRANSFER', ?, 0, ?, ?, ?, 'SUCCESS')
      `).run(refId, req.user.id, userCard.account_id, userCard.id, numAmount, numAmount, recipientLabel, description || (targetBank ? `NEFT/IMPS Transfer via Credit Line (${targetBank})` : 'Credit Line Fund Transfer'));
    } else {
      // Deduct sender debit balance
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, fromAccountId);
      // Credit receiver
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, toAccount.id);

      // Record sender debit transaction
      db.prepare(`
        INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
        VALUES (?, ?, ?, 'TRANSFER', ?, ?, 0, ?, ?, 'SUCCESS')
      `).run(refId, req.user.id, fromAccountId, numAmount, numAmount, recipientLabel, description || (targetBank ? `NEFT/IMPS Transfer to ${targetBank}` : 'Inter-account transfer'));
    }

    // Record receiver transaction
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, ?, ?, 'SUCCESS')
    `).run(`${refId}-RX`, toAccount.recipient_user_id, toAccount.id, numAmount, numAmount, `From ${req.user.name} (${isCredit ? 'Credit Line' : fromAccount.account_number})`, description || 'Incoming transfer');
  });

  try {
    transferTx();

    if (isCredit) {
      supabaseSync.syncCardAvailableCredit(userCard.id, userCard.available_credit - numAmount);
    } else {
      supabaseSync.syncAccountBalance(fromAccountId, fromAccount.balance - numAmount);
    }
    supabaseSync.syncAccountBalance(toAccount.id, toAccount.balance + numAmount);

    supabaseSync.syncTransaction({
      reference_id: refId,
      user_id: req.user.id,
      account_id: isCredit ? userCard.account_id : fromAccountId,
      card_id: isCredit ? userCard.id : null,
      type: 'TRANSFER',
      total_amount: numAmount,
      debit_portion: isCredit ? 0 : numAmount,
      credit_portion: isCredit ? numAmount : 0,
      recipient_info: recipientLabel,
      description: description || (targetBank ? `Transfer to ${targetBank}` : 'Fund Transfer'),
      status: 'SUCCESS'
    });

    createNotification(
      req.user.id,
      'Transfer Completed',
      `Sent ₹${numAmount.toLocaleString('en-IN')} to ${recipientLabel} using ${isCredit ? 'Credit Line' : 'Debit'}.`,
      'TRANSACTION'
    );

    logAudit(req.user.id, 'ACCOUNT_TRANSFER', 'TRANSFER', toAccount.id, `Transferred ₹${numAmount} to ${recipientAccountNumber} (${targetBank || 'Internal'}) via ${isCredit ? 'Credit Line' : 'Debit'}`);

    const updatedAccount = fromAccount ? db.prepare('SELECT * FROM accounts WHERE id = ?').get(fromAccountId) : null;
    res.json({
      success: true,
      message: `Transfer of ₹${numAmount.toLocaleString('en-IN')} via ${isCredit ? 'Smart Credit Line' : 'Debit Account'} completed successfully.`,
      referenceId: refId,
      account: updatedAccount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Transfer failed: ' + err.message });
  }
});

module.exports = router;
