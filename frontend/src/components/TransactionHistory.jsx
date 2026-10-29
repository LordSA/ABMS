import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, FileText, ArrowDownLeft, ArrowUpRight, CreditCard, Shield, ChevronRight, Wallet } from 'lucide-react';
import { apiRequest, getToken } from '../api';

export default function TransactionHistory({ onSelectTransaction, refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [railFilter, setRailFilter] = useState(''); // '' | 'DEBIT' | 'CREDIT'

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let query = '?limit=50';
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (typeFilter) query += `&type=${encodeURIComponent(typeFilter)}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
      if (railFilter) query += `&rail=${encodeURIComponent(railFilter)}`;

      const res = await apiRequest(`/transactions${query}`);
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, typeFilter, statusFilter, railFilter, refreshTrigger]);

  const handleDownloadCsv = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/transactions/export/csv', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to export statement');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ABMS_Statement_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error exporting statement');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownLeft size={16} color="#34d399" />;
      case 'WITHDRAWAL': return <ArrowUpRight size={16} color="#fb7185" />;
      case 'TRANSFER': return <ArrowUpRight size={16} color="#67e8f9" />;
      case 'HYBRID_CARD_PURCHASE': return <CreditCard size={16} color="#a5b4fc" />;
      case 'CREDIT_REPAYMENT': return <Shield size={16} color="#34d399" />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Transaction Ledger & Statements</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Complete audit trail with debit-credit allocation breakdowns
          </p>
        </div>

        <button onClick={handleDownloadCsv} className="btn btn-secondary btn-sm">
          <Download size={14} /> Export CSV Statement
        </button>
      </div>

      {/* Rail Filter Tabs (Credit vs Debit Transactions) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          onClick={() => setRailFilter('')}
          style={{
            padding: '7px 16px',
            borderRadius: '9px',
            border: 'none',
            background: railFilter === '' ? '#ffffff' : 'transparent',
            color: railFilter === '' ? '#0f172a' : '#64748b',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: railFilter === '' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          All Transactions
        </button>
        <button
          onClick={() => setRailFilter('DEBIT')}
          style={{
            padding: '7px 16px',
            borderRadius: '9px',
            border: 'none',
            background: railFilter === 'DEBIT' ? '#2563eb' : 'transparent',
            color: railFilter === 'DEBIT' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: railFilter === 'DEBIT' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Wallet size={14} /> Debit Transactions
        </button>
        <button
          onClick={() => setRailFilter('CREDIT')}
          style={{
            padding: '7px 16px',
            borderRadius: '9px',
            border: 'none',
            background: railFilter === 'CREDIT' ? '#7c3aed' : 'transparent',
            color: railFilter === 'CREDIT' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: railFilter === 'CREDIT' ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CreditCard size={14} /> Credit Transactions
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search by merchant, ref ID, or note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', height: '40px', fontSize: '0.85rem' }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="input-field"
          style={{ width: '180px', height: '40px', fontSize: '0.85rem' }}
        >
          <option value="">All Types</option>
          <option value="HYBRID_CARD_PURCHASE">Hybrid Card Purchase</option>
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          <option value="TRANSFER">Transfer</option>
          <option value="CREDIT_REPAYMENT">Credit Repayment</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ width: '160px', height: '40px', fontSize: '0.85rem' }}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Completed</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="FAILED">Failed / Declined</option>
          <option value="REJECTED">Parent Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 10px' }}>Date & Ref</th>
              <th style={{ padding: '12px 10px' }}>Description / Merchant</th>
              <th style={{ padding: '12px 10px' }}>Type</th>
              <th style={{ padding: '12px 10px' }}>Amount</th>
              <th style={{ padding: '12px 10px' }}>Split Allocation</th>
              <th style={{ padding: '12px 10px' }}>Status</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  {loading ? 'Loading transactions...' : 'No transactions found matching criteria.'}
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectTransaction && onSelectTransaction(tx.id)}
                  className="tx-row"
                >
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {tx.reference_id}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {tx.recipient_info || tx.description}
                        </div>
                        {tx.description && tx.recipient_info && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {tx.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '12px 10px' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td style={{ padding: '12px 10px' }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '1rem',
                      fontFamily: 'var(--font-display)',
                      color: tx.type === 'DEPOSIT' ? '#16a34a' : '#0f172a'
                    }}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}₹{parseFloat(tx.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  <td style={{ padding: '12px 10px' }}>
                    {tx.type === 'HYBRID_CARD_PURCHASE' ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {tx.debit_portion > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px' }}>
                            Debit: ₹{parseFloat(tx.debit_portion).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {tx.credit_portion > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px' }}>
                            Credit: ₹{parseFloat(tx.credit_portion).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {tx.debit_portion === 0 && tx.credit_portion === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>-</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Direct Account</span>
                    )}
                  </td>

                  <td style={{ padding: '12px 10px' }}>
                    <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-success' : (tx.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-danger')}`} style={{ fontSize: '0.7rem' }}>
                      {tx.status}
                    </span>
                  </td>

                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction && onSelectTransaction(tx.id);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                    >
                      Receipt <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
