import React, { useState } from 'react';
import { Landmark, Shield, User, Lock, Mail, Calendar, Phone, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiRequest, setToken } from '../api';

export default function AuthModal({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await apiRequest('/auth/login', 'POST', { email, password });
        setToken(res.token);
        onAuthSuccess(res.user);
      } else {
        const res = await apiRequest('/auth/register', 'POST', {
          name,
          email,
          password,
          role,
          dob,
          phone
        });
        setToken(res.token);
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (emailAddr) => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/auth/login', 'POST', {
        email: emailAddr,
        password: 'bank1234'
      });
      setToken(res.token);
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)' }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Brand Header */}
        <div style={{
          textAlign: 'center',
          padding: '28px 24px 20px',
          background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)'
          }}>
            <Landmark size={28} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Nexora Core Banking Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Smart Hybrid Cards • Safe Limit Protection • Parental Approvals
          </p>
        </div>

        {/* 1-Click Persona Quick Logins for Instant Testing */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{
            padding: '12px 14px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#2563eb',
              textTransform: 'uppercase',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={14} color="#0284c7" /> 1-Click Demo Evaluation Sign-in
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => quickLoginAs('admin@abms.bank')}
                style={{
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                👑 <strong>Admin</strong>
              </button>
              <button
                type="button"
                onClick={() => quickLoginAs('parent@abms.bank')}
                style={{
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                👨‍👦 <strong>Parent (John)</strong>
              </button>
              <button
                type="button"
                onClick={() => quickLoginAs('minor@abms.bank')}
                style={{
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                🎮 <strong>Minor (Leo)</strong>
              </button>
              <button
                type="button"
                onClick={() => quickLoginAs('alex@nexora.bank')}
                style={{
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                🌟 <strong>Alex Mathew</strong>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', margin: '0 24px' }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: isLogin ? '2.5px solid #2563eb' : 'none',
              color: isLogin ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: !isLogin ? '2.5px solid #2563eb' : 'none',
              color: !isLogin ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Register Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 28px' }}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="input-field"
                  >
                    <option value="CUSTOMER">Adult Customer</option>
                    <option value="PARENT">Parent / Guardian</option>
                    <option value="MINOR">Minor (Under 18)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="e.g. alex@nexora.bank"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : (isLogin ? 'Sign In to Nexora Bank' : 'Open Account & Issue Hybrid Card')}
          </button>
        </form>
      </div>
    </div>
  );
}
