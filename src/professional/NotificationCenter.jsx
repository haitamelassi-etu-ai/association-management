import { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationCenter.css';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : `http://${window.location.hostname}:5000/api`;

function NotificationCenter({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      const params = filter === 'unread' ? { unreadOnly: 'true' } : {};
      
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setNotifications(notifications.map(notif => 
        notif._id === id ? { ...notif, isRead: true, readAt: new Date() } : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setNotifications(notifications.map(notif => ({
        ...notif,
        isRead: true,
        readAt: new Date()
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      await axios.delete(`${API_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(notifications.filter(notif => notif._id !== id));
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  };

  const getNotificationClass = (type) => {
    const classes = {
      info: 'notif-info',
      success: 'notif-success',
      warning: 'notif-warning',
      urgent: 'notif-urgent',
      announcement: 'notif-announcement'
    };
    return classes[type] || 'notif-info';
  };

  const formatDate = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return notifDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div className="notification-center-overlay" onClick={onClose}>
      <div className="notification-center" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <div className="notification-title">
            <h2>🔔 Notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-close-notif">✕</button>
        </div>

        <div className="notification-filters">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
          <button 
            className={filter === 'unread' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('unread')}
          >
            Non lues ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button 
              className="filter-btn mark-all-btn"
              onClick={markAllAsRead}
            >
              ✓ Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="notification-loading">
              <div className="spinner"></div>
              <p>Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="empty-icon">🔔</div>
              <p>{filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif._id} 
                className={`notification-item ${getNotificationClass(notif.type)} ${!notif.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notif-icon">{notif.icon}</div>
                <div className="notif-content">
                  <div className="notif-header-line">
                    <h4>{notif.title}</h4>
                    <span className="notif-time">{formatDate(notif.createdAt)}</span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                  {!notif.isRead && <div className="unread-indicator"></div>}
                </div>
                <button 
                  className="btn-delete-notif"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif._id);
                  }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;
