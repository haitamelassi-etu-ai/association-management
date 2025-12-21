import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { announcementsAPI } from '../services/api'
import { ProfessionalSidebar } from './SharedSidebar'
import './ProfessionalDashboard.css'
import './Announcements.css'

function Announcements() {
  const [user, setUser] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/professional-login')
      return
    }
    setUser(JSON.parse(userData))

    // Fetch real announcements from API
    fetchAnnouncements()
  }, [navigate])

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true)
      const response = await announcementsAPI.getAll()
      setAnnouncements(response.data.data)
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('token')
    navigate('/professional-login')
  }

  const getTypeIcon = (type) => {
    const icons = {
      urgent: '🚨',
      info: 'ℹ️',
      tache: '📋',
      evenement: '📅'
    }
    return icons[type] || '📢'
  }

  const getTypeLabel = (type) => {
    const labels = {
      urgent: 'Urgent',
      info: 'Information',
      tache: 'Tâche',
      evenement: 'Événement'
    }
    return labels[type] || type
  }

  const getPriorityBadge = (priorite) => {
    const badges = {
      haute: { label: 'Haute', class: 'priority-high' },
      moyenne: { label: 'Moyenne', class: 'priority-medium' },
      basse: { label: 'Basse', class: 'priority-low' }
    }
    return badges[priorite] || { label: priorite, class: '' }
  }

  const filteredAnnouncements = announcements.filter(a => {
    if (filterType === 'all') return true
    return a.type === filterType
  })

  if (!user) {
    return <div style={{padding: '20px'}}>Chargement...</div>
  }

  const handleAddAnnouncement = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newAnnouncement = {
      titre: formData.get('titre'),
      contenu: formData.get('contenu'),
      type: formData.get('type'),
      priorite: formData.get('priorite')
    }
    
    try {
      await announcementsAPI.create(newAnnouncement)
      setShowAddModal(false)
      fetchAnnouncements() // Refresh list
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'annonce:', error)
      alert('Erreur lors de l\'ajout de l\'annonce')
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      try {
        await announcementsAPI.delete(id)
        fetchAnnouncements() // Refresh list
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'annonce:', error)
        alert('Erreur lors de la suppression de l\'annonce')
      }
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return 'À l\'instant'
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`
    
    return date.toLocaleDateString('fr-FR')
  }

  if (!user) return null

  return (
    <div className="professional-dashboard">
      {/* Sidebar */}
      <ProfessionalSidebar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="page-header">
          <div>
            <h1>📢 Annonces & Communications</h1>
            <p>Consultez et gérez les annonces de l'association</p>
          </div>
          {user.role === 'admin' && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              ➕ Nouvelle annonce
            </button>
          )}
        </header>

        {/* Filters */}
        <div className="filter-buttons-announcements">
          <button 
            className={filterType === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('all')}
          >
            📢 Toutes ({announcements.length})
          </button>
          <button 
            className={filterType === 'urgent' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('urgent')}
          >
            🚨 Urgentes ({announcements.filter(a => a.type === 'urgent').length})
          </button>
          <button 
            className={filterType === 'info' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('info')}
          >
            ℹ️ Informations ({announcements.filter(a => a.type === 'info').length})
          </button>
          <button 
            className={filterType === 'tache' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('tache')}
          >
            📋 Tâches ({announcements.filter(a => a.type === 'tache').length})
          </button>
          <button 
            className={filterType === 'evenement' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterType('evenement')}
          >
            📅 Événements ({announcements.filter(a => a.type === 'evenement').length})
          </button>
        </div>

        {/* Announcements List */}
        <div className="announcements-container">
          {filteredAnnouncements.map(announcement => (
            <div 
              key={announcement._id} 
              className={`announcement-card ${announcement.type}`}
            >
              <div className="announcement-header-card">
                <div className="announcement-type-icon">
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="announcement-meta">
                  <div className="announcement-type-label">
                    {getTypeLabel(announcement.type)}
                  </div>
                  <div className="announcement-time">
                    {getTimeAgo(announcement.createdAt)}
                  </div>
                </div>
                <div className="announcement-priority">
                  <span className={`priority-badge ${getPriorityBadge(announcement.priorite).class}`}>
                    {getPriorityBadge(announcement.priorite).label}
                  </span>
                </div>
                {user.role === 'admin' && (
                  <button 
                    className="btn-delete-announcement"
                    onClick={() => handleDeleteAnnouncement(announcement._id)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                )}
              </div>

              <div className="announcement-body">
                <h3>{announcement.titre}</h3>
                <p>{announcement.contenu}</p>
              </div>

              <div className="announcement-footer-card">
                <div className="announcement-author">
                  <div className="author-avatar">
                    {announcement.createdBy.prenom[0]}{announcement.createdBy.nom[0]}
                  </div>
                  <div>
                    <div className="author-name">
                      {announcement.createdBy.prenom} {announcement.createdBy.nom}
                    </div>
                    <div className="author-role">Publié le {new Date(announcement.createdAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📢</div>
              <h3>Aucune annonce</h3>
              <p>Il n'y a pas d'annonces dans cette catégorie</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Announcement Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nouvelle annonce</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddAnnouncement}>
              <div className="form-content">
                <div className="form-group full-width">
                  <label>Titre *</label>
                  <input type="text" name="titre" required placeholder="Titre de l'annonce" />
                </div>

                <div className="form-group full-width">
                  <label>Contenu *</label>
                  <textarea 
                    name="contenu" 
                    rows="6" 
                    required 
                    placeholder="Décrivez le contenu de l'annonce..."
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Type *</label>
                    <select name="type" required>
                      <option value="info">Information</option>
                      <option value="urgent">Urgent</option>
                      <option value="tache">Tâche</option>
                      <option value="evenement">Événement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priorité *</label>
                    <select name="priorite" required>
                      <option value="basse">Basse</option>
                      <option value="moyenne">Moyenne</option>
                      <option value="haute">Haute</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Publier l'annonce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Announcements
