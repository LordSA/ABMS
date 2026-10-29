const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditService');
const { syncUser } = require('../services/supabaseSync');

const router = express.Router();

// Helper to generate unique account number
function generateAccountNumber() {
  return `ABMS-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Helper to generate 16-digit card number
function generateCardNumber() {
  let num = '4152';
  for (let i = 0; i < 3; i++) {
    num += Math.floor(1000 + Math.random() * 9000).toString();
  }
  return num;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  let lookupEmail = email ? email.trim().toLowerCase() : '';
  if (
    lookupEmail === 'student@nexora.bank' ||
    lookupEmail === 'student@abms.bank' ||
    lookupEmail === 'minor@nexora.bank' ||
    lookupEmail === 'minor@abms.bank' ||
    lookupEmail === 'leo@nexora.bank' ||
    lookupEmail === 'leo@abms.bank'
  ) {
    lookupEmail = 'minor@abms.bank';
  } else if (
    lookupEmail === 'parent@nexora.bank' ||
    lookupEmail === 'parent@abms.bank' ||
    lookupEmail === 'john@nexora.bank' ||
    lookupEmail === 'john@abms.bank'
  ) {
    lookupEmail = 'parent@abms.bank';
  } else if (
    lookupEmail === 'admin@nexora.bank' ||
    lookupEmail === 'admin@abms.bank'
  ) {
    lookupEmail = 'admin@abms.bank';
  } else if (
    lookupEmail === 'customer@nexora.bank' ||
    lookupEmail === 'customer@abms.bank' ||
    lookupEmail === 'alex@abms.bank'
  ) {
    lookupEmail = 'alex@nexora.bank';
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(lookupEmail);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ success: false, message: `Account is ${user.status}. Access denied.` });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, 'USER_LOGIN', 'USER', user.id, `User ${user.email} logged in successfully.`);

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    dob: user.dob,
    phone: user.phone,
    status: user.status
  };

  // Synchronize and gather user info in Supabase
  syncUser(safeUser);

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role = 'CUSTOMER', dob, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email is already registered.' });
  }

  // Calculate age if DOB provided
  let userRole = role;
  if (dob) {
    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (calculatedAge < 18 && userRole !== 'ADMIN') {
      userRole = 'MINOR';
    }
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const registerTx = db.transaction(() => {
    // 1. Create user
    const userStmt = db.prepare(`
      INSERT INTO users (name, email, password, role, dob, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `);
    const userResult = userStmt.run(name, email, hashedPassword, userRole, dob || null, phone || null);
    const userId = userResult.lastInsertRowid;

    // 2. Create default bank account
    const accNumber = generateAccountNumber();
    const initialDeposit = userRole === 'MINOR' ? 250.0 : 1000.0;
    const accStmt = db.prepare(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
      VALUES (?, ?, 'SAVINGS', ?, 'INR', 'ACTIVE')
    `);
    const accResult = accStmt.run(userId, accNumber, initialDeposit);
    const accountId = accResult.lastInsertRowid;

    // 3. Create Smart Hybrid Card
    const cardNum = generateCardNumber();
    const creditLimit = userRole === 'MINOR' ? 250.0 : 2500.0;
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const cardStmt = db.prepare(`
      INSERT INTO hybrid_cards (account_id, user_id, card_number, card_holder_name, expiry_month, expiry_year, cvv, pin, credit_limit, available_credit, status)
      VALUES (?, ?, ?, ?, 12, 2030, ?, '1234', ?, ?, 'ACTIVE')
    `);
    cardStmt.run(accountId, userId, cardNum, name.toUpperCase(), cvv, creditLimit, creditLimit);

    // 4. Create Safe Limit setting
    const safeLimitDefault = userRole === 'MINOR' ? 50.0 : 200.0;
    db.prepare(`
      INSERT INTO safe_limits (user_id, account_id, safe_limit_amount, is_enabled)
      VALUES (?, ?, ?, 1)
    `).run(userId, accountId, safeLimitDefault);

    // 5. Initial transaction log
    db.prepare(`
      INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
      VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, 'Welcome Bonus Deposit', 'Initial opening account credit', 'SUCCESS')
    `).run(`TXN-OPEN-${Date.now()}`, userId, accountId, initialDeposit, initialDeposit);

    return { userId, accNumber };
  });

  try {
    const { userId } = registerTx();
    logAudit(userId, 'USER_REGISTERED', 'USER', userId, `User registered: ${name} (${email}) as ${userRole}`);

    const newUser = db.prepare('SELECT id, name, email, role, dob, phone, status FROM users WHERE id = ?').get(userId);
    
    // Gather and sync newly registered user to Supabase
    syncUser(newUser, hashedPassword);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully with linked Hybrid Card and Safe Limit.',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/google (Google OAuth Login and Registration)
router.post('/google', async (req, res) => {
  try {
    const { credential, email, name } = req.body;
    let userEmail = email;
    let userName = name;

    // Decode Google ID Token if passed
    if (credential) {
      try {
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) {
          userEmail = decoded.email;
          userName = decoded.name || decoded.given_name || userName;
        }
      } catch (e) {
        console.warn('Google credential decode error:', e.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Google authentication did not provide a valid email.' });
    }

    userName = userName || userEmail.split('@')[0];

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);

    if (!user) {
      // Auto-provision user with bank account, hybrid card & safe limit
      const tempPassword = bcrypt.hashSync(`goog_${Date.now()}_${Math.random()}`, 10);
      const registerTx = db.transaction(() => {
        const userStmt = db.prepare(`
          INSERT INTO users (name, email, password, role, status)
          VALUES (?, ?, ?, 'CUSTOMER', 'ACTIVE')
        `);
        const userResult = userStmt.run(userName, userEmail, tempPassword);
        const userId = userResult.lastInsertRowid;

        const accNumber = generateAccountNumber();
        const initialDeposit = 1000.0;
        const accStmt = db.prepare(`
          INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
          VALUES (?, ?, 'SAVINGS', ?, 'INR', 'ACTIVE')
        `);
        const accResult = accStmt.run(userId, accNumber, initialDeposit);
        const accountId = accResult.lastInsertRowid;

        const cardNum = generateCardNumber();
        const creditLimit = 2500.0;
        const cvv = Math.floor(100 + Math.random() * 900).toString();
        db.prepare(`
          INSERT INTO hybrid_cards (account_id, user_id, card_number, card_holder_name, expiry_month, expiry_year, cvv, pin, credit_limit, available_credit, status)
          VALUES (?, ?, ?, ?, 12, 2030, ?, '1234', ?, ?, 'ACTIVE')
        `).run(accountId, userId, cardNum, userName.toUpperCase(), cvv, creditLimit, creditLimit);

        db.prepare(`
          INSERT INTO safe_limits (user_id, account_id, safe_limit_amount, is_enabled)
          VALUES (?, ?, 200.0, 1)
        `).run(userId, accountId);

        db.prepare(`
          INSERT INTO transactions (reference_id, user_id, account_id, type, total_amount, debit_portion, credit_portion, recipient_info, description, status)
          VALUES (?, ?, ?, 'DEPOSIT', ?, ?, 0, 'Google Sign-In Bonus', 'Initial opening account credit', 'SUCCESS')
        `).run(`TXN-GGL-${Date.now()}`, userId, accountId, initialDeposit, initialDeposit);

        return userId;
      });

      const newUserId = registerTx();
      user = db.prepare('SELECT id, name, email, role, dob, phone, status FROM users WHERE id = ?').get(newUserId);
      logAudit(user.id, 'GOOGLE_SIGNUP', 'USER', user.id, `User registered via Google OAuth: ${userEmail}`);
    } else {
      logAudit(user.id, 'GOOGLE_LOGIN', 'USER', user.id, `User logged in via Google OAuth: ${userEmail}`);
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      dob: user.dob,
      phone: user.phone,
      status: user.status
    };

    // Gather and sync user information to Supabase
    syncUser(safeUser);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Google authentication successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Google authentication failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/demo-users (helpful for instant live switching and testing)
router.get('/demo-users', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, dob, phone, status 
    FROM users 
    ORDER BY id ASC
  `).all();
  res.json({ success: true, demoUsers: users });
});

module.exports = router;
