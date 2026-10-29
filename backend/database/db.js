const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'abms.db');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for high performance and durability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('CUSTOMER', 'PARENT', 'MINOR', 'ADMIN')),
      dob TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'SUSPENDED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_number TEXT UNIQUE NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'SAVINGS' CHECK(account_type IN ('SAVINGS', 'CHECKING')),
      balance REAL NOT NULL DEFAULT 0.0,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parent_child_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      minor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship TEXT DEFAULT 'Parent',
      requires_approval_above REAL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK(status IN ('PENDING', 'VERIFIED', 'REVOKED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(parent_user_id, minor_user_id)
    );

    CREATE TABLE IF NOT EXISTS hybrid_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_number TEXT UNIQUE NOT NULL,
      card_holder_name TEXT NOT NULL,
      expiry_month INTEGER NOT NULL,
      expiry_year INTEGER NOT NULL,
      cvv TEXT NOT NULL,
      pin TEXT NOT NULL DEFAULT '1234',
      credit_limit REAL NOT NULL DEFAULT 2000.0,
      available_credit REAL NOT NULL DEFAULT 2000.0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'BLOCKED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS safe_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      safe_limit_amount REAL NOT NULL DEFAULT 300.0,
      is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0, 1)),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, account_id)
    );

    CREATE TABLE IF NOT EXISTS parental_approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      minor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      card_id INTEGER REFERENCES hybrid_cards(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      merchant TEXT NOT NULL,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
      rejection_reason TEXT,
      expires_at DATETIME NOT NULL,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      card_id INTEGER REFERENCES hybrid_cards(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'HYBRID_CARD_PURCHASE', 'CREDIT_REPAYMENT')),
      total_amount REAL NOT NULL,
      debit_portion REAL NOT NULL DEFAULT 0.0,
      credit_portion REAL NOT NULL DEFAULT 0.0,
      recipient_info TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'PENDING_APPROVAL', 'REJECTED', 'EXPIRED', 'FAILED')),
      failure_reason TEXT,
      parental_approval_id INTEGER REFERENCES parental_approval_requests(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      requested_amount REAL NOT NULL,
      safe_limit_active INTEGER NOT NULL DEFAULT 0,
      safe_limit_value REAL NOT NULL DEFAULT 0.0,
      debit_balance_before REAL NOT NULL,
      debit_deducted REAL NOT NULL,
      debit_balance_after REAL NOT NULL,
      credit_limit_before REAL NOT NULL,
      credit_deducted REAL NOT NULL,
      credit_limit_after REAL NOT NULL,
      allocation_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'SYSTEM' CHECK(type IN ('TRANSACTION', 'APPROVAL_REQUEST', 'SAFE_LIMIT_ALERT', 'LOW_CREDIT', 'SYSTEM')),
      is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credit_repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id INTEGER NOT NULL REFERENCES hybrid_cards(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'DEBIT_ACCOUNT',
      reference_id TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supported_banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_code TEXT UNIQUE NOT NULL,
      bank_name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      category TEXT DEFAULT 'Public Sector Bank',
      logo_color TEXT DEFAULT '#1d4ed8',
      status TEXT DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS bank_branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_code TEXT NOT NULL REFERENCES supported_banks(bank_code) ON DELETE CASCADE,
      branch_name TEXT NOT NULL,
      branch_code TEXT NOT NULL,
      ifsc_code TEXT UNIQUE NOT NULL,
      micr_code TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe table migrations for existing database files
  try {
    db.exec('ALTER TABLE credit_repayments ADD COLUMN reference_id TEXT');
  } catch (e) {
    // Column already exists
  }

  seedInitialData();
  seedBanksAndBranches();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  const salt = bcrypt.genSaltSync(10);
  const commonPassword = bcrypt.hashSync('bank1234', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, dob, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
    VALUES (?, ?, ?, ?, 'INR', 'ACTIVE')
  `);

  const insertCard = db.prepare(`
    INSERT INTO hybrid_cards (account_id, user_id, card_number, card_holder_name, expiry_month, expiry_year, cvv, pin, credit_limit, available_credit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertSafeLimit = db.prepare(`
    INSERT INTO safe_limits (user_id, account_id, safe_limit_amount, is_enabled)
    VALUES (?, ?, ?, 1)
  `);

  const insertLink = db.prepare(`
    INSERT INTO parent_child_links (parent_user_id, minor_user_id, relationship, requires_approval_above, status)
    VALUES (?, ?, ?, ?, 'VERIFIED')
  `);

  const insertTx = db.prepare(`
    INSERT INTO transactions (reference_id, user_id, account_id, card_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')
  `);

  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (?, ?, ?, ?, 0)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // 1. Admin User
    const admin = insertUser.run('System Administrator', 'admin@abms.bank', commonPassword, 'ADMIN', '1985-04-12', '+1 (555) 010-0001');

    // 2. Parent User: John Davis
    const parent = insertUser.run('John Davis', 'parent@abms.bank', commonPassword, 'PARENT', '1980-08-20', '+1 (555) 010-0002');
    const parentAcc = insertAccount.run(parent.lastInsertRowid, 'ABMS-1002-8841', 'SAVINGS', 6500.00);
    const parentCard = insertCard.run(parentAcc.lastInsertRowid, parent.lastInsertRowid, '4152889012345678', 'JOHN DAVIS', 11, 2029, '842', '1234', 5000.0, 4200.0);
    insertSafeLimit.run(parent.lastInsertRowid, parentAcc.lastInsertRowid, 1000.00);

    // 3. Minor User: Leo Davis (Age 15)
    const minor = insertUser.run('Leo Davis (Minor)', 'minor@abms.bank', commonPassword, 'MINOR', '2011-03-15', '+1 (555) 010-0003');
    const minorAcc = insertAccount.run(minor.lastInsertRowid, 'ABMS-1003-9912', 'SAVINGS', 350.00);
    const minorCard = insertCard.run(minorAcc.lastInsertRowid, minor.lastInsertRowid, '4152991098765432', 'LEO DAVIS', 6, 2028, '319', '5678', 300.0, 300.0);
    insertSafeLimit.run(minor.lastInsertRowid, minorAcc.lastInsertRowid, 50.00);

    // Link Parent & Minor (approval required for transactions above $25 or all)
    insertLink.run(parent.lastInsertRowid, minor.lastInsertRowid, 'Father', 25.00);

    // 4. Regular Adult Customer: Sarah Connor
    const customer = insertUser.run('Sarah Connor', 'customer@abms.bank', commonPassword, 'CUSTOMER', '1992-12-05', '+1 (555) 010-0004');
    const custAcc = insertAccount.run(customer.lastInsertRowid, 'ABMS-1004-7733', 'CHECKING', 1250.00);
    const custCard = insertCard.run(custAcc.lastInsertRowid, customer.lastInsertRowid, '4152773344118822', 'SARAH CONNOR', 9, 2030, '491', '4321', 3000.0, 2450.0);
    insertSafeLimit.run(customer.lastInsertRowid, custAcc.lastInsertRowid, 400.00);

    // Seed some initial realistic transactions
    insertTx.run('TXN-INIT-001', customer.lastInsertRowid, custAcc.lastInsertRowid, null, 'DEPOSIT', 1500.00, 1500.00, 0.0, 'Payroll Direct Deposit', 'Initial Salary Deposit');
    insertTx.run('TXN-INIT-002', customer.lastInsertRowid, custAcc.lastInsertRowid, custCard.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 550.00, 0.0, 550.00, 'Tech Superstore', 'Electronics Purchase');
    insertTx.run('TXN-INIT-003', parent.lastInsertRowid, parentAcc.lastInsertRowid, null, 'DEPOSIT', 7000.00, 7000.00, 0.0, 'Wire Transfer', 'Account Funding');
    insertTx.run('TXN-INIT-004', parent.lastInsertRowid, parentAcc.lastInsertRowid, parentCard.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 800.00, 0.0, 800.00, 'Airlines Inc', 'Flight Booking');

    // Seed a pending approval request for demonstration of Parental Approval
    const pendingApproval = db.prepare(`
      INSERT INTO parental_approval_requests (request_code, minor_user_id, parent_user_id, account_id, card_id, amount, merchant, purpose, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now', '+15 minutes'))
    `).run('APR-9842', minor.lastInsertRowid, parent.lastInsertRowid, minorAcc.lastInsertRowid, minorCard.lastInsertRowid, 65.00, 'Epic Games & Steam Store', 'Online Gaming Subscription & Game DLC');

    insertNotif.run(parent.lastInsertRowid, 'Parental Approval Required', 'Leo requested authorization for a $65.00 payment at Epic Games & Steam Store.', 'APPROVAL_REQUEST');
    insertNotif.run(minor.lastInsertRowid, 'Payment Pending Parent Approval', 'Your payment of $65.00 at Epic Games & Steam Store was submitted to John Davis for authorization.', 'APPROVAL_REQUEST');
    // 5. Featured Customer: Alex Mathew (Nexora Bank Premium Customer)
    const alex = insertUser.run('Alex Mathew', 'alex@nexora.bank', commonPassword, 'CUSTOMER', '1994-06-18', '+91 98765 43210');
    const alexSavings = insertAccount.run(alex.lastInsertRowid, 'NEX-4582-8821', 'SAVINGS', 102450.00);
    const alexCurrent = insertAccount.run(alex.lastInsertRowid, 'NEX-7291-4412', 'CHECKING', 22300.00);
    const alexFd = insertAccount.run(alex.lastInsertRowid, 'NEX-1034-9931', 'SAVINGS', 24000.00);
    const alexCard = insertCard.run(alexSavings.lastInsertRowid, alex.lastInsertRowid, '4152778899004582', 'ALEX MATHEW', 10, 2030, '732', '1234', 200000.0, 141380.0);
    insertSafeLimit.run(alex.lastInsertRowid, alexSavings.lastInsertRowid, 15000.00);

    insertTx.run('TXN-NEX-001', alex.lastInsertRowid, alexSavings.lastInsertRowid, alexCard.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 2499.00, 2499.00, 0, 'Amazon India', 'Online Payment');
    insertTx.run('TXN-NEX-002', alex.lastInsertRowid, alexSavings.lastInsertRowid, null, 'DEPOSIT', 35000.00, 35000.00, 0, 'Acme Technologies', 'Salary Credit');
    insertTx.run('TXN-NEX-003', alex.lastInsertRowid, alexSavings.lastInsertRowid, null, 'WITHDRAWAL', 1240.00, 1240.00, 0, 'Kerala Electricity Board', 'Electricity Bill');
    insertTx.run('TXN-NEX-004', alex.lastInsertRowid, alexSavings.lastInsertRowid, null, 'TRANSFER', 5000.00, 5000.00, 0, 'Rahul S', 'Money Transfer');
    insertTx.run('TXN-NEX-005', alex.lastInsertRowid, alexSavings.lastInsertRowid, alexCard.lastInsertRowid, 'HYBRID_CARD_PURCHASE', 649.00, 649.00, 0, 'Netflix', 'Subscription');
    insertTx.run('TXN-NEX-006', alex.lastInsertRowid, alexSavings.lastInsertRowid, null, 'WITHDRAWAL', 4000.00, 4000.00, 0, 'Nexora Bank ATM', 'ATM Withdrawal');

    insertNotif.run(customer.lastInsertRowid, 'Welcome to ABMS Smart Banking', 'Your Smart Hybrid Card is active with $3,000 credit limit and $400 Safe Limit protection.', 'SYSTEM');
    insertNotif.run(alex.lastInsertRowid, 'Welcome to Nexora Bank', 'Your Nexora Platinum account is active. Manage your balances, transfers, and hybrid card limits anytime.', 'SYSTEM');

    insertAudit.run(admin.lastInsertRowid, 'SYSTEM_INITIALIZATION', 'SYSTEM', '1', 'ABMS Database seeded with initial roles and accounts');
  });

  transaction();
  console.log('✅ ABMS Database successfully initialized and seeded.');
}

function seedBanksAndBranches() {
  const bankCount = db.prepare('SELECT COUNT(*) as count FROM supported_banks').get().count;
  if (bankCount > 0) {
    return; // Already populated
  }

  const REAL_BANKS = [
    {
      bank_code: 'SBI',
      bank_name: 'State Bank of India',
      short_name: 'SBI',
      category: 'Public Sector Bank',
      logo_color: '#280071',
      branches: [
        { branch_name: 'Mumbai Main Branch', branch_code: '000300', ifsc_code: 'SBIN0000300', micr_code: '400002010', city: 'Mumbai', state: 'Maharashtra', address: 'Mumbai Samachar Marg, Horniman Circle, Fort, Mumbai - 400001' },
        { branch_name: 'New Delhi Main Branch', branch_code: '000691', ifsc_code: 'SBIN0000691', micr_code: '110002087', city: 'New Delhi', state: 'Delhi', address: '11, Parliament Street, New Delhi - 110001' },
        { branch_name: 'Bangalore Main Branch', branch_code: '000813', ifsc_code: 'SBIN0000813', micr_code: '560002002', city: 'Bengaluru', state: 'Karnataka', address: 'Post Box No. 16, St. Marks Road, Bengaluru - 560001' },
        { branch_name: 'Kochi Main Branch', branch_code: '000105', ifsc_code: 'SBIN0000105', micr_code: '682002002', city: 'Kochi', state: 'Kerala', address: 'Shanmugham Road, Marine Drive, Kochi - 682031' },
        { branch_name: 'Chennai Main Branch', branch_code: '000800', ifsc_code: 'SBIN0000800', micr_code: '600002002', city: 'Chennai', state: 'Tamil Nadu', address: '22, Rajaji Salai, Chennai - 600001' },
        { branch_name: 'Kolkata Main Branch', branch_code: '000001', ifsc_code: 'SBIN0000001', micr_code: '700002021', city: 'Kolkata', state: 'West Bengal', address: '1, Strand Road, Samriddhi Bhavan, Kolkata - 700001' },
        { branch_name: 'Hyderabad Main Branch', branch_code: '000847', ifsc_code: 'SBIN0000847', micr_code: '500002002', city: 'Hyderabad', state: 'Telangana', address: 'Bank Street, Koti, Hyderabad - 500095' }
      ]
    },
    {
      bank_code: 'HDFC',
      bank_name: 'HDFC Bank',
      short_name: 'HDFC',
      category: 'Private Sector Bank',
      logo_color: '#004c8f',
      branches: [
        { branch_name: 'Mumbai - Fort', branch_code: '000060', ifsc_code: 'HDFC0000060', micr_code: '400240015', city: 'Mumbai', state: 'Maharashtra', address: 'Maneckji Wadia Building, Nanik Motwani Marg, Fort, Mumbai - 400001' },
        { branch_name: 'Connaught Place', branch_code: '000003', ifsc_code: 'HDFC0000003', micr_code: '110240001', city: 'New Delhi', state: 'Delhi', address: 'KG Marg, Connaught Place, New Delhi - 110001' },
        { branch_name: 'Richmond Road', branch_code: '000009', ifsc_code: 'HDFC0000009', micr_code: '560240002', city: 'Bengaluru', state: 'Karnataka', address: 'Salco Centre, Richmond Road, Bengaluru - 560025' },
        { branch_name: 'Ravipuram Kochi', branch_code: '000020', ifsc_code: 'HDFC0000020', micr_code: '682240002', city: 'Kochi', state: 'Kerala', address: 'SL Plaza, Palarivattom / MG Road, Ravipuram, Kochi - 682016' },
        { branch_name: 'Anna Salai Chennai', branch_code: '000004', ifsc_code: 'HDFC0000004', micr_code: '600240003', city: 'Chennai', state: 'Tamil Nadu', address: 'ITC Centre, 759 Anna Salai, Chennai - 600002' }
      ]
    },
    {
      bank_code: 'ICICI',
      bank_name: 'ICICI Bank',
      short_name: 'ICICI',
      category: 'Private Sector Bank',
      logo_color: '#b02a30',
      branches: [
        { branch_name: 'Nariman Point', branch_code: '000004', ifsc_code: 'ICIC0000004', micr_code: '400229002', city: 'Mumbai', state: 'Maharashtra', address: '215 Free Press House, Nariman Point, Mumbai - 400021' },
        { branch_name: 'Connaught Place', branch_code: '000007', ifsc_code: 'ICIC0000007', micr_code: '110229002', city: 'New Delhi', state: 'Delhi', address: '9A Phelps Building, Connaught Place, New Delhi - 110001' },
        { branch_name: 'MG Road Bengaluru', branch_code: '000002', ifsc_code: 'ICIC0000002', micr_code: '560229002', city: 'Bengaluru', state: 'Karnataka', address: 'Raheja Towers, MG Road, Bengaluru - 560001' },
        { branch_name: 'MG Road Kochi', branch_code: '000055', ifsc_code: 'ICIC0000055', micr_code: '682229002', city: 'Kochi', state: 'Kerala', address: 'Emgee Square, MG Road, Ernakulam, Kochi - 682035' }
      ]
    },
    {
      bank_code: 'AXIS',
      bank_name: 'Axis Bank',
      short_name: 'Axis',
      category: 'Private Sector Bank',
      logo_color: '#97144d',
      branches: [
        { branch_name: 'Corporate Banking Mumbai', branch_code: '000004', ifsc_code: 'UTIB0000004', micr_code: '400211002', city: 'Mumbai', state: 'Maharashtra', address: 'Sir PM Road, Fort, Mumbai - 400001' },
        { branch_name: 'Statesman House New Delhi', branch_code: '000007', ifsc_code: 'UTIB0000007', micr_code: '110211002', city: 'New Delhi', state: 'Delhi', address: '148 Barakhamba Road, Connaught Place, New Delhi - 110001' },
        { branch_name: 'MG Road Bengaluru', branch_code: '000009', ifsc_code: 'UTIB0000009', micr_code: '560211002', city: 'Bengaluru', state: 'Karnataka', address: 'MG Road, Bengaluru - 560001' },
        { branch_name: 'Panampilly Nagar Kochi', branch_code: '000087', ifsc_code: 'UTIB0000087', micr_code: '682211002', city: 'Kochi', state: 'Kerala', address: 'Main Avenue, Panampilly Nagar, Kochi - 682036' }
      ]
    },
    {
      bank_code: 'PNB',
      bank_name: 'Punjab National Bank',
      short_name: 'PNB',
      category: 'Public Sector Bank',
      logo_color: '#a20a3a',
      branches: [
        { branch_name: 'Parliament Street New Delhi', branch_code: '000100', ifsc_code: 'PUNB0000100', micr_code: '110024001', city: 'New Delhi', state: 'Delhi', address: 'PNB House, 5 Sansad Marg, New Delhi - 110001' },
        { branch_name: 'Fort Branch Mumbai', branch_code: '000200', ifsc_code: 'PUNB0000200', micr_code: '400024002', city: 'Mumbai', state: 'Maharashtra', address: 'Sir PM Road, Fort, Mumbai - 400001' }
      ]
    },
    {
      bank_code: 'BOB',
      bank_name: 'Bank of Baroda',
      short_name: 'Bank of Baroda',
      category: 'Public Sector Bank',
      logo_color: '#f15a24',
      branches: [
        { branch_name: 'Mumbai Main Branch', branch_code: 'MUMBAI', ifsc_code: 'BARB0MUMBAI', micr_code: '400012002', city: 'Mumbai', state: 'Maharashtra', address: 'Horniman Circle, Fort, Mumbai - 400001' },
        { branch_name: 'Parliament Street New Delhi', branch_code: 'DELPAR', ifsc_code: 'BARB0DELPAR', micr_code: '110012002', city: 'New Delhi', state: 'Delhi', address: '16 Sansad Marg, New Delhi - 110001' }
      ]
    },
    {
      bank_code: 'CANARA',
      bank_name: 'Canara Bank',
      short_name: 'Canara',
      category: 'Public Sector Bank',
      logo_color: '#0090d0',
      branches: [
        { branch_name: 'Town Hall Bengaluru', branch_code: '000401', ifsc_code: 'CNRB0000401', micr_code: '560015002', city: 'Bengaluru', state: 'Karnataka', address: 'JC Road, Town Hall, Bengaluru - 560002' },
        { branch_name: 'Fort Mumbai', branch_code: '000001', ifsc_code: 'CNRB0000001', micr_code: '400015002', city: 'Mumbai', state: 'Maharashtra', address: 'Ballard Estate, Fort, Mumbai - 400001' }
      ]
    }
  ];

  const insertBank = db.prepare(`
    INSERT INTO supported_banks (bank_code, bank_name, short_name, category, logo_color, status)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertBranch = db.prepare(`
    INSERT INTO bank_branches (bank_code, branch_name, branch_code, ifsc_code, micr_code, city, state, address, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const seedTx = db.transaction(() => {
    for (const bank of REAL_BANKS) {
      insertBank.run(bank.bank_code, bank.bank_name, bank.short_name, bank.category, bank.logo_color);
      for (const branch of bank.branches) {
        insertBranch.run(
          bank.bank_code,
          branch.branch_name,
          branch.branch_code,
          branch.ifsc_code,
          branch.micr_code,
          branch.city,
          branch.state,
          branch.address
        );
      }
    }
  });

  seedTx();
  console.log('🏛️ Supported banks and genuine branch network successfully seeded.');
}

initDatabase();

module.exports = db;
