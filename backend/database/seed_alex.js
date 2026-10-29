const db = require('./db');
const bcrypt = require('bcryptjs');

function seedAlex() {
  const existingAlex = db.prepare('SELECT id FROM users WHERE email = ?').get('alex@nexora.bank');
  if (existingAlex) {
    console.log('Alex Mathew already exists with id:', existingAlex.id);
    return existingAlex.id;
  }

  const salt = bcrypt.genSaltSync(10);
  const commonPassword = bcrypt.hashSync('bank1234', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, dob, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertCard = db.prepare(`
    INSERT INTO hybrid_cards (account_id, user_id, card_number, card_holder_name, expiry_month, expiry_year, cvv, pin, credit_limit, available_credit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertSafeLimit = db.prepare(`
    INSERT INTO safe_limits (user_id, account_id, safe_limit_amount, is_enabled)
    VALUES (?, ?, ?, 1)
  `);

  const insertTx = db.prepare(`
    INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
  `);

  const tx = db.transaction(() => {
    const alex = insertUser.run('Alex Mathew', 'alex@nexora.bank', commonPassword, 'CUSTOMER', '1994-06-18', '+91 98765 43210');
    const alexId = alex.lastInsertRowid;

    // Accounts
    const savingsAcc = insertAccount.run(alexId, 'NEX-4582-8821', 'SAVINGS', 102450.00, 'INR');
    const currentAcc = insertAccount.run(alexId, 'NEX-7291-4412', 'CHECKING', 22300.00, 'INR');
    const fdAcc = insertAccount.run(alexId, 'NEX-1034-9931', 'SAVINGS', 24000.00, 'INR');

    // Hybrid Card
    const card = insertCard.run(savingsAcc.lastInsertRowid, alexId, '4152778899004582', 'ALEX MATHEW', 10, 2030, '732', '1234', 200000.00, 141380.00);

    // Safe Limit
    insertSafeLimit.run(alexId, savingsAcc.lastInsertRowid, 15000.00);

    // Transactions
    insertTx.run('TXN-NEX-001', alexId, savingsAcc.lastInsertRowid, card.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 2499.00, 2499.00, 0, 'Amazon India', 'Online Payment', '2025-10-27 14:32:00');
    insertTx.run('TXN-NEX-002', alexId, savingsAcc.lastInsertRowid, null, 'DEPOSIT', 35000.00, 35000.00, 0, 'Acme Technologies', 'Salary Credit', '2025-10-26 09:15:00');
    insertTx.run('TXN-NEX-003', alexId, savingsAcc.lastInsertRowid, null, 'WITHDRAWAL', 1240.00, 1240.00, 0, 'Kerala Electricity Board', 'Electricity Bill', '2025-10-24 18:45:00');
    insertTx.run('TXN-NEX-004', alexId, savingsAcc.lastInsertRowid, null, 'TRANSFER', 5000.00, 5000.00, 0, 'Rahul S', 'Money Transfer', '2025-10-22 11:20:00');
    insertTx.run('TXN-NEX-005', alexId, savingsAcc.lastInsertRowid, card.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 649.00, 649.00, 0, 'Netflix', 'Subscription', '2025-10-20 20:05:00');
    insertTx.run('TXN-NEX-006', alexId, savingsAcc.lastInsertRowid, null, 'WITHDRAWAL', 4000.00, 4000.00, 0, 'Nexora Bank ATM', 'ATM Withdrawal', '2025-10-18 16:10:00');

    console.log('Alex Mathew seeded successfully with ID:', alexId);
    return alexId;
  });

  return tx();
}

seedAlex();
