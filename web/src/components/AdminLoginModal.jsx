import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, LogIn, AlertCircle, ShoppingBag, Sparkles, KeyRound } from 'lucide-react';

export default function AdminLoginModal({ isOpen, onLoginSuccess }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('supermart123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('supermart_admin_user', JSON.stringify(data.data));
        onLoginSuccess(data.data);
      } else {
        setErrorMsg(data.message || 'Invalid Login Username or Password');
      }
    } catch (e) {
      setErrorMsg('Connection error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0a0f1d',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(40, 70, 158, 0.4) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(202, 232, 232, 0.12) 0%, transparent 50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div className="glass-panel glow-blue" style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#121b33',
        borderRadius: '24px',
        border: '1px solid rgba(202, 232, 232, 0.3)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-blue-glow)'
      }}>
        {/* Top Ocean & Brilliant Blue Header */}
        <div style={{
          background: 'linear-gradient(135deg, #28469E 0%, #172a63 100%)',
          padding: '34px 28px',
          textAlign: 'center',
          color: 'white',
          borderBottom: '1px solid rgba(202, 232, 232, 0.2)'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: '#CAE8E8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            color: '#28469E',
            boxShadow: '0 8px 24px rgba(202, 232, 232, 0.35)'
          }}>
            <ShoppingBag size={38} />
          </div>

          <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'white' }}>SUPERMART</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#CAE8E8' }}>
            Enterprise Kiryana POS & Udhar ERP
          </p>
          <span className="badge badge-ocean" style={{ marginTop: '12px', fontSize: '0.72rem' }}>
            <ShieldCheck size={13} style={{ verticalAlign: 'middle' }} /> Store Login Required
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
          
          {errorMsg && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid #f43f5e',
              color: '#fb7185',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {/* Credentials Info Box */}
          <div style={{
            background: '#080d19',
            border: '1px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '0.82rem',
            color: '#94a3b8',
            marginBottom: '20px'
          }}>
            🔑 <strong>Store Access Credentials:</strong><br />
            Username: <code style={{ color: '#CAE8E8', fontWeight: 700 }}>admin</code> • Password: <code style={{ color: '#CAE8E8', fontWeight: 700 }}>supermart123</code>
          </div>

          {/* Username */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CAE8E8', marginBottom: '6px' }}>
              Username:
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px' }}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CAE8E8', marginBottom: '6px' }}>
              Password:
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-ocean glow-ocean"
            style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Logging in...</span>
            ) : (
              <>
                <LogIn size={20} /> Login to Access System
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
