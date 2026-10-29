import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight, DollarSign, UserPlus, CreditCard } from 'lucide-react';
import { apiRequest } from '../api';

export default function ParentPortal({ onRefreshNeeded }) {
  const [children, setChildren] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [thresholdModal, setThresholdModal] = useState(null);
  const [newThreshold, setNewThreshold] = useState('');

  const loadParentData = async () => {
    try {
      setLoading(true);
      const [childrenRes, requestsRes] = await Promise.all([
        apiRequest('/parental/linked-children'),
        apiRequest('/parental/pending-requests')
      ]);
      setChildren(childrenRes.children || []);
      setRequests(requestsRes.requests || []);
    } catch (err) {
      console.error('Error loading parent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentData();
    const interval = setInterval(loadParentData, 8000);
    return () => clearInterval(interval);
  }, []);

  const [statusBanner, setStatusBanner] = useState(null);

  const showBanner = (text, type = 'success') => {
    setStatusBanner({ text, type });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      const res = await apiRequest(`/parental/approve/${requestId}`, 'POST');
      showBanner(res.message, 'success');
      await loadParentData();
      onRefreshNeeded && onRefreshNeeded();
    } catch (err) {
      showBanner('Approval failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionLoading(true);
      await apiRequest(`/parental/reject/${requestId}`, 'POST', { reason: rejectReason || 'Declined by parent' });
      setRejectingId(null);
      setRejectReason('');
      showBanner('Payment request declined.', 'info');
      await loadParentData();
      onRefreshNeeded && onRefreshNeeded();
    } catch (err) {
      showBanner('Reject failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkChild = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await apiRequest('/parental/link-child', 'POST', { childEmail });
      setLinkSuccess(res.message);
      setChildEmail('');
      setTimeout(() => setLinkSuccess(''), 3000);
      loadParentData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest('/parental/update-threshold', 'POST', {
        linkId: thresholdModal.link_id,
        requiresApprovalAbove: parseFloat(newThreshold)
      });
      setThresholdModal(null);
      loadParentData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const pastRequests = requests.filter(r => r.status !== 'PENDING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399'
              }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Parent & Guardian Oversight Portal</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Real-time transaction authorization, spending limits, and balance supervision for under-18 accounts
                </p>
              </div>
            </div>
          </div>

          {/* Quick link child inline form */}
          <form onSubmit={handleLinkChild} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="email"
              placeholder="Child email (e.g. minor@abms.bank)"
              value={childEmail}
              onChange={e => setChildEmail(e.target.value)}
              className="input-field"
              style={{ width: '260px', padding: '8px 12px', fontSize: '0.85rem' }}
              required
            />
            <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
              <UserPlus size={14} /> Link Account
            </button>
          </form>
        </div>

        {statusBanner && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: statusBanner.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : (statusBanner.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
            border: `1px solid ${statusBanner.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : (statusBanner.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)')}`,
            color: statusBanner.type === 'success' ? '#34d399' : (statusBanner.type === 'error' ? '#fb7185' : '#a5b4fc'),
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{statusBanner.text}</span>
          </div>
        )}

        {linkSuccess && (
          <div style={{ marginTop: '12px', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {linkSuccess}
          </div>
        )}
      </div>

      {/* Pending Authorizations Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Pending Payment Authorization Requests</h3>
            {pendingRequests.length > 0 && (
              <span className="badge badge-warning" style={{ animation: 'pulseGlow 2s infinite' }}>
                {pendingRequests.length} Action Required
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Auto-expires 20 mins after submission
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            color: '#64748b'
          }}>
            <ShieldCheck size={36} color="#10b981" style={{ margin: '0 auto 8px', opacity: 0.9 }} />
            <div style={{ fontWeight: 600, color: '#0f172a' }}>All clear! No pending approval requests.</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px', color: '#64748b' }}>
              When a linked minor attempts a purchase requiring authorization, it will instantly show here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingRequests.map(req => (
              <div
                key={req.id}
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                      {req.minor_name}
                    </span>
                    <span className="badge badge-warning">
                      <Clock size={12} /> Pending Approval
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      Code: {req.request_code}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '4px' }}>
                    Merchant: <strong>{req.merchant}</strong>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Purpose: {req.purpose || 'Card Purchase'}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    Child's current balance: <strong>₹{parseFloat(req.current_minor_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> |
                    Available credit: <strong>₹{parseFloat(req.current_minor_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-mono)' }}>
                    ₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  {rejectingId === req.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Reason for declining..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: '160px' }}
                      />
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading}
                        className="btn btn-danger btn-sm"
                      >
                        Confirm Decline
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setRejectingId(req.id)}
                        disabled={actionLoading}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle size={15} /> Decline
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle2 size={15} /> Approve & Settle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Children Accounts Overview */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#6366f1" /> Linked Dependent Accounts
        </h3>

        {children.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No child accounts linked yet. Use the "Link Account" tool above with your child's email address.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {children.map(ch => (
              <div
                key={ch.link_id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', margin: 0, color: '#0f172a' }}>{ch.minor_name}</h4>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ch.minor_email}</span>
                  </div>
                  <span className="badge badge-indigo">{ch.relationship || 'Dependent'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Debit Balance</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>
                      ₹{parseFloat(ch.debit_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>
                      Safe Limit: ₹{parseFloat(ch.safe_limit_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>Available Credit</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#5b21b6' }}>
                      ₹{parseFloat(ch.available_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6d28d9', marginTop: '2px' }}>
                      of ₹{parseFloat(ch.credit_limit || 0).toLocaleString('en-IN')} limit
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Approval Required: </span>
                    <strong style={{ color: '#0f172a' }}>
                      {ch.requires_approval_above === 0 ? 'All Transactions (₹0+)' : `Over ₹${parseFloat(ch.requires_approval_above).toLocaleString('en-IN')}`}
                    </strong>
                  </div>

                  <button
                    onClick={() => {
                      setThresholdModal(ch);
                      setNewThreshold(ch.requires_approval_above || 0);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Adjust Limit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Threshold Modal */}
      {thresholdModal && (
        <div className="modal-overlay" onClick={() => setThresholdModal(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Adjust Approval Threshold</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Set transaction amount requiring parental signoff for <strong>{thresholdModal.minor_name}</strong>. Enter 0 to require approval for all card transactions.
            </p>

            <form onSubmit={handleUpdateThreshold}>
              <div className="form-group">
                <label className="form-label">Threshold Amount (₹)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={newThreshold}
                  onChange={e => setNewThreshold(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setThresholdModal(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary btn-sm">
                  Save Threshold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
