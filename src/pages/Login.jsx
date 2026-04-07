import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/auth/admin/login`, { email, password });
      if (res.data.success) {
        onLogin();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Admin Portal</h1>
          <p>Sign in to manage Founder's Mart</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@alliance.edu.in" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn">Sign In</button>
          
          <div className="forgot-password">
            <button type="button" onClick={() => setShowForgotModal(true)}>
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content forgot-modal" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ background: '#FFFBEB', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Reset Password</h2>
              <p style={{ color: '#6B7280', lineHeight: '1.6', marginBottom: '2rem' }}>
                To reset your admin password, please contact the <strong>IT Support</strong> or the <strong>Founder's Mart Technical Team</strong>.
              </p>
              <button 
                className="btn btn-gold" 
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                onClick={() => setShowForgotModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
