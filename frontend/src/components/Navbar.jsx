import React, { useState, useEffect } from 'react';
import { Landmark, Bell, Shield, Users, LogOut, Check, ChevronDown, Sparkles } from 'lucide-react';
import { apiRequest, setToken } from '../api';

export default function Navbar({ currentUser, onUserSwitched, onLogout }) {
  const [demoUsers, setDemoUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Fetch demo users for easy evaluation
  useEffect(() => {
    apiRequest('/auth/demo-users')
      .then(res => setDemoUsers(res.demoUsers || []))
      .catch(console.error);
  }, []);

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
    const interval = setInterval(loadNotifications, 6000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', 'POST');
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchUser = async (user) => {
    try {
      // Login as demo user with standard password 'bank1234'
      const res = await apiRequest('/auth/login', 'POST', {
        email: user.email,
        password: 'bank1234'
      });
      setToken(res.token);
      setShowSwitcher(false);
      onUserSwitched && onUserSwitched(res.user);
    } catch (err) {
      alert('Failed to switch user: ' + err.message);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <span className="badge badge-danger">ADMIN</span>;
      case 'PARENT': return <span className="badge badge-indigo">PARENT</span>;
      case 'MINOR': return <span className="badge badge-warning">MINOR (UNDER 18)</span>;
      default: return <span className="badge badge-cyan">CUSTOMER</span>;
    }
  };

  return (
    <nav style={{
      background: 'rgba(8, 12, 21, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 500,
      padding: '12px 24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Landmark size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                ABMS
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                BANK 2.0
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
              Advanced Bank Management System
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Quick Demo Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowSwitcher(!showSwitcher); setShowNotifs(false); }}
              className="btn btn-secondary btn-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                borderColor: 'rgba(99, 102, 241, 0.3)'
              }}
            >
              <Sparkles size={14} color="#818cf8" />
              <span>Switch Role Demo</span>
              <ChevronDown size={14} />
            </button>

            {showSwitcher && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  width: '280px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  padding: '8px',
                  zIndex: 600
                }}
              >
                <div style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Select Persona to Evaluate
                </div>

                {demoUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px',
                      background: currentUser?.id === u.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease'
                    }}
                    className="demo-user-item"
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    {getRoleBadge(u.role)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowSwitcher(false); }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 10px', position: 'relative' }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#f43f5e',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotifs && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  width: '360px',
                  maxHeight: '440px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 600
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Real-Time Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                          border: n.is_read ? '1px solid transparent' : '1px solid rgba(99, 102, 241, 0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ffffff' }}>{n.title}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {currentUser.name.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff' }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px', marginLeft: '4px' }}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
