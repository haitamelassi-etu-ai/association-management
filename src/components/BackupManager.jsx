import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './BackupManager.css';
import { API_URL } from '../utils/api';

const BackupManager = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBackup = async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'all' 
        ? '/api/backup/export/all'
        : `/api/backup/export/${type}`;

      const response = await fetch(`${API_URL}${endpoint.replace('/api', '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `backup_${type}_${timestamp}.json`;
        downloadJSON(result.backup, filename);
        showMessage(t('backup.success'), 'success');
      } else {
        showMessage(t('backup.error'), 'error');
      }
    } catch (error) {
      console.error('Backup error:', error);
      showMessage(t('backup.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/backup/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="backup-manager">
      <div className="backup-header">
        <h2>💾 {t('backup.title')}</h2>
        <p className="backup-subtitle">{t('backup.subtitle')}</p>
      </div>

      {message.text && (
        <div className={`backup-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {stats && (
        <div className="backup-stats">
          <h3>{t('backup.statistics')}</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{stats.beneficiaries}</div>
              <div className="stat-label">{t('backup.beneficiaries')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-value">{stats.users}</div>
              <div className="stat-label">{t('backup.users')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-value">{stats.attendance}</div>
              <div className="stat-label">{t('backup.attendance')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{stats.messages}</div>
              <div className="stat-label">{t('backup.messages')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="backup-options">
        <h3>{t('backup.exportOptions')}</h3>
        
        <div className="backup-cards">
          <div className="backup-card">
            <div className="backup-card-icon">🗄️</div>
            <h4>{t('backup.fullBackup')}</h4>
            <p>{t('backup.fullBackupDesc')}</p>
            <button 
              className="backup-btn primary"
              onClick={() => handleBackup('all')}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('backup.export')}
            </button>
          </div>

          <div className="backup-card">
            <div className="backup-card-icon">👥</div>
            <h4>{t('backup.beneficiariesOnly')}</h4>
            <p>{t('backup.beneficiariesOnlyDesc')}</p>
            <button 
              className="backup-btn secondary"
              onClick={() => handleBackup('beneficiaries')}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('backup.export')}
            </button>
          </div>

          <div className="backup-card">
            <div className="backup-card-icon">👤</div>
            <h4>{t('backup.usersOnly')}</h4>
            <p>{t('backup.usersOnlyDesc')}</p>
            <button 
              className="backup-btn secondary"
              onClick={() => handleBackup('users')}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('backup.export')}
            </button>
          </div>

          <div className="backup-card">
            <div className="backup-card-icon">📋</div>
            <h4>{t('backup.attendanceOnly')}</h4>
            <p>{t('backup.attendanceOnlyDesc')}</p>
            <button 
              className="backup-btn secondary"
              onClick={() => handleBackup('attendance')}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('backup.export')}
            </button>
          </div>
        </div>
      </div>

      <div className="backup-info">
        <h4>ℹ️ {t('backup.infoTitle')}</h4>
        <ul>
          <li>{t('backup.info1')}</li>
          <li>{t('backup.info2')}</li>
          <li>{t('backup.info3')}</li>
          <li>{t('backup.info4')}</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupManager;
