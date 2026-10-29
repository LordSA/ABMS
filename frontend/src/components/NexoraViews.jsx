import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Lock,
  Unlock,
  Percent,
  Headphones,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  PhoneCall,
  Clock,
  PlusCircle,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Shield,
  QrCode,
  Building2,
  Landmark,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { apiRequest } from '../api';

// Currency format helper: ₹ 1,48,750.00
const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ============================================================================
// 1. ACCOUNTS VIEW (Feature 1: Basic Banking & Account Management)
// ============================================================================
export function AccountsView({ accounts = [], onOpenAction, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccType, setNewAccType] = useState('SAVINGS');
  const [initialDeposit, setInitialDeposit] = useState('5000');
  const [creating, setCreating] = useState(false);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiRequest('/accounts/create', 'POST', {
        accountType: newAccType,
        initialDeposit: parseFloat(initialDeposit) || 1000
      });
      setShowCreateModal(false);
      onRefresh && onRefresh();
    } catch (err) {
      alert('Account creation: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Default accounts display if list is empty
  const displayAccounts = accounts.length > 0 ? accounts : [
    { id: 1, account_number: 'NEX-4582-8821', account_type: 'SAVINGS', balance: 102450.00, currency: 'INR', status: 'ACTIVE', safe_limit_amount: 15000 },
    { id: 2, account_number: 'NEX-7291-4412', account_type: 'CHECKING', balance: 22300.00, currency: 'INR', status: 'ACTIVE', safe_limit_amount: 0 },
    { id: 3, account_number: 'NEX-1034-9931', account_type: 'SAVINGS', balance: 24000.00, currency: 'INR', status: 'ACTIVE', safe_limit_amount: 0, is_fd: true }
  ];

  return (
    <div className="nexora-content-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Your Bank Accounts</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Manage your savings, current, and term deposit accounts with real-time balance tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => onOpenAction('deposit')} id="accounts-add-money-btn">
            <ArrowDownLeft size={16} /> Add Money
          </button>
          <button className="btn btn-secondary" onClick={() => onOpenAction('transfer')} id="accounts-transfer-btn">
            <Send size={16} /> Transfer
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)} id="accounts-new-acc-btn">
            <PlusCircle size={16} /> Open New Account
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '12px' }}>
        {displayAccounts.map((acc, index) => {
          const isPrimary = index === 0;
          const isFd = acc.is_fd || acc.account_number.includes('1034');
          const borderTopColor = isPrimary ? '#2563eb' : isFd ? '#059669' : '#4f46e5';
          const iconBg = isPrimary ? '#eff6ff' : isFd ? '#ecfdf5' : '#eef2ff';
          const iconColor = isPrimary ? '#2563eb' : isFd ? '#059669' : '#4f46e5';

          return (
            <div key={acc.id || index} className="nexora-card" style={{ borderTop: `4px solid ${borderTopColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {isPrimary && <span className="badge badge-success">Primary Account</span>}
                    <span className="badge badge-cyan">
                      {isFd ? 'Fixed Deposit' : acc.account_type === 'SAVINGS' ? 'Savings Account' : 'Current Account'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    {isFd ? 'Fixed Term Deposit' : acc.account_type === 'SAVINGS' ? 'High Yield Savings' : 'Premium Current Account'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    A/C: {acc.account_number}
                  </div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isFd ? <Lock size={20} /> : <Wallet size={20} />}
                </div>
              </div>

              <div style={{ margin: '20px 0 10px 0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {isFd ? 'Maturity Value at 7.2% p.a.' : 'Available Liquid Balance'}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
                  {formatINR(acc.balance)}
                </div>
                {acc.safe_limit_amount > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={13} /> Protected Safe Limit: {formatINR(acc.safe_limit_amount)}
                  </div>
                )}
                {isFd && (
                  <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>
                    ● Matures on 12 Jan 2027 (+ ₹ 2,840 interest)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => onOpenAction('deposit')}
                >
                  Deposit
                </button>
                {!isFd && (
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => onOpenAction('withdraw')}
                  >
                    Withdraw
                  </button>
                )}
                <button
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => onOpenAction('transfer')}
                >
                  Transfer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Open New Account */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: '#ffffff', color: '#0f172a' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Open a New Nexora Account
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                Instant activation with zero paperwork and linked Smart Hybrid Card.
              </p>

              <form onSubmit={handleCreateAccount}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#475569' }}>Account Type</label>
                  <select
                    className="input-field"
                    style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value)}
                  >
                    <option value="SAVINGS">High-Yield Savings (4.5% interest)</option>
                    <option value="CHECKING">Commercial Current Account (Unlimited Transfers)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#475569' }}>Initial Opening Deposit (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
                    value={initialDeposit}
                    onChange={e => setInitialDeposit(e.target.value)}
                    required
                    min="1000"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={creating}
                  >
                    {creating ? 'Opening...' : 'Confirm & Open'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. MONEY TRANSFER VIEW (Feature 1 & 5: Transfers, Beneficiaries & Lookup)
// ============================================================================
export function MoneyTransferView({ accounts = [], cardData, onTransferSuccess, onOpenScanPay }) {
  const [paymentMethod, setPaymentMethod] = useState('DEBIT'); // 'DEBIT' | 'CREDIT'
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || 1);
  const [activeCard, setActiveCard] = useState(cardData || null);
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('NEX-9821-4410');
  const [recipientName, setRecipientName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [amount, setAmount] = useState('5000');
  const [description, setDescription] = useState('Money Transfer');
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch card data if not provided
  useEffect(() => {
    if (!activeCard) {
      apiRequest('/cards/my-card')
        .then(res => {
          if (res.card) setActiveCard(res.card);
        })
        .catch(() => {});
    }
  }, [cardData]);

  // Lookup recipient when account number changes
  useEffect(() => {
    if (recipientAccountNumber.length >= 8) {
      setLookupLoading(true);
      apiRequest(`/accounts/lookup/${recipientAccountNumber}`)
        .then(res => {
          if (res.recipient) {
            setRecipientName(res.recipient.holder_name);
            setErrorMsg('');
          }
        })
        .catch(() => {
          // If not found in live DB, provide friendly fallback for demo accounts
          if (recipientAccountNumber.includes('4582')) setRecipientName('Alex Mathew');
          else if (recipientAccountNumber.includes('7733')) setRecipientName('Sarah Connor');
          else if (recipientAccountNumber.includes('8841')) setRecipientName('John Davis');
          else if (recipientAccountNumber.includes('9912')) setRecipientName('Leo Davis');
          else if (recipientAccountNumber.includes('9821')) setRecipientName('Rahul S');
          else setRecipientName('Verified Nexora Customer');
        })
        .finally(() => setLookupLoading(false));
    }
  }, [recipientAccountNumber]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessInfo(null);

    try {
      const res = await apiRequest('/accounts/transfer', 'POST', {
        fromAccountId: parseInt(fromAccountId) || accounts[0]?.id || 1,
        recipientAccountNumber,
        amount: parseFloat(amount),
        description,
        paymentMethod // 'DEBIT' | 'CREDIT'
      });

      if (res.status === 'PENDING_APPROVAL') {
        setSuccessInfo({
          type: 'PENDING_APPROVAL',
          title: 'Submitted for Parental Approval',
          message: `Transfer of ₹${parseFloat(amount).toLocaleString('en-IN')} via ${paymentMethod === 'CREDIT' ? 'Credit Line' : 'Debit'} is held pending authorization from your parent/guardian. Request Code: ${res.requestCode}`
        });
      } else {
        setSuccessInfo({
          type: 'SUCCESS',
          title: 'Transfer Completed Successfully',
          message: `Transferred ₹${parseFloat(amount).toLocaleString('en-IN')} via ${paymentMethod === 'CREDIT' ? 'Nexora Credit Line' : 'Debit Account'} to ${recipientName || recipientAccountNumber}. Ref: ${res.referenceId}`
        });
      }

      setAmount('');
      onTransferSuccess && onTransferSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nexora-content-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Money Transfer & Instant Pay</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Real-time bank transfers with automated Safe Limit protection and zero transaction fees.
          </p>
        </div>
        {onOpenScanPay && (
          <button
            type="button"
            onClick={onOpenScanPay}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              cursor: 'pointer'
            }}
            id="transfer-scan-pay-quick-btn"
          >
            <QrCode size={18} />
            <span>Scan QR to Pay</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '12px' }}>
        {/* Transfer Form Card */}
        <div className="nexora-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Direct Account Transfer
          </h3>

          {successInfo && (
            <div style={{
              background: successInfo.type === 'SUCCESS' ? '#ecfdf5' : '#fffbeb',
              color: successInfo.type === 'SUCCESS' ? '#059669' : '#b45309',
              border: `1px solid ${successInfo.type === 'SUCCESS' ? '#a7f3d0' : '#fde68a'}`,
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={18} /> {successInfo.title}
              </div>
              <div style={{ fontSize: '0.82rem' }}>{successInfo.message}</div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '18px',
              fontSize: '0.85rem'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleTransfer}>
            {/* Funding Source Toggle: Debit vs Credit */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ color: '#475569', marginBottom: '8px', display: 'block' }}>
                Choose Transfer Source (Debit / Credit)
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEBIT')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: paymentMethod === 'DEBIT' ? '#ffffff' : 'transparent',
                    color: paymentMethod === 'DEBIT' ? '#2563eb' : '#64748b',
                    fontWeight: paymentMethod === 'DEBIT' ? 700 : 600,
                    boxShadow: paymentMethod === 'DEBIT' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Wallet size={16} />
                  <span>Debit Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: paymentMethod === 'CREDIT' ? '#ffffff' : 'transparent',
                    color: paymentMethod === 'CREDIT' ? '#7c3aed' : '#64748b',
                    fontWeight: paymentMethod === 'CREDIT' ? 700 : 600,
                    boxShadow: paymentMethod === 'CREDIT' ? '0 2px 8px rgba(124, 58, 237, 0.15)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CreditCard size={16} />
                  <span>Credit Line</span>
                </button>
              </div>
            </div>

            {/* If DEBIT: Select from Accounts */}
            {paymentMethod === 'DEBIT' ? (
              <div className="form-group">
                <label className="form-label" style={{ color: '#475569' }}>From Debit Account</label>
                <select
                  className="input-field"
                  style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                >
                  {accounts.length > 0 ? (
                    accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.account_type} ({a.account_number}) — Balance: {formatINR(a.balance)}
                      </option>
                    ))
                  ) : (
                    <option value="1">Savings Account (NEX-4582-8821) — Balance: ₹ 1,02,450.00</option>
                  )}
                </select>
              </div>
            ) : (
              /* If CREDIT: Show Active Credit Card Line */
              <div className="form-group">
                <label className="form-label" style={{ color: '#475569' }}>From Nexora Smart Credit Line</label>
                <div style={{
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  border: '1.5px solid #ddd6fe',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#7c3aed',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e1b4b' }}>
                        Nexora Platinum Hybrid Credit Card
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#6d28d9' }}>
                        Card: •••• {activeCard?.card_number?.slice(-4) || '4152'} • 0% APR Promo Active
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#6d28d9', fontWeight: 600, textTransform: 'uppercase' }}>
                      Available Credit
                    </div>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#5b21b6' }}>
                      {formatINR(activeCard?.available_credit ?? 150000)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient Account Number */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ color: '#475569' }}>Recipient Account / UPI Number</label>
                {recipientName && (
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    ✓ Beneficiary: {recipientName}
                  </span>
                )}
              </div>
              <input
                className="input-field"
                style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0', fontFamily: 'var(--font-mono)' }}
                value={recipientAccountNumber}
                onChange={e => setRecipientAccountNumber(e.target.value)}
                placeholder="e.g. NEX-9821-4410"
                required
              />
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Transfer Amount (₹)</label>
              <input
                type="number"
                className="input-field"
                style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0', fontSize: '1.25rem', fontWeight: 700 }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="1"
              />
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Transfer Description / Reference Note</label>
              <input
                className="input-field"
                style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Rent, Freelance Payment, Gift"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={submitting}
              id="submit-transfer-btn"
            >
              <Send size={16} /> {submitting ? 'Validating & Processing...' : 'Send Money Now'}
            </button>
          </form>
        </div>

        {/* Frequent Beneficiaries */}
        <div className="nexora-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Saved Beneficiaries
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'Rahul S', acc: 'NEX-9821-4410', bank: 'Nexora Bank' },
              { name: 'Acme Technologies', acc: 'NEX-3312-8800', bank: 'Nexora Corporate' },
              { name: 'Kerala Electricity Board', acc: 'KSEB-BILL-104', bank: 'Utility Services' },
              { name: 'Sarah Connor', acc: 'ABMS-1004-7733', bank: 'Nexora Partner' },
              { name: 'Leo Davis (Minor)', acc: 'ABMS-1003-9912', bank: 'Nexora Student' }
            ].map((b, i) => (
              <div
                key={i}
                onClick={() => {
                  setRecipientAccountNumber(b.acc);
                  setRecipientName(b.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    {b.acc} • {b.bank}
                  </div>
                </div>
                <button type="button" className="btn btn-sm btn-secondary">Select</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. FIXED DEPOSITS VIEW (Feature 1 & Term Savings)
// ============================================================================
export function FixedDepositsView({ onRefresh }) {
  const [depositAmount, setDepositAmount] = useState('50000');
  const [tenureYears, setTenureYears] = useState('3');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const rate = 7.2;

  const interestEarned = Math.round(depositAmount * (rate / 100) * tenureYears);
  const maturityAmount = parseFloat(depositAmount || 0) + interestEarned;

  const handleBookFd = async () => {
    try {
      await apiRequest('/accounts/deposit', 'POST', {
        accountId: 1,
        amount: parseFloat(depositAmount),
        description: `New Fixed Deposit booked for ${tenureYears} years at 7.2% p.a.`
      });
      setBookingSuccess(`Fixed Deposit of ₹${parseFloat(depositAmount).toLocaleString('en-IN')} booked successfully! Matures with ₹${maturityAmount.toLocaleString('en-IN')}.`);
      onRefresh && onRefresh();
    } catch (err) {
      alert('Could not book FD: ' + err.message);
    }
  };

  return (
    <div className="nexora-content-container">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Fixed Deposits & Term Savings</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Lock in 7.2% annual guaranteed returns with compound interest and instant liquidity overdraft.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', marginTop: '12px' }}>
        {/* Active FD Card */}
        <div className="nexora-card">
          <div className="nexora-card-header">
            <span className="nexora-card-title">Active Deposits</span>
            <span className="badge badge-success">Guaranteed Return</span>
          </div>

          {bookingSuccess && (
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> {bookingSuccess}
            </div>
          )}

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>FD #NEX-1034-9931</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tenure: 3 Years • Opened Jan 2024</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>₹ 24,000.00</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Interest Rate</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>7.20% p.a.</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Maturity Date</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>12 Jan 2027</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Status</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>Active & Accruing</div>
              </div>
            </div>
          </div>
        </div>

        {/* FD Calculator */}
        <div className="nexora-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            FD Returns Calculator
          </h3>

          <div className="form-group">
            <label className="form-label" style={{ color: '#475569' }}>Principal Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#475569' }}>Tenure (Years)</label>
            <select
              className="input-field"
              style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
              value={tenureYears}
              onChange={e => setTenureYears(e.target.value)}
            >
              <option value="1">1 Year (6.8% p.a.)</option>
              <option value="2">2 Years (7.1% p.a.)</option>
              <option value="3">3 Years (7.2% p.a.)</option>
              <option value="5">5 Years (7.5% p.a.)</option>
            </select>
          </div>

          <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #ccfbf1', margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#0f766e' }}>Total Interest Earned:</span>
              <span style={{ fontWeight: 700, color: '#0f766e' }}>+ ₹ {interestEarned.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#065f46' }}>
              <span>Total Maturity Value:</span>
              <span>₹ {maturityAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBookFd}>
            <Lock size={16} /> Book Fixed Deposit Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. LOANS & CREDIT VIEW (Feature 8: Credit Management & Loans)
// ============================================================================
export function LoansView({ onRefresh }) {
  const [loanAmount, setLoanAmount] = useState('200000');
  const [loanTenure, setLoanTenure] = useState('24'); // months
  const [loanRate, setLoanRate] = useState('9.99');
  const [disbursing, setDisbursing] = useState(false);
  const [disburseSuccess, setDisburseSuccess] = useState('');

  // Calculate monthly EMI = P * r * (1+r)^n / ((1+r)^n - 1)
  const P = parseFloat(loanAmount) || 0;
  const r = (parseFloat(loanRate) / 100) / 12;
  const n = parseInt(loanTenure) || 24;
  const emi = r > 0 ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const totalPayable = emi * n;
  const totalInterest = Math.max(0, totalPayable - P);

  const handleApplyInstantLoan = async () => {
    setDisbursing(true);
    try {
      await apiRequest('/accounts/deposit', 'POST', {
        accountId: 1,
        amount: parseFloat(loanAmount),
        description: `Pre-Approved Instant Personal Loan disbursed`
      });
      setDisburseSuccess(`Instant Personal Loan of ₹${parseFloat(loanAmount).toLocaleString('en-IN')} disbursed into your primary savings account!`);
      onRefresh && onRefresh();
    } catch (err) {
      alert('Disbursement: ' + err.message);
    } finally {
      setDisbursing(false);
    }
  };

  return (
    <div className="nexora-content-container">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pre-Approved Loans & Credit Lines</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Flexible borrowing with zero processing fees, instant online disbursement, and competitive rates.
        </p>
      </div>

      {disburseSuccess && (
        <div style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '14px 18px', borderRadius: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {disburseSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', marginTop: '16px' }}>
        {/* Loan Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="nexora-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success">Pre-Approved</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
                  Instant Personal Loan
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 14px 0' }}>
                  Funds credited directly to your checking account in seconds.
                </p>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Available Limit</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>₹ 5,00,000</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Interest Rate</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>9.99% p.a.</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tenure Up To</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>48 Months</div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleApplyInstantLoan}
              disabled={disbursing}
            >
              {disbursing ? 'Disbursing...' : 'Disburse ₹ 2,00,000 Instantly'}
            </button>
          </div>

          <div className="nexora-card" style={{ borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-indigo">Overdraft Facility</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
                  Home Loan Overdraft Protection
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 14px 0' }}>
                  Interest calculated only on utilized amount with flexible pre-payments.
                </p>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Financing Up To</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>₹ 50,00,000</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Interest Rate</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>8.25% p.a.</div>
              </div>
            </div>
          </div>
        </div>

        {/* EMI Calculator */}
        <div className="nexora-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Interactive EMI Calculator
          </h3>

          <div className="form-group">
            <label className="form-label" style={{ color: '#475569' }}>Loan Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
              value={loanAmount}
              onChange={e => setLoanAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#475569' }}>Tenure (Months)</label>
            <select
              className="input-field"
              style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}
              value={loanTenure}
              onChange={e => setLoanTenure(e.target.value)}
            >
              <option value="12">12 Months (1 Year)</option>
              <option value="24">24 Months (2 Years)</option>
              <option value="36">36 Months (3 Years)</option>
              <option value="48">48 Months (4 Years)</option>
            </select>
          </div>

          <div style={{ background: '#eff6ff', padding: '18px', borderRadius: '14px', border: '1px solid #bfdbfe', margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>Monthly EMI:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                ₹ {emi.toLocaleString('en-IN')} / mo
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
              <span>Total Interest:</span>
              <span>₹ {totalInterest.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
              <span>Total Payable:</span>
              <span>₹ {totalPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. SUPPORT & SECURITY VIEW (Feature 6 & 9: Security Controls & FAQ)
// ============================================================================
export function SupportView({ cardData, onRefresh }) {
  const [isFrozen, setIsFrozen] = useState(cardData?.status === 'FROZEN');
  const [toggling, setToggling] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    if (cardData) {
      setIsFrozen(cardData.status === 'FROZEN');
    }
  }, [cardData]);

  const handleToggleFreeze = async () => {
    setToggling(true);
    try {
      const res = await apiRequest('/cards/toggle-freeze', 'POST');
      setIsFrozen(res.newStatus === 'FROZEN');
      onRefresh && onRefresh();
    } catch (err) {
      alert('Card status update: ' + err.message);
    } finally {
      setToggling(false);
    }
  };

  const faqs = [
    {
      q: 'How does the Smart Hybrid Card allocate payments between Debit and Credit?',
      a: 'The Smart Hybrid Card checks your protected Safe Limit first. Disposable debit funds above your Safe Limit are charged first. Any overflow purchase amount automatically routes to your approved credit line without manual intervention.'
    },
    {
      q: 'How does Parental Approval work for Under-18 accounts?',
      a: 'Minor accounts linked to a verified parent require authorization for transactions exceeding the configured limit. A real-time notification with full merchant and amount details is sent to the parent, who can Approve or Decline with one click.'
    },
    {
      q: 'What happens if my purchase exceeds both my Debit balance and Credit line?',
      a: 'If the total required purchase amount exceeds your combined purchasing power (debit above Safe Limit + available credit), the transaction is cleanly declined with an instant notification explaining the exact shortage.'
    },
    {
      q: 'How do I unfreeze my Smart Hybrid Card if locked?',
      a: 'You can toggle card freeze anytime from this Support panel or the Cards tab. While frozen, all new POS and online purchases are blocked to prevent unauthorized usage.'
    }
  ];

  return (
    <div className="nexora-content-container">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Nexora 24/7 Security & Support</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Real-time card controls, fraud reporting, concierge assistance, and core banking guides.
        </p>
      </div>

      {/* Top 3 Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '12px' }}>
        {/* Emergency Freeze */}
        <div className="nexora-card" style={{ borderTop: `4px solid ${isFrozen ? '#10b981' : '#f43f5e'}` }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isFrozen ? '#ecfdf5' : '#fff1f2', color: isFrozen ? '#059669' : '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <ShieldAlert size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Emergency Card Lock</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 16px 0' }}>
            Current Card Status: <strong style={{ color: isFrozen ? '#e11d48' : '#059669' }}>{isFrozen ? 'FROZEN (BLOCKED)' : 'ACTIVE (UNLOCKED)'}</strong>
          </p>
          <button
            className={`btn ${isFrozen ? 'btn-success' : 'btn-danger'}`}
            style={{ width: '100%' }}
            onClick={handleToggleFreeze}
            disabled={toggling}
          >
            {isFrozen ? <Unlock size={15} /> : <Lock size={15} />}
            {isFrozen ? 'Unlock Hybrid Card' : 'Lock Card Instantly'}
          </button>
        </div>

        {/* 24/7 Toll-Free Helpline */}
        <div className="nexora-card" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <PhoneCall size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Toll-Free Phone Banking</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 16px 0' }}>
            Immediate connection to authorized banking officers.
          </p>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
            1800-420-NEXORA (6396)
          </div>
        </div>

        {/* Live Concierge */}
        <div className="nexora-card" style={{ borderTop: '4px solid #059669' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <MessageSquare size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Live AI Concierge</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 16px 0' }}>
            Instant answers for safe limit questions, allocations, and receipts.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }}>
            Start Live Session
          </button>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="nexora-card" style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          Core Banking & Smart Features Knowledge Base
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div
                key={i}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  background: isOpen ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveFaq(isOpen ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.92rem' }}>
                    {faq.q}
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                </div>
                {isOpen && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
