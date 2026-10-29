const supabase = require('../supabase');
const bcrypt = require('bcryptjs');

async function seedSupabase() {
  console.log('🌱 Starting Supabase database seeding...');

  const { data: existingUsers, error: checkErr } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (checkErr) {
    console.error('❌ Error checking users table:', checkErr.message);
    return;
  }

  if (existingUsers && existingUsers.length > 0) {
    console.log('ℹ️ Users table already has data. Skipping seed.');
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const commonPassword = bcrypt.hashSync('bank1234', salt);

  // 1. Insert Users
  const { data: users, error: userErr } = await supabase
    .from('users')
    .insert([
      { name: 'System Administrator', email: 'admin@abms.bank', password: commonPassword, role: 'ADMIN', dob: '1985-04-12', phone: '+1 (555) 010-0001', status: 'ACTIVE' },
      { name: 'John Davis', email: 'parent@abms.bank', password: commonPassword, role: 'PARENT', dob: '1980-08-20', phone: '+1 (555) 010-0002', status: 'ACTIVE' },
      { name: 'Leo Davis (Minor)', email: 'minor@abms.bank', password: commonPassword, role: 'MINOR', dob: '2011-03-15', phone: '+1 (555) 010-0003', status: 'ACTIVE' },
      { name: 'Sarah Connor', email: 'customer@abms.bank', password: commonPassword, role: 'CUSTOMER', dob: '1992-12-05', phone: '+1 (555) 010-0004', status: 'ACTIVE' },
      { name: 'Alex Mathew', email: 'alex@nexora.bank', password: commonPassword, role: 'CUSTOMER', dob: '1994-06-18', phone: '+91 98765 43210', status: 'ACTIVE' }
    ])
    .select();

  if (userErr) {
    console.error('❌ Error inserting users:', userErr.message);
    return;
  }

  const admin = users.find(u => u.email === 'admin@abms.bank');
  const parent = users.find(u => u.email === 'parent@abms.bank');
  const minor = users.find(u => u.email === 'minor@abms.bank');
  const customer = users.find(u => u.email === 'customer@abms.bank');
  const alex = users.find(u => u.email === 'alex@nexora.bank');

  // 2. Insert Accounts
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .insert([
      { user_id: parent.id, account_number: 'ABMS-1002-8841', account_type: 'SAVINGS', balance: 6500.00, currency: 'USD', status: 'ACTIVE' },
      { user_id: minor.id, account_number: 'ABMS-1003-9912', account_type: 'SAVINGS', balance: 350.00, currency: 'USD', status: 'ACTIVE' },
      { user_id: customer.id, account_number: 'ABMS-1004-7733', account_type: 'CHECKING', balance: 1250.00, currency: 'USD', status: 'ACTIVE' },
      { user_id: alex.id, account_number: 'NEX-4582-8821', account_type: 'SAVINGS', balance: 102450.00, currency: 'USD', status: 'ACTIVE' },
      { user_id: alex.id, account_number: 'NEX-7291-4412', account_type: 'CHECKING', balance: 22300.00, currency: 'USD', status: 'ACTIVE' }
    ])
    .select();

  if (accErr) {
    console.error('❌ Error inserting accounts:', accErr.message);
    return;
  }

  const parentAcc = accounts.find(a => a.account_number === 'ABMS-1002-8841');
  const minorAcc = accounts.find(a => a.account_number === 'ABMS-1003-9912');
  const custAcc = accounts.find(a => a.account_number === 'ABMS-1004-7733');
  const alexAcc = accounts.find(a => a.account_number === 'NEX-4582-8821');

  // 3. Insert Parent-Child Link
  await supabase.from('parent_child_links').insert([
    { parent_user_id: parent.id, minor_user_id: minor.id, relationship: 'Father', requires_approval_above: 25.00, status: 'VERIFIED' }
  ]);

  // 4. Insert Hybrid Cards
  const { data: cards } = await supabase
    .from('hybrid_cards')
    .insert([
      { account_id: parentAcc.id, user_id: parent.id, card_number: '4152889012345678', card_holder_name: 'JOHN DAVIS', expiry_month: 11, expiry_year: 2029, cvv: '842', pin: '1234', credit_limit: 5000.0, available_credit: 4200.0, status: 'ACTIVE' },
      { account_id: minorAcc.id, user_id: minor.id, card_number: '4152991098765432', card_holder_name: 'LEO DAVIS', expiry_month: 6, expiry_year: 2028, cvv: '319', pin: '5678', credit_limit: 300.0, available_credit: 300.0, status: 'ACTIVE' },
      { account_id: custAcc.id, user_id: customer.id, card_number: '4152773344118822', card_holder_name: 'SARAH CONNOR', expiry_month: 9, expiry_year: 2030, cvv: '491', pin: '4321', credit_limit: 3000.0, available_credit: 2450.0, status: 'ACTIVE' },
      { account_id: alexAcc.id, user_id: alex.id, card_number: '4152778899004582', card_holder_name: 'ALEX MATHEW', expiry_month: 10, expiry_year: 2030, cvv: '732', pin: '1234', credit_limit: 200000.0, available_credit: 141380.0, status: 'ACTIVE' }
    ])
    .select();

  // 5. Insert Safe Limits
  await supabase.from('safe_limits').insert([
    { user_id: parent.id, account_id: parentAcc.id, safe_limit_amount: 1000.00, is_enabled: true },
    { user_id: minor.id, account_id: minorAcc.id, safe_limit_amount: 50.00, is_enabled: true },
    { user_id: customer.id, account_id: custAcc.id, safe_limit_amount: 400.00, is_enabled: true },
    { user_id: alex.id, account_id: alexAcc.id, safe_limit_amount: 15000.00, is_enabled: true }
  ]);

  // 6. Insert Pending Parental Approval Demo Request
  const minorCard = cards ? cards.find(c => c.user_id === minor.id) : null;
  await supabase.from('parental_approval_requests').insert([
    {
      request_code: 'APR-9842',
      minor_user_id: minor.id,
      parent_user_id: parent.id,
      account_id: minorAcc.id,
      card_id: minorCard ? minorCard.id : null,
      amount: 65.00,
      merchant: 'Epic Games & Steam Store',
      purpose: 'Online Gaming Subscription & Game DLC',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  ]);

  console.log('✅ Supabase database successfully seeded with all initial demo users, cards, and accounts!');
}

seedSupabase().catch(err => console.error('Seeding error:', err));
