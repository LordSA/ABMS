import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Lock,
  Percent,
  FileText,
  Headphones,
  Users,
  ShieldAlert,
  ArrowRight,
  Menu,
  X,
  QrCode
} from 'lucide-react';

export default function NexoraSidebar({ activeTab, onTabSelect, currentUser, onOpenPromo, onOpenScanPay }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isParent = currentUser?.role === 'PARENT';
  const isAdmin  = currentUser?.role === 'ADMIN';

  // Close on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavClick = (id) => {
    if (id === 'scan_pay') {
      onOpenScanPay && onOpenScanPay();
      setMobileOpen(false);
      return;
    }
    onTabSelect(id);
    setMobileOpen(false);
  };

  const navItems = isAdmin
    ? [
        { id: 'admin_portal',   label: 'Admin & Ledger',  icon: ShieldAlert },
        { id: 'statements',     label: 'Audit Statements', icon: FileText },
        { id: 'support',        label: 'System Support',  icon: Headphones }
      ]
    : isParent
    ? [
        { id: 'parent_portal',  label: 'Parent Approvals', icon: Users },
        { id: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
        { id: 'accounts',       label: 'Accounts',        icon: Wallet },
        { id: 'transfer',       label: 'Money Transfer',  icon: ArrowLeftRight },
        { id: 'scan_pay',       label: 'Scan & Pay (UPI)', icon: QrCode },
        { id: 'cards',          label: 'Cards',           icon: CreditCard },
        { id: 'statements',     label: 'Statements',      icon: FileText },
        { id: 'support',        label: 'Support',         icon: Headphones }
      ]
    : [
        { id: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
        { id: 'accounts',       label: 'Accounts',        icon: Wallet },
        { id: 'transfer',       label: 'Money Transfer',  icon: ArrowLeftRight },
        { id: 'scan_pay',       label: 'Scan & Pay (UPI)', icon: QrCode },
        { id: 'cards',          label: 'Cards',           icon: CreditCard },
        { id: 'fixed_deposits', label: 'Fixed Deposits',  icon: Lock },
        { id: 'loans',          label: 'Loans',           icon: Percent },
        { id: 'statements',     label: 'Statements',      icon: FileText },
        { id: 'support',        label: 'Support',         icon: Headphones }
      ];

  const renderSidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <div className="nexora-brand">
        <div className="nexora-logo-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 4L11 12V20L4 12V4Z" fill="#38bdf8" />
            <path d="M20 20L13 12V4L20 12V20Z" fill="#ffffff" fillOpacity="0.95" />
            <path d="M11 12L20 4H15L7.5 12.5L11 12Z" fill="#60a5fa" />
          </svg>
        </div>
        <div className="nexora-logo-text">NEXORA <span style={{ fontWeight: 400, opacity: 0.85, fontSize: '0.9em' }}>BANK</span></div>

        {/* Mobile close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="nexora-mobile-close-btn"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="nexora-nav-menu" style={{ flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`nexora-nav-item ${isActive ? 'active' : ''}`}
              id={`sidebar-nav-${item.id}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Promo Card */}
      <div className="nexora-sidebar-promo">
        <div className="nexora-promo-image-box">
          <img
            src="/images/nexora_sprout_coins.jpg"
            alt="Build a brighter financial future"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="nexora-promo-title">Build a brighter financial future</div>
        <div className="nexora-promo-subtitle">
          Explore our savings, investment and loan options tailored for you.
        </div>
        <button
          onClick={() => { onOpenPromo(); setMobileOpen(false); }}
          className="nexora-promo-btn"
          id="sidebar-promo-btn"
        >
          Explore Now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="nexora-sidebar nexora-sidebar-desktop">
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile hamburger trigger (in header slot) ── */}
      <button
        className="nexora-hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        id="mobile-menu-btn"
      >
        <Menu size={22} />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="nexora-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`nexora-sidebar nexora-sidebar-mobile ${mobileOpen ? 'open' : ''}`}>
        {renderSidebarContent()}
      </aside>
    </>
  );
}
