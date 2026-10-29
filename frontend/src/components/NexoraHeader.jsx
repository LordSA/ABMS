import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Check,
  User,
  LogOut,
  Sparkles,
  Users,
  ShieldCheck,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { apiRequest, setToken } from '../api';

export default function NexoraHeader({
  currentUser,
  onUserSwitched,
  onLogout,
  searchQuery,
  onSearchChange,
  onOpenScanPay
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch notifications
  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await apiRequest('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 7000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', 'POST');
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Avatar path helper
  const isAlex = currentUser?.name?.toLowerCase().includes('alex');
  const avatarSrc = isAlex ? '/images/alex_mathew_avatar.jpg' : null;

  const getUserSubtitle = (role) => {
    switch (role) {
      case 'ADMIN': return 'System Administrator';
      case 'PARENT': return 'Parent Guardian';
      case 'MINOR': return 'Student / Minor Account';
      default: return 'Premium Customer';
    }
  };

  return (
    <header className="nexora-header">
      {/* Hamburger slot (mobile sidebar button renders here via CSS positioning) */}
      <div className="nexora-mobile-menu-slot" />

      {/* Search Input Bar */}
      <div className="nexora-search-bar">
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search transactions, services..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          id="nexora-global-search"
        />
      </div>

      {/* Header Actions */}
      <div className="nexora-header-actions">
        {/* Quick Scan & Pay Button */}
        <button
          onClick={onOpenScanPay}
          title="Scan & Pay (UPI)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #bfdbfe',
            color: '#1d4ed8',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          id="header-scan-pay-btn"
        >
          <QrCode size={16} />
          <span className="nexora-header-btn-text">Scan & Pay</span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="nexora-icon-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-label="Notifications"
            id="nexora-bell-btn"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="nexora-notif-dot" />}
          </button>

          {/* Notifications Dropdown */}
          {showNotifMenu && (
            <div className="nexora-dropdown-menu" style={{ width: '340px', right: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #f8fafc',
                        background: n.is_read ? 'transparent' : '#f0fdf4',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div
            className="nexora-user-profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            id="nexora-profile-menu-btn"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={currentUser?.name || 'User'}
                className="nexora-user-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div
                className="nexora-user-avatar"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            )}

            <div className="nexora-user-info nexora-hide-mobile">
              <span className="nexora-user-name">{currentUser?.name || 'Alex Mathew'}</span>
              <span className="nexora-user-role">{getUserSubtitle(currentUser?.role)}</span>
            </div>

            <ChevronDown size={14} color="#94a3b8" className="nexora-hide-mobile" />
          </div>

          {/* Secure Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="nexora-dropdown-menu" style={{ width: '280px', padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '16px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                  {currentUser?.name || 'Nexora User'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                  {currentUser?.email || ''}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: currentUser?.role === 'ADMIN' ? '#b45309' : currentUser?.role === 'MINOR' ? '#2563eb' : '#059669',
                    background: currentUser?.role === 'ADMIN' ? '#fef3c7' : currentUser?.role === 'MINOR' ? '#eff6ff' : '#ecfdf5',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    <ShieldCheck size={12} />
                    {getUserSubtitle(currentUser?.role)}
                  </span>
                </div>
              </div>

              <div style={{ padding: '8px' }}>
                <button
                  onClick={onLogout}
                  className="nexora-dropdown-item"
                  style={{
                    color: '#ef4444',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
