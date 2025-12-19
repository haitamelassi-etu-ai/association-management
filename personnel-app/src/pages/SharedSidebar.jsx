// Shared Sidebar Component
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export const ProfessionalSidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: '/professional/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/professional/analytics', icon: '📈', label: 'Analytique' },
    { path: '/professional/beneficiaries', icon: '👥', label: 'Bénéficiaires' },
    { path: '/professional/attendance', icon: '⏰', label: 'Pointage Staff' },
    { path: '/professional/exit-tracking', icon: '🚶', label: 'Sorties Résidents' },
    { path: '/professional/announcements', icon: '📢', label: 'Annonces' },
    { path: '/professional/food-stock', icon: '🏪', label: 'Stock Alimentaire' },
    { path: '/professional/reports', icon: '📋', label: 'Rapports' },
    { path: '/professional/advanced-reports', icon: '📊', label: 'Rapports Avancés' },
    { path: '/professional/backup', icon: '💾', label: 'Sauvegarde' },
    { path: '/professional/meals', icon: '🍽️', label: 'Repas' },
    { path: '/professional/pharmacy', icon: '🏥', label: 'Pharmacie' },
    { path: '/professional/medications', icon: '�', label: 'Prescriptions' }
  ];

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" className="sidebar-logo" />
          <h2>Portail Pro</h2>
          <button 
            className="mobile-close-btn" 
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.nom?.[0] || 'U'}{user?.prenom?.[0] || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.prenom || ''} {user?.nom || ''}</div>
            <div className="user-role">{user?.role || 'Staff'}</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-logout-sidebar">
          🚪 Déconnexion
        </button>
      </div>
    </aside>
    </>
  );
};
