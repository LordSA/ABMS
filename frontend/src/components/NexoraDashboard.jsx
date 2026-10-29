import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  TrendingUp,
  Send,
  QrCode,
  PlusCircle,
  FileText,
  Smartphone,
  MoreHorizontal,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  CreditCard,
  ShoppingBag,
  ArrowDownLeft,
  Zap,
  Play,
  Building2,
  Headphones,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function NexoraDashboard({
  currentUser,
  accounts = [],
  cardData,
  transactions = [],
  onOpenQuickAction,
  onOpenScanPay,
  onOpenPosSimulator,
  onSelectReceipt,
  onNavigateTab
}) {
  const [hideBalance, setHideBalance] = useState(false);

  // Calculate total balance across user's accounts, or fallback to exact image default
  const totalBalanceNumber = accounts.length > 0
    ? accounts.reduce((acc, a) => acc + (parseFloat(a.balance) || 0), 0)
    : 148750;

  // Format currency in Indian numbering with space: ₹ 1,48,750.00
  const formatINR = (val) => {
    const num = Math.abs(parseFloat(val) || 0);
    const parts = num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `₹ ${parts}`;
  };

  // Image fallback transactions if backend transactions list is empty or for initial display
  const defaultTransactions = [
    {
      id: 'tx-1',
      date: '27 Oct 2025',
      title: 'Amazon India',
      subtitle: 'Online Payment',
      category: 'Shopping',
      amount: -2499.00,
      status: 'Completed',
      icon: ShoppingBag,
      iconBg: '#ede9fe',
      iconColor: '#7c3aed'
    },
    {
      id: 'tx-2',
      date: '26 Oct 2025',
      title: 'Salary Credit',
      subtitle: 'Acme Technologies',
      category: 'Income',
      amount: 35000.00,
      status: 'Completed',
      icon: ArrowDownLeft,
      iconBg: '#dcfce7',
      iconColor: '#16a34a'
    },
    {
      id: 'tx-3',
      date: '24 Oct 2025',
      title: 'Electricity Bill',
      subtitle: 'Kerala Electricity Board',
      category: 'Bills',
      amount: -1240.00,
      status: 'Completed',
      icon: Zap,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7'
    },
    {
      id: 'tx-4',
      date: '22 Oct 2025',
      title: 'Money Transfer',
      subtitle: 'To Rahul S',
      category: 'Transfer',
      amount: -5000.00,
      status: 'Completed',
      icon: Send,
      iconBg: '#ccfbf1',
      iconColor: '#0d9488'
    },
    {
      id: 'tx-5',
      date: '20 Oct 2025',
      title: 'Netflix',
      subtitle: 'Subscription',
      category: 'Entertainment',
      amount: -649.00,
      status: 'Completed',
      icon: Play,
      iconBg: '#ffe4e6',
      iconColor: '#e11d48'
    },
    {
      id: 'tx-6',
      date: '18 Oct 2025',
      title: 'ATM Withdrawal',
      subtitle: 'Nexora Bank ATM',
      category: 'Cash',
      amount: -4000.00,
      status: 'Completed',
      icon: Building2,
      iconBg: '#e2e8f0',
      iconColor: '#475569'
    }
  ];

  // Helper to categorize transaction and assign matching icons and colors
  const getCategoryMeta = (desc = '', title = '', type = '') => {
    const text = (desc + ' ' + title + ' ' + type).toLowerCase();
    if (text.includes('salary') || type === 'DEPOSIT') {
      return { category: 'Income', icon: ArrowDownLeft, bg: '#dcfce7', color: '#16a34a' };
    }
    if (text.includes('amazon') || text.includes('shopping') || text.includes('retail')) {
      return { category: 'Shopping', icon: ShoppingBag, bg: '#ede9fe', color: '#7c3aed' };
    }
    if (text.includes('electricity') || text.includes('bill') || text.includes('utility')) {
      return { category: 'Bills', icon: Zap, bg: '#e0f2fe', color: '#0284c7' };
    }
    if (text.includes('netflix') || text.includes('entertainment') || text.includes('game') || text.includes('steam')) {
      return { category: 'Entertainment', icon: Play, bg: '#ffe4e6', color: '#e11d48' };
    }
    if (text.includes('atm') || text.includes('cash') || text.includes('withdrawal')) {
      return { category: 'Cash', icon: Building2, bg: '#e2e8f0', color: '#475569' };
    }
    return { category: 'Transfer', icon: Send, bg: '#ccfbf1', color: '#0d9488' };
  };

  // Merge backend transactions if available, prioritizing them
  const displayTransactions = transactions.length > 0
    ? transactions.slice(0, 6).map(t => {
        const isIncome = t.type === 'DEPOSIT';
        const meta = getCategoryMeta(t.description, t.recipient_info, t.type);
        return {
          id: t.id,
          date: new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          title: t.recipient_info || (isIncome ? 'Salary Credit' : 'Payment'),
          subtitle: t.description || t.type,
          category: meta.category,
          amount: isIncome ? t.total_amount : -t.total_amount,
          status: 'Completed',
          icon: meta.icon,
          iconBg: meta.bg,
          iconColor: meta.color,
          rawTxId: t.id
        };
      })
    : defaultTransactions;

  // Donut chart SVG calculations
  const donutData = [
    { label: 'Food & Dining', pct: 32, color: '#8b5cf6' },
    { label: 'Shopping', pct: 24, color: '#3b82f6' },
    { label: 'Travel', pct: 18, color: '#14b8a6' },
    { label: 'Bills & Utilities', pct: 14, color: '#f97316' },
    { label: 'Others', pct: 12, color: '#a855f7' }
  ];

  // Generate SVG paths for donut chart
  const createDonutArcs = () => {
    let cumulativeAngle = 0;
    const radius = 56;
    const center = 75;
    const circumference = 2 * Math.PI * radius;

    return donutData.map((d, i) => {
      const strokeDash = (d.pct / 100) * circumference;
      const strokeDashoffset = -cumulativeAngle;
      cumulativeAngle += strokeDash;

      return (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={d.color}
          strokeWidth="18"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      );
    });
  };

  return (
    <div className="nexora-content-container">
      {/* 1. Hero Mountain Landscape Banner */}
      <section className="nexora-hero-banner" id="nexora-hero-banner">
        <div
          className="nexora-hero-bg"
          style={{ backgroundImage: `url('/images/nexora_hero_mountain.jpg')` }}
        />
        <div className="nexora-hero-overlay" />

        <div className="nexora-hero-content">
          <div className="nexora-hero-left">
            <div className="nexora-hero-label">
              <span>Total Account Balance</span>
              <button
                className="nexora-eye-btn"
                onClick={() => setHideBalance(!hideBalance)}
                title={hideBalance ? "Show balance" : "Hide balance"}
                aria-label="Toggle balance visibility"
              >
                {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="nexora-hero-balance" id="nexora-hero-balance-text">
              {hideBalance ? '••••••••••' : formatINR(totalBalanceNumber)}
            </div>

            <div className="nexora-hero-trend">
              <TrendingUp size={16} />
              <span>+12.5%</span>
              <span style={{ color: '#cbd5e1', fontWeight: 400, marginLeft: '4px' }}>from last month</span>
            </div>
          </div>

          <div className="nexora-hero-right">
            “Small steps today, big dreams tomorrow.”
          </div>
        </div>

        <div className="nexora-hero-footer">
          Your money. Our priority.
        </div>
      </section>

      {/* 2. Quick Action Buttons Grid (6 White Rounded Cards) */}
      <section className="nexora-quick-actions-row">
        {/* Transfer Money */}
        <button
          className="nexora-action-card"
          onClick={() => onOpenQuickAction('transfer')}
          id="quick-action-transfer"
        >
          <div className="nexora-action-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Send size={20} />
          </div>
          <span className="nexora-action-label">Transfer Money</span>
        </button>

        {/* Scan & Pay */}
        <button
          className="nexora-action-card"
          onClick={onOpenScanPay || onOpenPosSimulator}
          id="quick-action-scan-pay"
        >
          <div className="nexora-action-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
            <QrCode size={20} />
          </div>
          <span className="nexora-action-label">Scan & Pay</span>
        </button>

        {/* Add Money */}
        <button
          className="nexora-action-card"
          onClick={() => onOpenQuickAction('deposit')}
          id="quick-action-add-money"
        >
          <div className="nexora-action-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <PlusCircle size={20} />
          </div>
          <span className="nexora-action-label">Add Money</span>
        </button>

        {/* Bill Payments */}
        <button
          className="nexora-action-card"
          onClick={() => onOpenQuickAction('bill')}
          id="quick-action-bill-payments"
        >
          <div className="nexora-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <FileText size={20} />
          </div>
          <span className="nexora-action-label">Bill Payments</span>
        </button>

        {/* Mobile Recharge */}
        <button
          className="nexora-action-card"
          onClick={() => onOpenQuickAction('recharge')}
          id="quick-action-mobile-recharge"
        >
          <div className="nexora-action-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
            <Smartphone size={20} />
          </div>
          <span className="nexora-action-label">Mobile Recharge</span>
        </button>

        {/* More */}
        <button
          className="nexora-action-card"
          onClick={() => onNavigateTab('cards')}
          id="quick-action-more"
        >
          <div className="nexora-action-icon" style={{ background: '#f8fafc', color: '#475569' }}>
            <MoreHorizontal size={20} />
          </div>
          <span className="nexora-action-label">More</span>
        </button>
      </section>

      {/* 3. Main 2-Column Dashboard Grid */}
      <div className="nexora-dashboard-grid">
        {/* Left Column: Recent Transactions & Security Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Recent Transactions Card */}
          <div className="nexora-card">
            <div className="nexora-card-header">
              <span className="nexora-card-title">Recent Transactions</span>
              <button
                className="nexora-link-action"
                onClick={() => onNavigateTab('statements')}
                id="view-all-transactions-btn"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="nexora-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.map((tx) => {
                    const Icon = tx.icon;
                    const isPositive = tx.amount > 0;
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          if (tx.rawTxId) {
                            onSelectReceipt(tx.rawTxId);
                          } else {
                            onSelectReceipt(tx);
                          }
                        }}
                        title="Click to view full receipt breakdown"
                      >
                        <td style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {tx.date}
                        </td>
                        <td>
                          <div className="nexora-tx-desc-cell">
                            <div
                              className="nexora-tx-icon-box"
                              style={{ background: tx.iconBg, color: tx.iconColor }}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <div className="nexora-tx-desc-main">{tx.title}</div>
                              <div className="nexora-tx-desc-sub">{tx.subtitle}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          {tx.category}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className={isPositive ? 'nexora-amount-positive' : 'nexora-amount-negative'}>
                            {isPositive ? `+ ${formatINR(tx.amount)}` : `- ${formatINR(Math.abs(tx.amount))}`}
                          </span>
                        </td>
                        <td>
                          <span className="nexora-status-pill">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* "Your security matters" Banner */}
          <div className="nexora-security-card">
            <div className="nexora-security-icon">
              <ShieldCheck size={22} />
            </div>
            <div className="nexora-security-text-box">
              <div className="nexora-security-title">Your security matters</div>
              <div className="nexora-security-desc">
                We use advanced encryption and multi-layer security to keep your money and data safe.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span className="nexora-security-badge">
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>●</span> Secure & Trusted →
              </span>
              <button
                onClick={() => onNavigateTab('support')}
                style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Learn More →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Accounts, Spending Overview, Platinum Card, Trust Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Your Accounts Card */}
          <div className="nexora-card">
            <div className="nexora-card-header">
              <span className="nexora-card-title">Your Accounts</span>
              <button
                className="nexora-link-action"
                onClick={() => onNavigateTab('accounts')}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(accounts && accounts.length > 0 ? accounts : [
                { id: 1, account_type: 'SAVINGS', account_number: 'NEX-4582-8821', balance: 102450.00 },
                { id: 2, account_type: 'CHECKING', account_number: 'NEX-7291-4412', balance: 22300.00 },
                { id: 3, account_type: 'FIXED_DEPOSIT', account_number: 'NEX-1034-9931', balance: 24000.00 }
              ]).map((acc, idx) => {
                const isPrimary = idx === 0;
                const isFd = acc.account_type === 'FIXED_DEPOSIT' || (acc.account_number && acc.account_number.includes('1034'));
                const last4 = acc.account_number ? acc.account_number.slice(-4) : '••••';
                const label = isFd ? 'Fixed Deposit' : (acc.account_type === 'SAVINGS' ? 'Savings Account' : 'Current Account');
                const iconBg = isPrimary ? '#2563eb' : (isFd ? '#059669' : '#4f46e5');

                return (
                  <div
                    key={acc.id || idx}
                    className="nexora-account-row"
                    onClick={() => onNavigateTab(isFd ? 'fixed_deposits' : 'accounts')}
                  >
                    <div className="nexora-account-left">
                      <div className="nexora-account-icon" style={{ background: iconBg }}>
                        {isFd ? <Lock size={18} /> : <CreditCard size={18} />}
                      </div>
                      <div>
                        <div className="nexora-account-name">{label}</div>
                        <div className="nexora-account-mask">•••• {last4}</div>
                      </div>
                    </div>
                    <div className="nexora-account-right">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div className="nexora-account-balance">{formatINR(acc.balance)}</div>
                        {isPrimary && <span className="nexora-account-tag-primary">Primary</span>}
                        {isFd && <span className="nexora-account-subtext">Active Term Deposit</span>}
                      </div>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spending Overview Card */}
          <div className="nexora-card">
            <div className="nexora-card-header">
              <span className="nexora-card-title">Spending Overview</span>
              <button
                className="nexora-link-action"
                onClick={() => onNavigateTab('statements')}
              >
                Last 6 Months <ArrowRight size={14} />
              </button>
            </div>

            <div className="nexora-donut-wrapper">
              {/* SVG Donut Chart */}
              <div className="nexora-donut-chart-box">
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                  {createDonutArcs()}
                </svg>
                <div className="nexora-donut-center-text">
                  <div className="nexora-donut-center-amount">₹ 58,620</div>
                  <div className="nexora-donut-center-label">Total Spent</div>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="nexora-donut-legend">
                {donutData.map((d, i) => (
                  <div key={i} className="nexora-legend-item">
                    <div className="nexora-legend-label">
                      <span className="nexora-legend-dot" style={{ background: d.color }} />
                      <span>{d.label}</span>
                    </div>
                    <span className="nexora-legend-pct">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upgrade to Nexora Platinum Card Card */}
          <div className="nexora-platinum-card">
            <div
              className="nexora-platinum-bg-img"
              style={{ backgroundImage: `url('/images/nexora_platinum_cards.jpg')` }}
            />
            <div className="nexora-platinum-content">
              <div className="nexora-platinum-title">Upgrade to Nexora Platinum Card</div>
              <div className="nexora-platinum-desc">More rewards. More freedom.</div>
              <button
                className="nexora-platinum-btn"
                onClick={() => onNavigateTab('cards')}
                id="know-more-platinum-btn"
              >
                Know More <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Trust Badges Bar */}
          <div className="nexora-trust-bar">
            <div className="nexora-trust-item">
              <Headphones size={20} className="nexora-trust-icon" />
              <div className="nexora-trust-title">24/7</div>
              <div className="nexora-trust-sub">Customer Support</div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />
            <div className="nexora-trust-item">
              <ShieldCheck size={20} className="nexora-trust-icon" />
              <div className="nexora-trust-title">100%</div>
              <div className="nexora-trust-sub">Secure Banking</div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />
            <div className="nexora-trust-item">
              <Zap size={20} className="nexora-trust-icon" />
              <div className="nexora-trust-title">Easy</div>
              <div className="nexora-trust-sub">& Fast</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
