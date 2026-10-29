import React from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Printer, ArrowDownRight, CreditCard, Shield } from 'lucide-react';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
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
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Official Transaction Receipt
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Nexora Core Banking Network • ABMS
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

        {/* Receipt Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Main Status & Amount */}
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              {receipt.status === 'SUCCESS' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: '#dcfce7',
                  color: '#166534',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <CheckCircle size={14} color="#16a34a" /> Completed Successfully
                </span>
              )}
              {receipt.status === 'PENDING_APPROVAL' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <AlertTriangle size={14} color="#d97706" /> Pending Parent Approval
                </span>
              )}
              {(receipt.status === 'FAILED' || receipt.status === 'REJECTED') && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <X size={14} color="#dc2626" /> {receipt.status === 'REJECTED' ? 'Parent Declined' : 'Failed'}
                </span>
              )}
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
              {formatINR(receipt.total_amount)}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
              {receipt.recipient_info || receipt.description || 'Transaction'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', fontFamily: 'monospace' }}>
              Ref ID: {receipt.reference_id}
            </div>
          </div>

          {/* Smart Hybrid Breakdown */}
          {(receipt.debit_portion > 0 || receipt.credit_portion > 0 || receipt.type === 'HYBRID_CARD_PURCHASE') && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} /> Smart Hybrid Card Split Allocation
                </span>
                {receipt.safe_limit_active ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: '#e0f2fe',
                    color: '#0284c7',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Safe Limit Active
                  </span>
                ) : null}
              </div>

              {/* Progress split bar */}
              <div style={{
                height: '10px',
                width: '100%',
                background: '#e2e8f0',
                borderRadius: '5px',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: `${(receipt.debit_portion / (receipt.total_amount || 1)) * 100}%`,
                  background: '#16a34a'
                }} />
                <div style={{
                  width: `${(receipt.credit_portion / (receipt.total_amount || 1)) * 100}%`,
                  background: '#2563eb'
                }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>Deducted from Debit</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {formatINR(receipt.debit_portion || 0)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>Charged to Credit Line</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {formatINR(receipt.credit_portion || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '4px 16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Date & Time</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {receipt.created_at ? new Date(receipt.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Transaction Type</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{receipt.type || 'PAYMENT'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Network & Security</span>
              <span style={{ fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} /> Verified 256-bit Secure
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handlePrint}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
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
        </div>
      </div>
    </div>
  );
}
