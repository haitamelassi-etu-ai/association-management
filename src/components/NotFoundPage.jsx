import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-color, #f8fafc)',
    color: 'var(--text-color, #1a202c)',
    textAlign: 'center',
    padding: 24
  }}>
    <div style={{ fontSize: '6rem', marginBottom: 8 }}>🚫</div>
    <h1 style={{ fontSize: '3rem', fontWeight: 700, margin: '0 0 8px' }}>404</h1>
    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary, #4a5568)', marginBottom: 24 }}>
      Cette page n'existe pas ou a été déplacée.
    </p>
    <div style={{ display: 'flex', gap: 12 }}>
      <Link to="/" style={{
        padding: '12px 28px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: 'white',
        borderRadius: 10,
        textDecoration: 'none',
        fontWeight: 600,
        transition: 'transform 0.2s'
      }}>🏠 Accueil</Link>
      <Link to="/professional/dashboard" style={{
        padding: '12px 28px',
        background: 'var(--card-bg, #fff)',
        color: 'var(--text-color, #1a202c)',
        borderRadius: 10,
        textDecoration: 'none',
        fontWeight: 600,
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>📊 Dashboard</Link>
    </div>
  </div>
);

export default NotFoundPage;
