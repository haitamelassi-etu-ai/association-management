import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { beneficiariesAPI } from '../services/api'
import './Beneficiaries.css'

function Beneficiaries() {
  const [user, setUser] = useState(null)
  const [beneficiaries, setBeneficiaries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/professional-login')
      return
    }
    setUser(JSON.parse(userData))

    // Fetch real beneficiaries from API
    fetchBeneficiaries()
  }, [navigate])

  const fetchBeneficiaries = async () => {
    try {
      setIsLoading(true)
      const response = await beneficiariesAPI.getAll()
      setBeneficiaries(response.data.data)
    } catch (error) {
      console.error('Erreur lors du chargement des bénéficiaires:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    navigate('/professional-login')
  }

  const getSituationLabel = (situation) => {
    const labels = {
      'celibataire': 'Célibataire',
      'marie': 'Marié',
      'divorce': 'Divorcé',
      'veuf': 'Veuf',
      'autre': 'Autre'
    }
    return labels[situation] || situation
  }

  const getStatutBadge = (statut) => {
    const badges = {
      heberge: { label: 'Hébergé', class: 'badge-heberge' },
      sorti: { label: 'Sorti', class: 'badge-sorti' },
      en_suivi: { label: 'En suivi', class: 'badge-suivi' },
      transfere: { label: 'Transféré', class: 'badge-transfere' }
    }
    return badges[statut] || { label: statut, class: '' }
  }

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = 
      b.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.telephone.includes(searchTerm)
    
    const matchesStatut = filterStatut === 'all' || b.statut === filterStatut

    return matchesSearch && matchesStatut
  })

  if (!user) {
    return <div style={{padding: '20px'}}>Chargement...</div>
  }

  const handleAddBeneficiary = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newBeneficiary = {
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      dateNaissance: formData.get('dateNaissance'),
      telephone: formData.get('telephone'),
      dateEntree: new Date().toISOString().split('T')[0],
      statut: 'heberge',
      situationFamiliale: formData.get('situationFamiliale'),
      nombreEnfants: parseInt(formData.get('nombreEnfants')) || 0,
      professionAvant: formData.get('professionAvant'),
      notes: formData.get('notes')
    }
    
    try {
      const response = await beneficiariesAPI.create(newBeneficiary)
      console.log('Bénéficiaire ajouté:', response.data)
      setShowAddModal(false)
      e.target.reset()
      fetchBeneficiaries() // Refresh list
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bénéficiaire:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Erreur inconnue'
      alert('Erreur lors de l\'ajout du bénéficiaire: ' + errorMsg)
    }
  }

  if (!user) return null

  return (
    <div className="professional-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" className="sidebar-logo" />
          <h2>Portail Pro</h2>
        </div>

        <nav className="sidebar-nav">
          <a href="/professional/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="/professional/beneficiaries" className="nav-item active">
            <span className="nav-icon">👥</span>
            <span>Bénéficiaires</span>
          </a>
          <a href="/professional/attendance" className="nav-item">
            <span className="nav-icon">⏰</span>
            <span>Pointage</span>
          </a>
          <a href="/professional/announcements" className="nav-item">
            <span className="nav-icon">📢</span>
            <span>Annonces</span>
          </a>
          <a href="/professional/reports" className="nav-item">
            <span className="nav-icon">📈</span>
            <span>Rapports</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.nom?.[0] || 'U'}{user?.prenom?.[0] || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{user?.prenom || ''} {user?.nom || ''}</div>
              <div className="user-role">{user?.role || 'Staff'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout-sidebar">
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="page-header">
          <div>
            <h1>👥 Gestion des Bénéficiaires</h1>
            <p>Liste complète des bénéficiaires de l'association</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            ➕ Nouveau bénéficiaire
          </button>
        </header>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button 
              className={filterStatut === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatut('all')}
            >
              Tous ({beneficiaries.length})
            </button>
            <button 
              className={filterStatut === 'heberge' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatut('heberge')}
            >
              Hébergés ({beneficiaries.filter(b => b.statut === 'heberge').length})
            </button>
            <button 
              className={filterStatut === 'en_suivi' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatut('en_suivi')}
            >
              En suivi ({beneficiaries.filter(b => b.statut === 'en_suivi').length})
            </button>
            <button 
              className={filterStatut === 'sorti' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatut('sorti')}
            >
              Sortis ({beneficiaries.filter(b => b.statut === 'sorti').length})
            </button>
          </div>
        </div>

        {/* Beneficiaries Table */}
        <div className="content-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>Date de naissance</th>
                  <th>Téléphone</th>
                  <th>Date d'entrée</th>
                  <th>Statut</th>
                  <th>Situation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeneficiaries.map(beneficiary => (
                  <tr key={beneficiary._id}>
                    <td>
                      <div className="beneficiary-name">
                        <div className="beneficiary-avatar">
                          {beneficiary?.prenom?.[0] || 'B'}{beneficiary?.nom?.[0] || 'B'}
                        </div>
                        <div>
                          <div className="name-primary">{beneficiary?.prenom || ''} {beneficiary?.nom || ''}</div>
                          <div className="name-secondary">{beneficiary?.professionAvant || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{beneficiary?.dateNaissance ? new Date(beneficiary.dateNaissance).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    <td>{beneficiary?.telephone || 'N/A'}</td>
                    <td>{beneficiary?.dateEntree ? new Date(beneficiary.dateEntree).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    <td>
                      <span className={`badge ${getStatutBadge(beneficiary?.statut || 'heberge').class}`}>
                        {getStatutBadge(beneficiary?.statut || 'heberge').label}
                      </span>
                    </td>
                    <td>
                      {getSituationLabel(beneficiary?.situationFamiliale) || 'N/A'}
                      {beneficiary?.nombreEnfants > 0 && ` (${beneficiary.nombreEnfants} enfant${beneficiary.nombreEnfants > 1 ? 's' : ''})`}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon"
                          onClick={() => setSelectedBeneficiary(beneficiary)}
                          title="Voir détails"
                        >
                          👁️
                        </button>
                        <button className="btn-icon" title="Modifier">✏️</button>
                        <button className="btn-icon" title="Ajouter suivi">📝</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBeneficiaries.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Aucun bénéficiaire trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Beneficiary Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nouveau bénéficiaire</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddBeneficiary}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="nom" required />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="prenom" required />
                </div>
                <div className="form-group">
                  <label>Date de naissance *</label>
                  <input type="date" name="dateNaissance" required />
                </div>
                <div className="form-group">
                  <label>Téléphone *</label>
                  <input type="tel" name="telephone" required />
                </div>
                <div className="form-group">
                  <label>Situation familiale *</label>
                  <select name="situationFamiliale" required>
                    <option value="celibataire">Célibataire</option>
                    <option value="marie">Marié</option>
                    <option value="divorce">Divorcé</option>
                    <option value="veuf">Veuf</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre d'enfants</label>
                  <input type="number" name="nombreEnfants" defaultValue="0" min="0" />
                </div>
                <div className="form-group full-width">
                  <label>Profession avant</label>
                  <input type="text" name="professionAvant" />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" rows="3"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedBeneficiary && (
        <div className="modal-overlay" onClick={() => setSelectedBeneficiary(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Détails du bénéficiaire</h2>
              <button className="btn-close" onClick={() => setSelectedBeneficiary(null)}>✕</button>
            </div>
            <div className="details-content">
              <div className="details-section">
                <h3>Informations personnelles</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Nom complet</label>
                    <p>{selectedBeneficiary?.prenom || ''} {selectedBeneficiary?.nom || ''}</p>
                  </div>
                  <div className="detail-item">
                    <label>Date de naissance</label>
                    <p>{selectedBeneficiary?.dateNaissance ? new Date(selectedBeneficiary.dateNaissance).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <p>{selectedBeneficiary?.telephone || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Situation familiale</label>
                    <p>{getSituationLabel(selectedBeneficiary?.situationFamiliale) || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Nombre d'enfants</label>
                    <p>{selectedBeneficiary?.nombreEnfants || 0}</p>
                  </div>
                  <div className="detail-item">
                    <label>Profession avant</label>
                    <p>{selectedBeneficiary.professionAvant}</p>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Informations hébergement</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Date d'entrée</label>
                    <p>{new Date(selectedBeneficiary.dateEntree).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {selectedBeneficiary.dateSortie && (
                    <div className="detail-item">
                      <label>Date de sortie</label>
                      <p>{new Date(selectedBeneficiary.dateSortie).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Statut</label>
                    <p>
                      <span className={`badge ${getStatutBadge(selectedBeneficiary.statut).class}`}>
                        {getStatutBadge(selectedBeneficiary.statut).label}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {selectedBeneficiary.notes && (
                <div className="details-section">
                  <h3>Notes</h3>
                  <p className="notes-text">{selectedBeneficiary.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedBeneficiary(null)}>
                Fermer
              </button>
              <button className="btn-primary">
                ✏️ Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Beneficiaries
