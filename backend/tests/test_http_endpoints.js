const { spawn } = require('child_process');
const path = require('path');

const PORT = 5000;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Spawning backend server on port', PORT);
  const server = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: PORT.toString() },
    stdio: 'pipe'
  });

  server.stdout.on('data', data => {
    // console.log('[SERVER]', data.toString().trim());
  });

  server.stderr.on('data', data => {
    console.error('[SERVER ERR]', data.toString().trim());
  });

  await wait(2000);

  try {
    // 1. Login as Alex Mathew
    console.log('🔑 1. Logging in as alex@nexora.bank...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@nexora.bank', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      // Try bank1234
      const retryRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex@nexora.bank', password: 'bank1234' })
      });
      const retryData = await retryRes.json();
      if (!retryData.token) throw new Error('Login failed: ' + JSON.stringify(retryData));
      loginData.token = retryData.token;
      loginData.user = retryData.user;
    }
    const token = loginData.token;
    console.log('✅ Logged in successfully. Token acquired.');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Fetch Banks
    console.log('🏛️ 2. Fetching Supported Banks...');
    const banksRes = await fetch(`${BASE_URL}/accounts/banks`, { headers: authHeaders });
    const banksRaw = await banksRes.text();
    console.log('Banks response status:', banksRes.status, 'Body preview:', banksRaw.substring(0, 150));
    const banksData = JSON.parse(banksRaw);
    console.log(`✅ Fetched ${banksData.banks?.length} banks.`);
    if (!banksData.banks || banksData.banks.length !== 7) throw new Error('Expected 7 banks');

    // 3. Fetch Branches for SBI
    console.log('🏢 3. Fetching SBI Branches...');
    const branchesRes = await fetch(`${BASE_URL}/accounts/banks/SBI/branches`, { headers: authHeaders });
    const branchesData = await branchesRes.json();
    console.log(`✅ Fetched ${branchesData.branches?.length} SBI branches.`);
    if (!branchesData.branches || branchesData.branches.length < 5) throw new Error('Branches missing');
    const sbiMumbai = branchesData.branches.find(b => b.ifsc_code === 'SBIN0000300');
    console.log(`   - Verified SBI Mumbai Branch IFSC: ${sbiMumbai.ifsc_code}, City: ${sbiMumbai.city}`);

    // 4. Test Inter-Bank Debit Transfer to SBI
    console.log('💸 4. Executing Inter-Bank Debit Transfer to SBI...');
    const userAccsRes = await fetch(`${BASE_URL}/accounts/my-accounts`, { headers: authHeaders });
    const userAccs = await userAccsRes.json();
    const sourceAcc = userAccs.accounts[0];

    const debitTransferRes = await fetch(`${BASE_URL}/accounts/transfer`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fromAccountId: sourceAcc.id,
        recipientAccountNumber: '30910048122',
        amount: 500,
        description: 'Test IMPS to State Bank',
        paymentMethod: 'DEBIT',
        targetBank: 'State Bank of India',
        targetBranch: 'Mumbai Main Branch',
        targetIfsc: 'SBIN0000300',
        recipientName: 'Rahul Sharma'
      })
    });
    const debitTransferData = await debitTransferRes.json();
    if (!debitTransferData.success) throw new Error('Debit transfer failed: ' + JSON.stringify(debitTransferData));
    console.log(`✅ Debit transfer successful! Ref: ${debitTransferData.referenceId}, New Balance: ₹${debitTransferData.newBalance}`);

    // 5. Test Inter-Bank Credit Transfer
    console.log('💳 5. Executing Inter-Bank Credit Transfer via Smart Credit Line...');
    const creditTransferRes = await fetch(`${BASE_URL}/accounts/transfer`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipientAccountNumber: '50200011942',
        amount: 800,
        description: 'Vendor Settlement via Credit Line',
        paymentMethod: 'CREDIT',
        targetBank: 'HDFC Bank',
        targetBranch: 'Fort Branch',
        targetIfsc: 'HDFC0000060',
        recipientName: 'Acme Technologies'
      })
    });
    const creditTransferData = await creditTransferRes.json();
    if (!creditTransferData.success) throw new Error('Credit transfer failed: ' + JSON.stringify(creditTransferData));
    console.log(`✅ Credit transfer successful! Ref: ${creditTransferData.referenceId}, Avail Credit: ₹${creditTransferData.availableCredit}`);

    // 6. Test Transaction Ledger Rail Filters
    console.log('📊 6. Testing Transaction Rail Filters (DEBIT vs CREDIT)...');
    const debitTxRes = await fetch(`${BASE_URL}/transactions?rail=DEBIT&limit=10`, { headers: authHeaders });
    const debitTxData = await debitTxRes.json();
    console.log(`   - Debit Rail Query: ${debitTxData.transactions?.length} transactions returned.`);
    const hasOnlyDebits = debitTxData.transactions.every(t => t.debit_portion > 0 || t.type === 'DEPOSIT');
    if (!hasOnlyDebits) throw new Error('Rail filter DEBIT returned invalid records');

    const creditTxRes = await fetch(`${BASE_URL}/transactions?rail=CREDIT&limit=10`, { headers: authHeaders });
    const creditTxData = await creditTxRes.json();
    console.log(`   - Credit Rail Query: ${creditTxData.transactions?.length} transactions returned.`);
    const hasOnlyCredits = creditTxData.transactions.every(t => t.credit_portion > 0);
    if (!hasOnlyCredits) throw new Error('Rail filter CREDIT returned invalid records');
    console.log('✅ Rail filtering verified accurately.');

    // 7. Test CSV Statement Export
    console.log('📄 7. Testing Authenticated CSV Statement Export...');
    const csvRes = await fetch(`${BASE_URL}/transactions/export/csv`, { headers: authHeaders });
    const csvText = await csvRes.text();
    if (!csvText.includes('Reference ID') || !csvText.includes('Debit Portion')) {
      throw new Error('CSV Statement missing expected headers: ' + csvText.substring(0, 100));
    }
    console.log('✅ CSV Statement exported cleanly with authentic columns.');

    console.log('\n🌟 ALL HTTP API ENDPOINT TESTS PASSED COMPLETELY!\n');
  } finally {
    server.kill();
  }
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
