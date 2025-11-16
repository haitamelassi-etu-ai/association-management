// Shared Sidebar Component
import { Link, useLocation } from 'react-router-dom';

export const ProfessionalSidebar = ({ user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: '/professional/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/professional/analytics', icon: '📈', label: 'Analytique' },
    { path: '/professional/beneficiaries', icon: '👥', label: 'Bénéficiaires' },
    { path: '/professional/attendance', icon: '⏰', label: 'Pointage' },
    { path: '/professional/announcements', icon: '📢', label: 'Annonces' },
    { path: '/professional/reports', icon: '📋', label: 'Rapports' },
    { path: '/professional/advanced-reports', icon: '📊', label: 'Rapports Avancés' },
    { path: '/professional/backup', icon: '💾', label: 'Sauvegarde' },
    { path: '/professional/meals', icon: '🍽️', label: 'Repas' }
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <img src="/images/logo.png" alt="Logo" className="sidebar-logo" />
        <h2>Portail Pro</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
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
  );
};
