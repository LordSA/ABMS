import React, { useState } from 'react';
import { CreditCard, Eye, EyeOff, Lock, Unlock, Key, Shield, ArrowUpRight, Sparkles } from 'lucide-react';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function HybridCardWidget({ cardData, onCardUpdated, onOpenPaySimulator }) {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!cardData) return null;

  const isFrozen = cardData.status === 'FROZEN';

  const formatCardNumber = (num) => {
    if (!num) return '•••• •••• •••• ••••';
    if (showCardNumber) {
      return num.replace(/(\d{4})/g, '$1 ').trim();
    }
    return `•••• •••• •••• ${num.slice(-4)}`;
  };

  const handleToggleFreeze = async () => {
    try {
      setLoading(true);
      await apiRequest('/cards/toggle-freeze', 'POST');
      onCardUpdated && onCardUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');
    try {
      setLoading(true);
      await apiRequest('/cards/update-pin', 'POST', { currentPin, newPin });
      setPinSuccess('PIN updated successfully!');
      setTimeout(() => {
        setPinModalOpen(false);
        setCurrentPin('');
        setNewPin('');
        setPinSuccess('');
      }, 1500);
      onCardUpdated && onCardUpdated();
    } catch (err) {
      setPinError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const usedCredit = Math.max(0, (cardData.credit_limit || 0) - (cardData.available_credit || 0));
  const creditUsagePct = cardData.credit_limit > 0 ? (usedCredit / cardData.credit_limit) * 100 : 0;
  const totalPower = parseFloat(cardData.debit_balance || 0) + parseFloat(cardData.available_credit || 0);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      padding: '28px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <CreditCard size={20} />
            </div>
            Smart Hybrid Card
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Single chip combining checking debit & revolving credit with real-time automatic split
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onOpenPaySimulator && onOpenPaySimulator()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isFrozen ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              opacity: isFrozen ? 0.6 : 1
            }}
            disabled={isFrozen}
          >
            <ArrowUpRight size={15} /> Card POS Simulator
          </button>
          <button
            onClick={handleToggleFreeze}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: isFrozen ? '#dcfce7' : '#f8fafc',
              color: isFrozen ? '#166534' : '#334155',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {isFrozen ? <Unlock size={14} color="#16a34a" /> : <Lock size={14} color="#64748b" />}
            {isFrozen ? 'Unfreeze Card' : 'Freeze Card'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'center' }}>
        {/* Physical Card Representation */}
        <div style={{ maxWidth: '380px', margin: '0 auto', width: '100%' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #091226 0%, #0f172a 50%, #1e293b 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.35)',
            color: '#ffffff',
            overflow: 'hidden'
          }}>
            {/* Frozen Overlay */}
            {isFrozen && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                zIndex: 10,
                borderRadius: '20px'
              }}>
                <Lock size={32} color="#f87171" />
                <span style={{ fontWeight: 800, letterSpacing: '0.08em', color: '#f87171', fontSize: '0.9rem' }}>
                  CARD TEMPORARILY FROZEN
                </span>
              </div>
            )}

            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.95rem' }}>NEXORA</span>
                <span style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  border: '1px solid rgba(56, 189, 248, 0.4)'
                }}>
                  HYBRID DUAL-RAIL
                </span>
              </div>
              <div style={{ display: 'flex', gap: '-6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eb001b', opacity: 0.95 }} />
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f79e1b', opacity: 0.95, marginLeft: '-10px' }} />
              </div>
            </div>

            {/* Chip + Contactless */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '28px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)'
              }} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                <path d="M15.5 21.5a12 12 0 0 0 0-19" />
              </svg>
            </div>

            {/* Card Number */}
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1.25rem',
              letterSpacing: '0.14em',
              fontWeight: 700,
              color: '#ffffff'
            }}>
              {formatCardNumber(cardData.card_number)}
            </div>

            {/* Bottom details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                  Cardholder
                </div>
                <div style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                  {cardData.card_holder_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                  Expires
                </div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {String(cardData.expiry_month).padStart(2, '0')}/{String(cardData.expiry_year).slice(-2)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                  CVV
                </div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {showCvv ? cardData.cvv : '•••'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick reveal toggles */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={() => setShowCardNumber(!showCardNumber)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showCardNumber ? <EyeOff size={13} /> : <Eye size={13} />}
              {showCardNumber ? 'Mask' : 'Show Number'}
            </button>
            <button
              onClick={() => setShowCvv(!showCvv)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showCvv ? <EyeOff size={13} /> : <Eye size={13} />}
              {showCvv ? 'Hide CVV' : 'Reveal CVV'}
            </button>
            <button
              onClick={() => setPinModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Key size={13} /> Change PIN
            </button>
          </div>
        </div>

        {/* Dynamic Dual Balance Breakdown & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Source 1: Debit Balance Card */}
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '18px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                Source 1: Debit Account Balance
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: '#dcfce7',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                PRIMARY
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {formatINR(cardData.debit_balance || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              Linked Account: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{cardData.account_number}</strong>
            </div>
          </div>

          {/* Source 2: Credit Limit Card */}
          <div style={{
            background: '#f5f3ff',
            border: '1.5px solid #ddd6fe',
            borderRadius: '16px',
            padding: '18px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }} />
                Source 2: Available Credit Line
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: '#ede9fe',
                color: '#6b21a8',
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                REVOLVING
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {formatINR(cardData.available_credit || 0)}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                of {formatINR(cardData.credit_limit || 0)} limit
              </div>
            </div>

            {/* Credit progress bar */}
            <div style={{
              height: '6px',
              width: '100%',
              background: '#e9d5ff',
              borderRadius: '999px',
              overflow: 'hidden',
              margin: '10px 0 6px 0'
            }}>
              <div style={{
                height: '100%',
                width: `${creditUsagePct}%`,
                background: '#7c3aed',
                borderRadius: '999px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Used Credit: {formatINR(usedCredit)}</span>
              <span>{creditUsagePct.toFixed(1)}% Used</span>
            </div>
          </div>

          {/* Total Combined Purchasing Power */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
              Total Combined Purchasing Power:
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {formatINR(totalPower)}
            </div>
          </div>
        </div>
      </div>

      {/* Change PIN Modal */}
      {pinModalOpen && (
        <div className="modal-overlay" onClick={() => setPinModalOpen(false)} style={{ zIndex: 1200 }}>
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)'
            }}
          >
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Update Hybrid Card PIN
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '18px' }}>
              Set a secure 4-digit PIN for POS swipe and terminal approvals.
            </p>

            <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Current PIN
                </label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '1rem',
                    letterSpacing: '0.3em',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '1rem',
                    letterSpacing: '0.3em',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {pinError && (
                <div style={{ color: '#b91c1c', fontSize: '0.82rem', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px' }}>
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div style={{ color: '#166534', fontSize: '0.82rem', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px' }}>
                  {pinSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
