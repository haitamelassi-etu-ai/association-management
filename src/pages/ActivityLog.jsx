import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ActivityLog.css'

function ActivityLog() {
  const [activities, setActivities] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check admin authentication
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
    if (!isAdminLoggedIn) {
      navigate('/login')
      return
    }

    // Load activity log
    loadActivities()
  }, [navigate])

  const loadActivities = () => {
    const log = JSON.parse(localStorage.getItem('activityLog') || '[]')
    setActivities(log)
  }

  const getActivityIcon = (type) => {
    const icons = {
      add_user: '➕',
      edit_user: '✏️',
      delete_user: '🗑️',
      toggle_status: '🔄',
      login: '🔐',
      logout: '🚪',
      add_beneficiary: '👤',
      edit_beneficiary: '📝',
      delete_beneficiary: '❌',
      add_announcement: '📢',
      delete_announcement: '🔕',
      checkin: '✅',
      checkout: '🔴',
      backup: '💾',
      restore: '♻️',
      settings_change: '⚙️'
    }
    return icons[type] || '📌'
  }

  const getActivityColor = (type) => {
    const colors = {
      add_user: 'green',
      edit_user: 'blue',
      delete_user: 'red',
      toggle_status: 'orange',
      login: 'purple',
      logout: 'gray'
    }
    return colors[type] || 'blue'
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now - time) / 1000)

    if (diffInSeconds < 60) return 'À l\'instant'
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
    return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`
  }

  const clearLog = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
      localStorage.setItem('activityLog', '[]')
      setActivities([])
    }
  }

  const exportLog = () => {
    const dataStr = JSON.stringify(activities, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  const filteredActivities = activities.filter(activity => {
    const matchSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       activity.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = filterType === 'all' || activity.type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>📜 Journal d'Activité</h1>
        <div className="admin-actions">
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Retour au panneau
          </button>
          <button onClick={exportLog} className="btn-secondary">
            📥 Exporter
          </button>
          <button onClick={clearLog} className="btn-danger">
            🗑️ Effacer l'historique
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher dans l'activité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={filterType === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('all')}
          >
            Toutes ({activities.length})
          </button>
          <button 
            className={filterType === 'add_user' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('add_user')}
          >
            Ajouts
          </button>
          <button 
            className={filterType === 'edit_user' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('edit_user')}
          >
            Modifications
          </button>
          <button 
            className={filterType === 'delete_user' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('delete_user')}
          >
            Suppressions
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="content-card">
        <div className="activity-timeline">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className={`activity-item ${getActivityColor(activity.type)}`}>
              <div className="activity-icon-wrapper">
                <span className="activity-icon-large">{getActivityIcon(activity.type)}</span>
              </div>
              <div className="activity-content-wrapper">
                <div className="activity-header-row">
                  <span className="activity-user">{activity.user}</span>
                  <span className="activity-time">{getTimeAgo(activity.timestamp)}</span>
                </div>
                <div className="activity-description">{activity.description}</div>
                <div className="activity-timestamp">
                  {new Date(activity.timestamp).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          ))}

          {filteredActivities.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3>Aucune activité trouvée</h3>
              <p>Les actions effectuées apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivityLog
