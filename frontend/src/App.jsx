import React, { useState, useEffect } from 'react';
import NexoraSidebar from './components/NexoraSidebar';
import NexoraHeader from './components/NexoraHeader';
import NexoraDashboard from './components/NexoraDashboard';
import {
  AccountsView,
  MoneyTransferView,
  FixedDepositsView,
  LoansView,
  SupportView
} from './components/NexoraViews';
import HybridCardWidget from './components/HybridCardWidget';
import SafeLimitControl from './components/SafeLimitControl';
import CardPaymentSimulator from './components/CardPaymentSimulator';
import TransactionHistory from './components/TransactionHistory';
import QuickActionsModal from './components/QuickActionsModal';
import ReceiptModal from './components/ReceiptModal';
import ScanAndPayModal from './components/ScanAndPayModal';
import ParentPortal from './components/ParentPortal';
import AdminPortal from './components/AdminPortal';
import LoginPage from './components/LoginPage';
import { apiRequest, getToken, setToken } from './api';
import './nexora.css';
import { Shield, ShoppingBag, LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, MoreHorizontal } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [quickActionModal, setQuickActionModal] = useState({ isOpen: false, mode: 'deposit' });
  const [scanPayModalOpen, setScanPayModalOpen] = useState(false);
  const [posSimulatorOpen, setPosSimulatorOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize auth: checks existing session without forcing auto-login
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const res = await apiRequest('/auth/me');
          setCurrentUser(res.user);
          if (res.user.role === 'ADMIN') setActiveTab('admin_portal');
          else if (res.user.role === 'PARENT') setActiveTab('parent_portal');
          else setActiveTab('dashboard');
        } catch (err) {
          console.warn('Session expired or invalid, please sign in.');
          setToken(null);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      setActiveTab('admin_portal');
    } else if (user.role === 'PARENT') {
      setActiveTab('parent_portal');
    } else {
      setActiveTab('dashboard');
    }
    handleRefresh();
  };

  // Load account, card, and transactions data
  const loadUserData = async () => {
    if (!currentUser) return;
    try {
      const [accRes, cardRes, txRes] = await Promise.all([
        apiRequest('/accounts/my-accounts').catch(() => ({ accounts: [] })),
        apiRequest('/cards/my-card').catch(() => ({ card: null })),
        apiRequest('/transactions?limit=20').catch(() => ({ transactions: [] }))
      ]);
      setAccounts(accRes.accounts || []);
      setCardData(cardRes.card || null);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Error loading account data:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectTransactionReceipt = async (txOrId) => {
    if (typeof txOrId === 'number' || typeof txOrId === 'string') {
      try {
        const res = await apiRequest(`/transactions/${txOrId}/receipt`);
        setSelectedReceipt(res.receipt);
        setReceiptModalOpen(true);
      } catch (err) {
        alert('Could not fetch receipt: ' + err.message);
      }
    } else if (txOrId && txOrId.id) {
      // Fallback object receipt preview
      setSelectedReceipt({
        referenceId: txOrId.id || 'TXN-NEX-PREVIEW',
        createdAt: txOrId.date || new Date().toISOString(),
        status: 'SUCCESS',
        type: txOrId.category || 'PURCHASE',
        description: txOrId.title,
        recipientInfo: txOrId.subtitle,
        totalAmount: Math.abs(txOrId.amount || 2499.0),
        debitPortion: Math.abs(txOrId.amount || 2499.0),
        creditPortion: 0.0,
        allocationNotes: 'Paid using Primary Account funds with Safe Limit active.'
      });
      setReceiptModalOpen(true);
    }
  };

  const handlePaymentCompleted = (paymentResponse) => {
    handleRefresh();
    if (paymentResponse.transactionId) {
      handleSelectTransactionReceipt(paymentResponse.transactionId);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('abms_persona_switched');
    setActiveTab('dashboard');
  };

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1328' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M4 4L11 12V20L4 12V4Z" fill="#38bdf8" />
              <path d="M20 20L13 12V4L20 12V20Z" fill="#ffffff" />
              <path d="M11 12L20 4H15L7.5 12.5L11 12Z" fill="#60a5fa" />
            </svg>
          </div>
          <div style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            NEXORA BANK
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '6px' }}>
            Loading secure banking session...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="nexora-app-layout">
      {/* 1. Left Fixed Sidebar */}
      <NexoraSidebar
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        currentUser={currentUser}
        onOpenPromo={() => setActiveTab('cards')}
        onOpenScanPay={() => setScanPayModalOpen(true)}
      />

      {/* 2. Main Wrapper with Header and Dynamic Content */}
      <div className="nexora-main-wrapper">
        <NexoraHeader
          currentUser={currentUser}
          onUserSwitched={(newUser) => {
            setCurrentUser(newUser);
            if (newUser.role === 'ADMIN') setActiveTab('admin_portal');
            else if (newUser.role === 'PARENT') setActiveTab('parent_portal');
            else setActiveTab('dashboard');
            handleRefresh();
          }}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenScanPay={() => setScanPayModalOpen(true)}
        />

        {/* Minor Account Alert Banner */}
        {currentUser.role === 'MINOR' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '16px 24px',
            margin: '20px 32px 0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.95rem' }}>
                  Under-18 Account Protected with Parental Oversight
                </div>
                <div style={{ fontSize: '0.82rem', color: '#78350f' }}>
                  Linked to parent John Davis. Transactions over ₹2,000 require parental authorization before settlement.
                </div>
              </div>
            </div>

            <button
              onClick={() => setPosSimulatorOpen(true)}
              className="btn btn-warning btn-sm"
              style={{ background: '#f59e0b', color: '#000000', fontWeight: 700 }}
            >
              <ShoppingBag size={14} /> Try Minor Purchase Simulator
            </button>
          </div>
        )}

        {/* Main Content Pages */}
        <main style={{ flex: 1 }}>
          {/* Main Dashboard (The exact UI from the image) */}
          {activeTab === 'dashboard' && (
            <NexoraDashboard
              currentUser={currentUser}
              accounts={accounts}
              cardData={cardData}
              transactions={transactions}
              onOpenQuickAction={(mode) => setQuickActionModal({ isOpen: true, mode })}
              onOpenScanPay={() => setScanPayModalOpen(true)}
              onOpenPosSimulator={() => setPosSimulatorOpen(true)}
              onSelectReceipt={handleSelectTransactionReceipt}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              onOpenAction={(mode) => setQuickActionModal({ isOpen: true, mode })}
              onRefresh={handleRefresh}
            />
          )}

          {/* Money Transfer Tab */}
          {activeTab === 'transfer' && (
            <MoneyTransferView
              accounts={accounts}
              cardData={cardData}
              onTransferSuccess={handleRefresh}
              onOpenScanPay={() => setScanPayModalOpen(true)}
            />
          )}

          {/* Smart Hybrid Cards Tab */}
          {activeTab === 'cards' && (
            <div className="nexora-content-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Smart Hybrid Card & Safe Limit</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    Dual-rail debit and revolving credit line in a single chip card with smart split allocation.
                  </p>
                </div>
                <button
                  onClick={() => setPosSimulatorOpen(true)}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)' }}
                >
                  <ShoppingBag size={16} /> Open POS Checkout Simulator
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                <HybridCardWidget
                  cardData={cardData}
                  onCardUpdated={handleRefresh}
                  onOpenPaySimulator={() => setPosSimulatorOpen(true)}
                />
                <SafeLimitControl
                  cardData={cardData}
                  onSafeLimitSaved={handleRefresh}
                />
              </div>
            </div>
          )}

          {/* Fixed Deposits Tab */}
          {activeTab === 'fixed_deposits' && (
            <FixedDepositsView onRefresh={handleRefresh} />
          )}

          {/* Loans Tab */}
          {activeTab === 'loans' && (
            <LoansView onRefresh={handleRefresh} />
          )}

          {/* Statements Tab */}
          {activeTab === 'statements' && (
            <div className="nexora-content-container">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Account Statements & Audit Ledger</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Filter, inspect, and export complete transaction histories with official split receipts.
                </p>
              </div>
              <div style={{ marginTop: '12px' }}>
                <TransactionHistory
                  onSelectTransaction={handleSelectTransactionReceipt}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <SupportView cardData={cardData} onRefresh={handleRefresh} />
          )}

          {/* Parent Oversight Portal */}
          {activeTab === 'parent_portal' && (
            <div className="nexora-content-container">
              <ParentPortal onRefreshNeeded={handleRefresh} />
            </div>
          )}

          {/* Admin Administration Portal */}
          {activeTab === 'admin_portal' && (
            <div className="nexora-content-container">
              <AdminPortal />
            </div>
          )}
        </main>
      </div>

      {/* Quick Action Modal (Deposit / Withdraw / Transfer / Repay) */}
      <QuickActionsModal
        isOpen={quickActionModal.isOpen}
        mode={quickActionModal.mode}
        accounts={accounts}
        cardData={cardData}
        onClose={() => setQuickActionModal({ isOpen: false, mode: 'deposit' })}
        onSuccess={handleRefresh}
      />

      {/* Scan & Pay QR Scanner & UPI Generator Modal */}
      <ScanAndPayModal
        isOpen={scanPayModalOpen}
        onClose={() => setScanPayModalOpen(false)}
        currentUser={currentUser}
        accounts={accounts}
        cardData={cardData}
        onPaymentSuccess={handlePaymentCompleted}
      />

      {/* Card POS Simulator Modal */}
      <CardPaymentSimulator
        isOpen={posSimulatorOpen}
        onClose={() => setPosSimulatorOpen(false)}
        onPaymentComplete={handlePaymentCompleted}
        userRole={currentUser.role}
        cardData={cardData}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => { setReceiptModalOpen(false); setSelectedReceipt(null); }}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="nexora-mobile-bottom-nav" aria-label="Mobile navigation">
        {[
          { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
          { id: 'accounts',  label: 'Accounts', icon: Wallet },
          { id: 'transfer',  label: 'Transfer', icon: ArrowLeftRight },
          { id: 'cards',     label: 'Cards',    icon: CreditCard },
          { id: 'statements',label: 'More',     icon: MoreHorizontal },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nexora-mobile-bottom-nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            id={`mobile-nav-${id}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
