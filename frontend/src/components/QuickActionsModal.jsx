import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  CreditCard,
  X,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Building2,
  Sparkles,
  Smartphone,
  FileText
} from 'lucide-react';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function QuickActionsModal({ isOpen, mode, onClose, accounts = [], cardData, onSuccess }) {
  const [activeTab, setActiveTab] = useState(mode || 'deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (mode) setActiveTab(mode);
    if (accounts && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
    setAmount('');
    setDescription('');
    setError('');
    setSuccessMsg('');
    setRecipientInfo(null);
  }, [isOpen, mode, accounts]);

  // Lookup recipient account on typing
  useEffect(() => {
    if (activeTab !== 'transfer' || recipientAccount.length < 8) {
      setRecipientInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLookingUp(true);
        const res = await apiRequest(`/accounts/lookup/${encodeURIComponent(recipientAccount)}`);
        setRecipientInfo(res.recipient);
      } catch (err) {
        setRecipientInfo(null);
      } finally {
        setLookingUp(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipientAccount, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount.');
      }

      if (activeTab === 'deposit') {
        const res = await apiRequest('/accounts/deposit', 'POST', {
          accountId: selectedAccountId || accounts[0]?.id || 1,
          amount: numAmount,
          description: description || 'Account Cash Deposit'
        });
        setSuccessMsg(res.message);
      } else if (activeTab === 'withdraw') {
        const res = await apiRequest('/accounts/withdraw', 'POST', {
          accountId: selectedAccountId || accounts[0]?.id || 1,
          amount: numAmount,
          description: description || 'Cash Withdrawal'
        });
        setSuccessMsg(res.message);
      } else if (activeTab === 'transfer') {
        const res = await apiRequest('/accounts/transfer', 'POST', {
          fromAccountId: selectedAccountId || accounts[0]?.id || 1,
          recipientAccountNumber: recipientAccount,
          amount: numAmount,
          description
        });
        setSuccessMsg(res.message);
      } else if (activeTab === 'repay') {
        const res = await apiRequest('/credit/repay', 'POST', {
          amount: numAmount,
          paymentMethod: 'DEBIT_ACCOUNT'
        });
        setSuccessMsg(res.message);
      } else if (activeTab === 'bill') {
        const res = await apiRequest('/accounts/withdraw', 'POST', {
          accountId: selectedAccountId || accounts[0]?.id || 1,
          amount: numAmount,
          description: description || 'Utility Bill Payment'
        });
        setSuccessMsg(`Utility bill payment of ₹${numAmount.toLocaleString('en-IN')} confirmed successfully.`);
      } else if (activeTab === 'recharge') {
        const res = await apiRequest('/accounts/withdraw', 'POST', {
          accountId: selectedAccountId || accounts[0]?.id || 1,
          amount: numAmount,
          description: description || 'Mobile Prepaid Recharge'
        });
        setSuccessMsg(`Mobile recharge of ₹${numAmount.toLocaleString('en-IN')} processed successfully.`);
      }

      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft, color: '#16a34a' },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight, color: '#2563eb' },
    { id: 'transfer', label: 'Transfer', icon: Send, color: '#0d9488' },
    { id: 'repay', label: 'Repay Card', icon: CreditCard, color: '#7c3aed' },
    { id: 'bill', label: 'Pay Bills', icon: FileText, color: '#d97706' },
    { id: 'recharge', label: 'Recharge', icon: Smartphone, color: '#0284c7' }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];
  const outstandingCredit = Math.max(0, (cardData?.credit_limit || 0) - (cardData?.available_credit || 0));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header Tabs */}
        <div style={{
          padding: '16px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {/* Segmented Control */}
          <div style={{
            display: 'flex',
            background: '#e2e8f0',
            padding: '3px',
            borderRadius: '12px',
            gap: '3px',
            flex: 1,
            overflowX: 'auto'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setError(''); setSuccessMsg(''); }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} color={isActive ? tab.color : '#64748b'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px' }}>
          {successMsg ? (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#16a34a'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Operation Successful!
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Account Selector */}
              {accounts && accounts.length > 0 && activeTab !== 'repay' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Select Bank Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number} ({acc.account_type}) — Balance: {formatINR(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Outstanding credit banner for repay tab */}
              {activeTab === 'repay' && (
                <div style={{
                  padding: '14px 16px',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#6b21a8', fontWeight: 600, textTransform: 'uppercase' }}>
                      Revolving Credit Utilized
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>
                      {formatINR(outstandingCredit)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(outstandingCredit.toString())}
                    style={{
                      background: '#7c3aed',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pay Full
                  </button>
                </div>
              )}

              {/* Transfer Recipient Input */}
              {activeTab === 'transfer' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Recipient Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABMS-1004-7733 or NEX-4582-8821"
                    value={recipientAccount}
                    onChange={(e) => setRecipientAccount(e.target.value.toUpperCase())}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '0.92rem',
                      outline: 'none',
                      letterSpacing: '0.04em',
                      fontWeight: 600
                    }}
                  />

                  {lookingUp && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                      Checking account database...
                    </div>
                  )}

                  {recipientInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#166534',
                      fontSize: '0.86rem'
                    }}>
                      <UserCheck size={18} color="#16a34a" />
                      <div>
                        <strong>Verified:</strong> {recipientInfo.name} ({recipientInfo.accountType})
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Amount (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#64748b'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly savings, Rent, Allowance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#b91c1c',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.92rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Processing...' : `Confirm ${activeTab.toUpperCase()}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
