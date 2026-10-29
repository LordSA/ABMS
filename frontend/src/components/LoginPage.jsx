import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  Smartphone,
  Sparkles,
  ArrowRight,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import { apiRequest, setToken } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  // 'login' | 'signup'
  const [currentStep, setCurrentStep] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Form fields: clean initial state requiring user input
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('alex@nexora.bank');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer'); // 'customer' | 'student' | 'parent' | 'admin'

  const rolePresets = [
    { id: 'customer', label: 'Personal', email: 'alex@nexora.bank', desc: 'Customer Account' },
    { id: 'student', label: 'Student', email: 'student@nexora.bank', desc: 'Minor Account (Under-18)' },
    { id: 'parent', label: 'Parent', email: 'parent@nexora.bank', desc: 'Parent Guardian Portal' },
    { id: 'admin', label: 'Admin', email: 'admin@nexora.bank', desc: 'System Administrator' }
  ];

  const handleSelectRolePreset = (preset) => {
    setSelectedRole(preset.id);
    setIdentifier(preset.email);
    setError('');
  };

  // Login submission: requires genuine email and password
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailToUse = identifier.trim();
    if (!emailToUse) {
      setError('Please enter your account email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', 'POST', {
        email: emailToUse,
        password: password
      });
      setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up submission
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const emailToUse = identifier.includes('@')
        ? identifier.trim()
        : `${identifier.replace(/[^a-zA-Z0-9]/g, '') || 'user'}@nexora.bank`;

      await apiRequest('/auth/register', 'POST', {
        name: name || 'Nexora Customer',
        email: emailToUse,
        password: password || 'bank1234',
        phone: identifier.includes('@') ? '+91 98765 43210' : identifier
      });

      // Automatically sign in upon registration
      const res = await apiRequest('/auth/login', 'POST', {
        email: emailToUse,
        password: password || 'bank1234'
      });
      setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Horizontal Logo (for desktop top navbar)
  const HorizontalLogo = ({ dark = false }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
        <path d="M7 6L16 16.5V29L7 18.5V6Z" fill="#38bdf8" />
        <path d="M29 29L20 18.5V6L29 16.5V29Z" fill={dark ? '#0f172a' : '#ffffff'} fillOpacity={dark ? '0.95' : '1'} />
        <path d="M16 16.5L29 6H22L11 17.5L16 16.5Z" fill="#2563eb" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <div style={{
          fontFamily: 'var(--font-display, Inter, sans-serif)',
          fontSize: '1.25rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: dark ? '#0f172a' : '#ffffff',
          lineHeight: 1.1
        }}>
          NEXORA
        </div>
        <div style={{
          fontSize: '0.66rem',
          color: dark ? '#64748b' : '#93c5fd',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          lineHeight: 1
        }}>
          BANK
        </div>
      </div>
    </div>
  );

  // Vertically Stacked Logo (for mobile header & desktop card - exactly matching mockup)
  const StackedLogo = ({ dark = true }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
        <path d="M7 6L16 16.5V29L7 18.5V6Z" fill="#38bdf8" />
        <path d="M29 29L20 18.5V6L29 16.5V29Z" fill={dark ? '#0f172a' : '#ffffff'} fillOpacity={dark ? '0.95' : '1'} />
        <path d="M16 16.5L29 6H22L11 17.5L16 16.5Z" fill="#2563eb" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display, Inter, sans-serif)',
          fontSize: '1.24rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: dark ? '#0f172a' : '#ffffff',
          lineHeight: 1.1
        }}>
          NEXORA
        </div>
        <div style={{
          fontSize: '0.68rem',
          color: dark ? '#475569' : '#93c5fd',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          lineHeight: 1,
          marginTop: '2px'
        }}>
          BANK
        </div>
      </div>
    </div>
  );

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
      setError('Google Sign-In is not configured. Please use a Demo Persona or enter your email and password.');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setLoading(true);
            setError('');
            const res = await apiRequest('/auth/google', 'POST', {
              credential: response.credential
            });
            setToken(res.token);
            onLoginSuccess(res.user);
          } catch (err) {
            setError(err.message || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        }
      });
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In service is not ready in this browser context. Please sign in with your email and password.');
    }
  };

  // Google Continue Button
  const GoogleButton = () => (
    <button
      type="button"
      onClick={handleGoogleLogin}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        background: '#ffffff',
        color: '#1e293b',
        fontWeight: 600,
        fontSize: '0.92rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.background = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.background = '#ffffff';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.02h3.88c2.28-2.1 3.66-5.18 3.66-9.11z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.12C3.26 21.36 7.33 24 12 24z" />
        <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
      </svg>
      <span>Continue with Google</span>
    </button>
  );

  const inputStyle = {
    width: '100%',
    padding: '13px 14px 13px 42px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '0.92rem',
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none'
  };

  return (
    <div className="nexora-auth-viewport">
      {/* Dynamic CSS matching Desktop & Mobile mockups precisely */}
      <style>{`
        .nexora-auth-viewport {
          min-height: 100vh;
          width: 100%;
          font-family: var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
          position: relative;
          display: flex;
          flex-direction: column;
          color: #0f172a;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /* DESKTOP VIEW (Screens 960px and wider) */
        @media (min-width: 960px) {
          .nexora-auth-viewport {
            height: 100vh;
            overflow: hidden;
            background: #09132e;
            background-image:
              linear-gradient(90deg, rgba(7, 16, 40, 0.92) 0%, rgba(7, 16, 40, 0.82) 36%, rgba(7, 16, 40, 0.40) 65%, rgba(7, 16, 40, 0.12) 100%),
              url('/images/nexora_villa_dusk.jpg');
            background-size: cover;
            background-position: center right;
            background-repeat: no-repeat;
          }

          .nexora-desktop-navbar {
            display: flex !important;
          }
          .nexora-desktop-hero {
            display: flex !important;
          }
          .nexora-desktop-layout {
            display: grid !important;
            grid-template-columns: 1fr 480px;
            align-items: center;
            max-width: 1360px;
            margin: 0 auto;
            width: 100%;
            flex: 1;
            padding: 10px 48px 30px 48px;
            box-sizing: border-box;
            gap: 48px;
          }
          .nexora-mobile-header {
            display: none !important;
          }
          .nexora-mobile-bottom-banner {
            display: none !important;
          }
          .nexora-mobile-wave {
            display: none !important;
          }
          .nexora-desktop-footer-row {
            display: block !important;
          }
          .nexora-card-logo-desktop {
            display: flex !important;
          }
          .nexora-auth-card {
            background: #ffffff !important;
            border-radius: 26px !important;
            box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
            padding: 38px 34px !important;
            width: 100% !important;
            max-width: 440px !important;
            margin-left: auto !important;
          }
        }

        /* MOBILE VIEW (Screens under 960px) */
        @media (max-width: 959px) {
          .nexora-auth-viewport {
            background: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
          }
          .nexora-desktop-navbar {
            display: none !important;
          }
          .nexora-desktop-hero {
            display: none !important;
          }
          .nexora-desktop-layout {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            flex: 1;
          }
          .nexora-mobile-header {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justifyContent: center;
            height: 180px;
            background-image: url('/images/nexora_mobile_mountains.jpg');
            background-size: cover;
            background-position: center bottom;
            position: relative;
            padding: 16px 18px 20px 18px;
            box-sizing: border-box;
          }
          .nexora-mobile-bottom-banner {
            display: flex !important;
          }
          .nexora-desktop-footer-row {
            display: none !important;
          }
          .nexora-card-logo-desktop {
            display: none !important;
          }
          .nexora-auth-card {
            background: #ffffff !important;
            border-radius: 30px 30px 0 0 !important;
            padding: 32px 24px 30px 24px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.08) !important;
            margin-top: -24px !important;
            position: relative;
            z-index: 10;
            flex: 1;
          }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 1. TOP NAVBAR (Desktop only)                                         */}
      {/* ==================================================================== */}
      <nav
        className="nexora-desktop-navbar"
        style={{
          width: '100%',
          padding: '20px 48px',
          boxSizing: 'border-box',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50
        }}
      >
        <div style={{ cursor: 'pointer' }} onClick={() => setCurrentStep('login')}>
          <HorizontalLogo dark={false} />
        </div>

        <div style={{
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.94rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>Smarter Banking</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Better Tomorrow</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.84rem',
            fontWeight: 500,
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <ShieldCheck size={16} color="#60a5fa" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* 2. MOBILE TOP HEADER (Scenic Mountains + Notch + Stacked Logo)      */}
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* 2. MOBILE TOP HEADER (Scenic Mountains + Stacked Brand Logo)         */}
      {/* ==================================================================== */}
      <div className="nexora-mobile-header">
        {/* Centered Vertically Stacked Brand Logo */}
        <div style={{ zIndex: 5, margin: 'auto 0 10px 0' }}>
          <StackedLogo dark={true} />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MAIN WORKSPACE: Desktop Split & Mobile Form Sheet                */}
      {/* ==================================================================== */}
      <div className="nexora-desktop-layout">
        {/* ============================================================== */}
        {/* 3A. DESKTOP LEFT COLUMN: Hero Headline & 3 Feature Badges      */}
        {/* ============================================================== */}
        <div className="nexora-desktop-hero" style={{
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#ffffff',
          maxWidth: '560px'
        }}>
          <h1 style={{
            margin: '0 0 14px 0',
            lineHeight: 1.12,
            letterSpacing: '-0.025em'
          }}>
            <div style={{ fontSize: '3.3rem', fontWeight: 800, color: '#ffffff' }}>
              Your Goals.
            </div>
            <div style={{ fontSize: '3.3rem', fontWeight: 800, color: '#60a5fa' }}>
              Our Priority.
            </div>
          </h1>

          <p style={{
            fontSize: '1.08rem',
            color: '#cbd5e1',
            lineHeight: 1.5,
            margin: '0 0 42px 0',
            maxWidth: '460px'
          }}>
            Modern banking for a brighter and more secure tomorrow.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
            {/* 1. Secure Transactions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.45) 0%, rgba(59, 130, 246, 0.25) 100%)',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={22} color="#93c5fd" />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
                  Secure Transactions
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                  Your money, your security.
                </div>
              </div>
            </div>

            {/* 2. Smart Banking */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.45) 0%, rgba(59, 130, 246, 0.25) 100%)',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Smartphone size={22} color="#93c5fd" />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
                  Smart Banking
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                  Manage everything in one place.
                </div>
              </div>
            </div>

            {/* 3. Better Future */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.45) 0%, rgba(59, 130, 246, 0.25) 100%)',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Shield size={22} color="#93c5fd" />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
                  Better Future
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                  Together towards your goals.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3B. WHITE AUTH CARD                                            */}
        {/* ============================================================== */}
        <div className="nexora-auth-card">
          {/* Card Top Brand Logo (Shown on desktop only; mobile has it in header) */}
          <div className="nexora-card-logo-desktop" style={{ justifyContent: 'center', marginBottom: '20px' }}>
            <StackedLogo dark={true} />
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h2 style={{
              fontSize: '1.55rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 5px 0',
              letterSpacing: '-0.02em'
            }}>
              {currentStep === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
              {currentStep === 'login'
                ? 'Sign in to continue your banking journey.'
                : 'Get started with NEXORA Bank in a few simple steps.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '11px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.84rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* ============================================================ */}
          {/* LOGIN FORM                                                   */}
          {/* ============================================================ */}
          {currentStep === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Account Portal Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    Select Account Portal
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                    Official Bank Accounts
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  background: '#f1f5f9',
                  padding: '5px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {rolePresets.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRolePreset(r)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #93c5fd' : '1px solid transparent',
                          background: isSelected ? '#ffffff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#64748b',
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.08)' : 'none',
                          transition: 'all 0.15s ease',
                          textAlign: 'center'
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {selectedRole && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.73rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>
                      {rolePresets.find(r => r.id === selectedRole)?.desc}
                    </span>
                    <span>• Enter password (bank1234) to sign in</span>
                  </div>
                )}
              </div>
              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94a3b8" style={iconStyle} />
                  <input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={iconStyle} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, padding: '13px 42px 13px 42px' }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => alert('For password recovery assistance, please reach out to Nexora Support at support@nexora.bank.')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Log In -> Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '4px',
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{loading ? 'Logging In...' : 'Log In'}</span>
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* SIGN UP FORM                                                 */}
          {/* ============================================================ */}
          {currentStep === 'signup' && (
            <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#94a3b8" style={iconStyle} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94a3b8" style={iconStyle} />
                  <input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={iconStyle} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, padding: '13px 42px 13px 42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '4px',
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {/* Separator "or" */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '18px 0',
            color: '#94a3b8',
            fontSize: '0.82rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Google Button */}
          <GoogleButton />

          {/* Desktop Switch Link */}
          <div className="nexora-desktop-footer-row" style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '0.88rem',
            color: '#64748b'
          }}>
            {currentStep === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setCurrentStep('signup'); setError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setCurrentStep('login'); setError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

          {/* Mobile Bottom Sign-Up Card Banner (Exact match with reference mockup) */}
          <div
            className="nexora-mobile-bottom-banner"
            onClick={() => {
              setCurrentStep(currentStep === 'login' ? 'signup' : 'login');
              setError('');
            }}
            style={{
              marginTop: '20px',
              background: '#eff6ff',
              border: '1.5px solid #dbeafe',
              borderRadius: '16px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserPlus size={20} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {currentStep === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {currentStep === 'login' ? 'Sign Up →' : 'Sign In →'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Wave at the bottom (mobile) matching layered soft hills */}
      <div className="nexora-mobile-wave" style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        lineHeight: 0,
        pointerEvents: 'none',
        background: '#ffffff'
      }}>
        <svg viewBox="0 0 1440 100" fill="none" style={{ width: '100%', height: '55px', display: 'block' }}>
          <path
            d="M0,40L80,52C160,64,320,88,480,84C640,80,800,48,960,42C1120,36,1280,56,1360,66L1440,76L1440,100L0,100Z"
            fill="#eff6ff"
            fillOpacity="0.8"
          />
          <path
            d="M0,60L80,68C160,76,320,92,480,90C640,88,800,72,960,68C1120,64,1280,76,1360,82L1440,88L1440,100L0,100Z"
            fill="#dbeafe"
            fillOpacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
