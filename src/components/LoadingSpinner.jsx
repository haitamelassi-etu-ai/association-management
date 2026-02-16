import React from 'react';

const LoadingSpinner = ({ message = 'Chargement...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-color, #f8fafc)',
    color: 'var(--text-color, #1a202c)'
  }}>
    <div style={{
      width: 48,
      height: 48,
      border: '4px solid var(--border-color, #e2e8f0)',
      borderTopColor: 'var(--primary-color, #667eea)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <p style={{ marginTop: 16, fontSize: '0.95rem', color: 'var(--text-secondary, #4a5568)' }}>{message}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default LoadingSpinner;
