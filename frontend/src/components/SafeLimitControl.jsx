import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Check, Info, Sliders, ArrowRight } from 'lucide-react';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SafeLimitControl({ cardData, onSafeLimitSaved }) {
  const [safeLimit, setSafeLimit] = useState(cardData?.safe_limit_amount || 15000);
  const [isEnabled, setIsEnabled] = useState(cardData?.safe_limit_enabled !== 0);
  const [testAmount, setTestAmount] = useState(25000);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (cardData) {
      setSafeLimit(cardData.safe_limit_amount !== undefined ? cardData.safe_limit_amount : 15000);
      setIsEnabled(cardData.safe_limit_enabled !== 0);
    }
  }, [cardData]);

  const currentDebit = parseFloat(cardData?.debit_balance || 0);
  const currentCredit = parseFloat(cardData?.available_credit || 0);

  // Split Calculation Simulator
  const activeLimit = isEnabled ? parseFloat(safeLimit) : 0;
  const availableDebitAboveSafe = isEnabled ? Math.max(0, currentDebit - activeLimit) : currentDebit;
  const simDebitDeduction = Math.min(testAmount, availableDebitAboveSafe);
  const simCreditDeduction = Math.max(0, testAmount - simDebitDeduction);
  const simCanCover = simCreditDeduction <= currentCredit;

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiRequest('/cards/safe-limit', 'POST', {
        safeLimitAmount: parseFloat(safeLimit),
        isEnabled: isEnabled
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onSafeLimitSaved && onSafeLimitSaved();
    } catch (err) {
      alert('Failed to update Safe Limit: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const presets = [5000, 10000, 15000, 25000];

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      padding: '28px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#e0e7ff',
            border: '1px solid #c7d2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4338ca'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Smart Safe Limit Configuration
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Protects your checking balance by automatically routing overflow transactions to credit
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isEnabled ? '#16a34a' : '#94a3b8' }}>
            {isEnabled ? 'Protection Active' : 'Protection Disabled'}
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            style={{
              padding: '7px 16px',
              borderRadius: '999px',
              border: 'none',
              background: isEnabled ? '#16a34a' : '#e2e8f0',
              color: isEnabled ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Controls Column */}
        <div>
          <div style={{
            background: '#f8fafc',
            padding: '22px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Minimum Balance to Preserve (Safe Limit)
              </span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4338ca', letterSpacing: '-0.02em' }}>
                {formatINR(safeLimit)}
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="0"
              max="50000"
              step="1000"
              value={safeLimit}
              disabled={!isEnabled}
              onChange={(e) => setSafeLimit(e.target.value)}
              style={{
                width: '100%',
                accentColor: '#4338ca',
                cursor: isEnabled ? 'pointer' : 'not-allowed',
                opacity: isEnabled ? 1 : 0.4
              }}
            />

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '16px' }}>
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={!isEnabled}
                  onClick={() => setSafeLimit(val)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${Number(safeLimit) === val ? '#4338ca' : '#cbd5e1'}`,
                    background: Number(safeLimit) === val ? '#e0e7ff' : '#ffffff',
                    color: Number(safeLimit) === val ? '#4338ca' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: isEnabled ? 'pointer' : 'not-allowed'
                  }}
                >
                  {formatINR(val)}
                </button>
              ))}
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              gap: '10px',
              fontSize: '0.8rem',
              color: '#1e40af'
            }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                When enabled, your Hybrid Card will <strong>never drain your debit balance below {formatINR(safeLimit)}</strong>. Any transaction portion beyond your disposable funds will automatically charge to your credit limit.
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: saveSuccess ? '#16a34a' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {saveSuccess ? <><Check size={16} /> Safe Limit Saved!</> : (saving ? 'Saving Changes...' : 'Save Configuration')}
            </button>
          </div>
        </div>

        {/* Live Simulator Column */}
        <div>
          <div style={{
            background: '#f8fafc',
            padding: '22px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#2563eb" /> Live Split Simulation Preview
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  INTERACTIVE TEST
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Simulate a Card Purchase Amount (₹):
                </label>
                <input
                  type="number"
                  min="1"
                  step="500"
                  value={testAmount}
                  onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Progress Split Bar */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
                  <span>Purchase Amount</span>
                  <strong style={{ color: '#0f172a' }}>{formatINR(testAmount)}</strong>
                </div>

                <div style={{
                  height: '12px',
                  width: '100%',
                  background: '#e2e8f0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  display: 'flex'
                }}>
                  <div style={{
                    width: `${testAmount > 0 ? (simDebitDeduction / testAmount) * 100 : 0}%`,
                    background: '#16a34a',
                    transition: 'width 0.3s ease'
                  }} />
                  <div style={{
                    width: `${testAmount > 0 ? (simCreditDeduction / testAmount) * 100 : 0}%`,
                    background: '#2563eb',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Breakdown tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>Drawn from Debit</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {formatINR(simDebitDeduction)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>Charged to Credit</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {formatINR(simCreditDeduction)}
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome Notice */}
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: simCanCover ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${simCanCover ? '#bbf7d0' : '#fecaca'}`,
              color: simCanCover ? '#166534' : '#b91c1c',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {simCanCover
                ? `✅ Transaction would be automatically approved. Debit balance will stay safe at ${formatINR(Math.max(currentDebit - simDebitDeduction, 0))}.`
                : `⚠️ Transaction would decline: exceeds total purchasing power.`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
