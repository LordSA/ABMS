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
  FileText,
  Landmark,
  Wallet
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

  // Transfer options: Inter-Bank vs Internal & Debit vs Credit
  const [transferType, setTransferType] = useState('INTER_BANK'); // 'INTER_BANK' | 'INTERNAL'
  const [paymentRail, setPaymentRail] = useState('DEBIT'); // 'DEBIT' | 'CREDIT'
  const [banks, setBanks] = useState([]);
  const [selectedBankCode, setSelectedBankCode] = useState('SBI');
  const [branches, setBranches] = useState([]);
  const [selectedBranchCode, setSelectedBranchCode] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [interBankAcc, setInterBankAcc] = useState('');

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
    setBeneficiaryName('');
    setInterBankAcc('');
  }, [isOpen, mode, accounts]);

  // Load banks when transfer tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'transfer' && banks.length === 0) {
      apiRequest('/accounts/banks')
        .then(res => {
          if (res.banks && res.banks.length > 0) {
            setBanks(res.banks);
            const hasSbi = res.banks.find(b => b.bank_code === 'SBI');
            setSelectedBankCode(hasSbi ? 'SBI' : res.banks[0].bank_code);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, activeTab, banks.length]);

  // Load branches when selected bank changes
  useEffect(() => {
    if (isOpen && activeTab === 'transfer' && selectedBankCode) {
      apiRequest(`/accounts/banks/${selectedBankCode}/branches`)
        .then(res => {
          if (res.branches && res.branches.length > 0) {
            setBranches(res.branches);
            setSelectedBranchCode(res.branches[0].branch_code);
          } else {
            setBranches([]);
            setSelectedBranchCode('');
          }
        })
        .catch(() => {
          setBranches([]);
          setSelectedBranchCode('');
        });
    }
  }, [isOpen, activeTab, selectedBankCode]);

  // Lookup recipient account on typing
  useEffect(() => {
    if (activeTab !== 'transfer' || transferType !== 'INTERNAL' || recipientAccount.length < 8) {
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
  }, [recipientAccount, activeTab, transferType]);

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
        const isInterBank = transferType === 'INTER_BANK';
        const selBank = banks.find(b => b.bank_code === selectedBankCode);
        const selBranch = branches.find(b => b.branch_code === selectedBranchCode);

        if (isInterBank) {
          if (!interBankAcc || interBankAcc.trim().length < 6) {
            throw new Error('Please enter a valid beneficiary account number.');
          }
          if (!selBranch) {
            throw new Error('Please select a valid bank branch.');
          }
        } else {
          if (!recipientAccount || recipientAccount.trim().length < 4) {
            throw new Error('Please enter recipient account number.');
          }
        }

        const res = await apiRequest('/accounts/transfer', 'POST', {
          fromAccountId: selectedAccountId || accounts[0]?.id || 1,
          recipientAccountNumber: isInterBank ? interBankAcc.trim() : recipientAccount.trim(),
          amount: numAmount,
          description: description || (isInterBank ? `Inter-Bank (${selBank?.short_name || 'Bank'})` : 'Account Transfer'),
          paymentMethod: paymentRail, // 'DEBIT' | 'CREDIT'
          targetBank: isInterBank ? selBank?.bank_name : undefined,
          targetBranch: isInterBank ? selBranch?.branch_name : undefined,
          targetIfsc: isInterBank ? selBranch?.ifsc_code : undefined,
          recipientName: isInterBank ? (beneficiaryName || `${selBank?.short_name || 'Bank'} Beneficiary`) : (recipientInfo?.name || undefined)
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
              {/* Account Selector for Non-Transfer or Non-Credit operations */}
              {accounts && accounts.length > 0 && activeTab !== 'repay' && activeTab !== 'transfer' && (
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

              {/* Transfer Rail & Type Selectors */}
              {activeTab === 'transfer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Rail Selector: Debit vs Credit */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Transfer Funding Source
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setPaymentRail('DEBIT')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: `1.5px solid ${paymentRail === 'DEBIT' ? '#2563eb' : '#cbd5e1'}`,
                          background: paymentRail === 'DEBIT' ? '#eff6ff' : '#ffffff',
                          color: paymentRail === 'DEBIT' ? '#1d4ed8' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Wallet size={15} /> Debit Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentRail('CREDIT')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: `1.5px solid ${paymentRail === 'CREDIT' ? '#7c3aed' : '#cbd5e1'}`,
                          background: paymentRail === 'CREDIT' ? '#f5f3ff' : '#ffffff',
                          color: paymentRail === 'CREDIT' ? '#6b21a8' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CreditCard size={15} /> Credit Line
                      </button>
                    </div>
                  </div>

                  {/* If Debit: Account picker */}
                  {paymentRail === 'DEBIT' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        From Debit Account
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          color: '#0f172a',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_number} ({acc.account_type}) — Balance: {formatINR(acc.balance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* If Credit: Active card summary */
                    <div style={{
                      padding: '8px 12px',
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}>
                      <span style={{ color: '#6b21a8', fontWeight: 600 }}>Nexora Platinum Hybrid Line</span>
                      <span style={{ color: '#581c87', fontWeight: 800 }}>Available: {formatINR(cardData?.available_credit ?? 150000)}</span>
                    </div>
                  )}

                  {/* Channel: Inter-Bank vs Internal */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Transfer Destination
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTransferType('INTER_BANK')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: transferType === 'INTER_BANK' ? '#1d4ed8' : '#f1f5f9',
                          color: transferType === 'INTER_BANK' ? '#ffffff' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Landmark size={14} /> SBI / Other Banks
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferType('INTERNAL')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: transferType === 'INTERNAL' ? '#0f172a' : '#f1f5f9',
                          color: transferType === 'INTERNAL' ? '#ffffff' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={14} /> Nexora Internal
                      </button>
                    </div>
                  </div>

                  {/* Inter-Bank Directory Fields */}
                  {transferType === 'INTER_BANK' ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Select Bank
                        </label>
                        <select
                          value={selectedBankCode}
                          onChange={(e) => setSelectedBankCode(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            color: '#0f172a',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        >
                          {banks.map(b => (
                            <option key={b.bank_code} value={b.bank_code}>
                              {b.bank_name} ({b.short_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Select Branch
                        </label>
                        <select
                          value={selectedBranchCode}
                          onChange={(e) => setSelectedBranchCode(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            color: '#0f172a',
                            fontSize: '0.86rem',
                            outline: 'none'
                          }}
                          disabled={branches.length === 0}
                        >
                          {branches.map(br => (
                            <option key={br.branch_code} value={br.branch_code}>
                              {br.branch_name} — {br.city} (IFSC: {br.ifsc_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Beneficiary Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={beneficiaryName}
                          onChange={(e) => setBeneficiaryName(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Beneficiary Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 30910048122"
                          value={interBankAcc}
                          onChange={(e) => setInterBankAcc(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            color: '#0f172a',
                            fontSize: '0.88rem',
                            fontFamily: 'var(--font-mono)',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    /* Internal Nexora Transfer */
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
