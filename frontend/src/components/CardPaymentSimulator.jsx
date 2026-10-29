import React, { useState, useEffect } from 'react';
import { ShoppingBag, CreditCard, Shield, AlertTriangle, CheckCircle, X, ArrowRight, Store, Sparkles } from 'lucide-react';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SAMPLE_MERCHANTS = [
  { name: 'Amazon India', category: 'Retail', defaultAmount: 2499.00 },
  { name: 'Flipkart Online', category: 'Electronics', defaultAmount: 8490.00 },
  { name: 'Epic Games & Steam', category: 'Entertainment / Minor', defaultAmount: 650.00 },
  { name: 'Apple Store India', category: 'Tech & Gadgets', defaultAmount: 18999.00 },
  { name: 'Kerala Electricity Board', category: 'Utility', defaultAmount: 1240.00 },
  { name: 'Swiggy & Zomato', category: 'Food & Dining', defaultAmount: 480.00 }
];

export default function CardPaymentSimulator({ isOpen, onClose, onPaymentComplete, userRole, cardData }) {
  const [merchant, setMerchant] = useState(SAMPLE_MERCHANTS[0].name);
  const [customMerchant, setCustomMerchant] = useState('');
  const [amount, setAmount] = useState(SAMPLE_MERCHANTS[0].defaultAmount);
  const [purpose, setPurpose] = useState('Online Shopping');
  const [pin, setPin] = useState(cardData?.pin || '1234');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cardData?.pin) {
      setPin(cardData.pin);
    }
  }, [cardData, isOpen]);

  // Fetch allocation preview on amount change
  useEffect(() => {
    if (!isOpen || !amount || amount <= 0) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiRequest('/cards/preview-payment', 'POST', { amount: parseFloat(amount) });
        setPreview(res.preview);
      } catch (err) {
        setError(err.message);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, amount]);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectMerchant = (m) => {
    setMerchant(m.name);
    setAmount(m.defaultAmount);
    setPurpose(`${m.category} Purchase`);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    setError('');
    setResult(null);

    const targetMerchant = customMerchant.trim() || merchant;

    try {
      const response = await apiRequest('/cards/pay', 'POST', {
        amount: parseFloat(amount),
        merchant: targetMerchant,
        purpose,
        pin
      });

      setResult(response);
      if (response.success && onPaymentComplete) {
        onPaymentComplete(response);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          color: '#0f172a'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Smart Hybrid POS Simulator
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Test dual-rail debit/credit automatic split and parental checks
              </p>
            </div>
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
              color: '#64748b'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px' }}>
          {result ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {result.status === 'SUCCESS' && (
                <div>
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
                    <CheckCircle size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Payment Approved & Settled!
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Reference: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{result.referenceId}</strong>
                  </p>

                  {result.allocation && (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '20px',
                      textAlign: 'left'
                    }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '10px', fontSize: '0.88rem' }}>
                        Automatic Split Execution Breakdown:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Deducted from Debit:</span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatINR(result.allocation.debitDeducted)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Charged to Credit Line:</span>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{formatINR(result.allocation.creditDeducted)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Safe Limit Preserved:</span>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{formatINR(result.allocation.safeLimitAmount)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

              {result.status === 'PENDING_APPROVAL' && (
                <div>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#d97706'
                  }}>
                    <AlertTriangle size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Parental Approval Required
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                    {result.message}
                  </p>
                  <div style={{
                    background: '#fffbeb',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #fde68a',
                    marginBottom: '20px',
                    textAlign: 'left',
                    fontSize: '0.85rem'
                  }}>
                    <div>Authorization Code: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{result.requestCode}</strong></div>
                    <div style={{ marginTop: '6px', color: '#78350f' }}>
                      Notification sent to registered parent. Waiting for approval.
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#d97706',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Preset Merchants */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Quick Merchant Presets:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {SAMPLE_MERCHANTS.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMerchant(m)}
                      style={{
                        padding: '10px 12px',
                        background: merchant === m.name ? '#eff6ff' : '#f8fafc',
                        border: `1.5px solid ${merchant === m.name ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {m.category} • {formatINR(m.defaultAmount)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Transaction Amount (₹)
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
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* PIN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Card PIN (Default: 1234)
                </label>
                <input
                  type="password"
                  maxLength="6"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontSize: '1rem',
                    fontWeight: 700,
                    letterSpacing: '0.3em',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Live Split Preview Box */}
              {preview && (
                <div style={{
                  padding: '14px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  fontSize: '0.84rem'
                }}>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#16a34a" /> Live Hybrid Card Allocation Preview:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                    <span>Debit Source:</span>
                    <strong>{formatINR(preview.debitDeducted)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af', marginTop: '4px' }}>
                    <span>Credit Source:</span>
                    <strong>{formatINR(preview.creditDeducted)}</strong>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  fontSize: '0.85rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: paying ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  {paying ? 'Authorizing...' : `Simulate Swipe / Pay ${formatINR(amount)}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
