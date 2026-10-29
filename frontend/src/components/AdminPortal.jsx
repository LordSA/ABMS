import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, CreditCard, Activity, Search, RefreshCw, CheckCircle, XCircle, FileText, IndianRupee, Lock, Unlock } from 'lucide-react';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AdminPortal() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'transactions', 'audit'
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState('');
  const [selectedCreditUser, setSelectedCreditUser] = useState(null);
  const [newCreditLimit, setNewCreditLimit] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [mRes, uRes, tRes, lRes] = await Promise.all([
        apiRequest('/admin/metrics'),
        apiRequest('/admin/users'),
        apiRequest(`/admin/transactions${txFilter ? `?status=${txFilter}` : ''}`),
        apiRequest('/admin/audit-logs')
      ]);

      setMetrics(mRes.metrics);
      setUsers(uRes.users);
      setTransactions(tRes.transactions);
      setLogs(lRes.logs);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [txFilter]);

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      await apiRequest(`/admin/users/${user.id}/status`, 'POST', { status: nextStatus });
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateCreditLimit = async (e) => {
    e.preventDefault();
    if (!selectedCreditUser) return;
    try {
      await apiRequest(`/admin/users/${selectedCreditUser.id}/credit-limit`, 'POST', {
        creditLimit: parseFloat(newCreditLimit)
      });
      setSelectedCreditUser(null);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Metrics Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* 1. Total Bank Deposits */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 16px -2px rgba(16, 185, 129, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Total Bank Deposits
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <IndianRupee size={17} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {formatINR(metrics.totalDeposits)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
              Across {metrics.totalAccounts} accounts
            </div>
          </div>

          {/* 2. Total Credit Line */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)',
            border: '1.5px solid #c7d2fe',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 16px -2px rgba(99, 102, 241, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Total Credit Line
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <CreditCard size={17} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {formatINR(metrics.totalCreditLimit)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
              Utilized: <strong style={{ color: '#4f46e5' }}>{formatINR(metrics.totalCreditUsed)}</strong> ({((metrics.totalCreditUsed / (metrics.totalCreditLimit || 1)) * 100).toFixed(1)}%)
            </div>
          </div>

          {/* 3. Registered Customers */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
            border: '1.5px solid #bae6fd',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 16px -2px rgba(14, 165, 233, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Registered Customers
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <Users size={17} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {metrics.totalUsers}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
              All Roles Active
            </div>
          </div>

          {/* 4. Failed / Declined Tx */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)',
            border: '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 16px -2px rgba(239, 68, 68, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Failed / Declined Tx
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <ShieldAlert size={17} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {metrics.failedTxCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
              Total Tx: {metrics.totalTxCount} | Pending: {metrics.pendingApprovals}
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Tab View */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('users')}
              className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users size={15} /> User & Account Management
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Activity size={15} /> Transaction Monitoring
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <FileText size={15} /> Audit Trail & Compliance
            </button>
          </div>

          <button onClick={loadAdminData} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>

        {/* Tab 1: Users & Accounts */}
        {activeTab === 'users' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px' }}>User</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Account & Balance</th>
                  <th style={{ padding: '10px' }}>Hybrid Card & Credit</th>
                  <th style={{ padding: '10px' }}>Safe Limit</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : (u.role === 'PARENT' ? 'badge-indigo' : (u.role === 'MINOR' ? 'badge-warning' : 'badge-cyan'))}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem' }}>{formatINR(u.balance || 0)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{u.account_number || 'No Account'}</div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {u.card_number ? (
                        <div>
                          <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.92rem' }}>
                            {formatINR(u.available_credit || 0)} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>/ {formatINR(u.credit_limit || 0)}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>•••• {u.card_number.slice(-4)}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                      {formatINR(u.safe_limit_amount || 0)}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {u.role !== 'ADMIN' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCreditUser(u);
                                setNewCreditLimit(u.credit_limit || 2000);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Limit
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              {u.status === 'ACTIVE' ? <Lock size={12} /> : <Unlock size={12} />}
                              {u.status === 'ACTIVE' ? 'Freeze' : 'Activate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Transactions Monitoring */}
        {activeTab === 'transactions' && (
          <div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['', 'FAILED', 'PENDING_APPROVAL', 'SUCCESS'].map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderColor: txFilter === f ? '#2563eb' : '#cbd5e1',
                    background: txFilter === f ? '#eff6ff' : '#ffffff',
                    color: txFilter === f ? '#1d4ed8' : '#334155',
                    fontWeight: txFilter === f ? 700 : 500
                  }}
                >
                  {f === '' ? 'All Transactions' : f.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>Reference & Time</th>
                    <th style={{ padding: '10px' }}>Customer</th>
                    <th style={{ padding: '10px' }}>Type & Details</th>
                    <th style={{ padding: '10px' }}>Amount & Split</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0f172a' }}>{t.reference_id}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(t.created_at).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.customer_email}</div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.recipient_info || t.description}</div>
                        <span className="badge badge-indigo" style={{ fontSize: '0.68rem', marginTop: '3px' }}>{t.type}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>₹{parseFloat(t.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Debit: ₹{parseFloat(t.debit_portion || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Credit: ₹{parseFloat(t.credit_portion || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${t.status === 'SUCCESS' ? 'badge-success' : (t.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-danger')}`}>
                          {t.status}
                        </span>
                        {t.failure_reason && (
                          <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px', maxWidth: '220px' }}>{t.failure_reason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Audit Logs */}
        {activeTab === 'audit' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px' }}>Action</th>
                  <th style={{ padding: '10px' }}>User</th>
                  <th style={{ padding: '10px' }}>Target Entity</th>
                  <th style={{ padding: '10px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{l.action}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{l.user_name || 'System'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.user_role || 'SYSTEM'}</div>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {l.entity_type}: {l.entity_id}
                    </td>
                    <td style={{ padding: '10px', color: '#475569', fontSize: '0.82rem' }}>
                      {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Limit Adjustment Modal */}
      {selectedCreditUser && (
        <div className="modal-overlay" onClick={() => setSelectedCreditUser(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Adjust Credit Limit</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Modify revolving credit facility for <strong>{selectedCreditUser.name}</strong>.
            </p>

            <form onSubmit={handleUpdateCreditLimit}>
              <div className="form-group">
                <label className="form-label">New Credit Limit (₹)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={newCreditLimit}
                  onChange={e => setNewCreditLimit(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setSelectedCreditUser(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Update Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
