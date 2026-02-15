import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AuditLogViewer.css'

function AuditLogViewer() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })
  const [stats, setStats] = useState(null)

  const actions = [
    { value: 'login', label: 'Connexion', icon: '🔑' },
    { value: 'logout', label: 'Déconnexion', icon: '🚪' },
    { value: 'create', label: 'Création', icon: '➕' },
    { value: 'update', label: 'Modification', icon: '✏️' },
    { value: 'delete', label: 'Suppression', icon: '🗑️' },
    { value: 'export', label: 'Export', icon: '📤' },
    { value: 'approval', label: 'Approbation', icon: '✅' },
    { value: 'rejection', label: 'Rejet', icon: '❌' }
  ]

  const resources = [
    { value: 'user', label: 'Utilisateurs' },
    { value: 'beneficiary', label: 'Bénéficiaires' },
    { value: 'attendance', label: 'Présence' },
    { value: 'medication', label: 'Médicaments' },
    { value: 'meal', label: 'Repas' },
    { value: 'document', label: 'Documents' },
    { value: 'schedule', label: 'Planning' },
    { value: 'approval', label: 'Approbations' }
  ]

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [pagination.page, filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('professionalToken')
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
        setPagination(prev => ({ ...prev, total: data.pagination.total }))
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/audit-logs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error)
    }
  }

  const getActionIcon = (action) => {
    const found = actions.find(a => a.value === action)
    return found?.icon || '📋'
  }

  const getActionColor = (action) => {
    const colors = {
      login: '#27ae60',
      logout: '#95a5a6',
      create: '#3498db',
      update: '#f39c12',
      delete: '#e74c3c',
      export: '#9b59b6',
      approval: '#27ae60',
      rejection: '#e74c3c'
    }
    return colors[action] || '#7f8c8d'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="audit-log-viewer">
      <div className="audit-header">
        <h2>📋 Journal d'audit</h2>
        <p>Historique de toutes les actions sensibles</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="audit-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{pagination.total}</span>
              <span className="stat-label">Total des logs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-value">{stats.userStats?.length || 0}</span>
              <span className="stat-label">Utilisateurs actifs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.actionStats?.find(a => a._id === 'login')?.count || 0}
              </span>
              <span className="stat-label">Connexions (30j)</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✏️</div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.actionStats?.find(a => a._id === 'update')?.count || 0}
              </span>
              <span className="stat-label">Modifications (30j)</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="audit-filters">
        <select 
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
        >
          <option value="">Toutes les actions</option>
          {actions.map(action => (
            <option key={action.value} value={action.value}>
              {action.icon} {action.label}
            </option>
          ))}
        </select>

        <select 
          value={filters.resource}
          onChange={e => setFilters({ ...filters, resource: e.target.value })}
        >
          <option value="">Toutes les ressources</option>
          {resources.map(resource => (
            <option key={resource.value} value={resource.value}>
              {resource.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={e => setFilters({ ...filters, startDate: e.target.value })}
          placeholder="Date début"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={e => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="Date fin"
        />

        <button 
          className="clear-filters"
          onClick={() => setFilters({ action: '', resource: '', startDate: '', endDate: '' })}
        >
          🗑️ Effacer
        </button>
      </div>

      {/* Logs Table */}
      <div className="audit-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>Aucun log trouvé</p>
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Ressource</th>
                <th>Détails</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td className="date-cell">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="user-cell">
                    {log.user ? (
                      <>
                        <span className="user-name">
                          {log.user.prenom} {log.user.nom}
                        </span>
                        <span className="user-role">{log.user.role}</span>
                      </>
                    ) : (
                      <span className="unknown-user">Inconnu</span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="action-badge"
                      style={{ backgroundColor: getActionColor(log.action) }}
                    >
                      {getActionIcon(log.action)} {log.action}
                    </span>
                  </td>
                  <td className="resource-cell">
                    {log.resource}
                    {log.resourceId && (
                      <span className="resource-id">#{log.resourceId.slice(-6)}</span>
                    )}
                  </td>
                  <td className="details-cell">
                    {log.details ? (
                      <details>
                        <summary>Voir détails</summary>
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </details>
                    ) : '-'}
                  </td>
                  <td className="ip-cell">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="audit-pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Précédent
          </button>
          <span>
            Page {pagination.page} sur {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}

export default AuditLogViewer
