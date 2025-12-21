import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { authAPI } from '../services/api'
import './StaffManagement.css'

function StaffManagement() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentStaff, setCurrentStaff] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterShift, setFilterShift] = useState('all')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    poste: '',
    shift: 'jour',
    status: 'active'
  })

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      const response = await api.get('/users')
      setStaff(response.data.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Erreur chargement staff:', error)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddStaff = () => {
    setEditMode(false)
    setCurrentStaff(null)
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      password: '',
      telephone: '',
      poste: '',
      shift: 'jour',
      status: 'active'
    })
    setShowModal(true)
  }

  const handleEditStaff = (member) => {
    setEditMode(true)
    setCurrentStaff(member)
    setFormData({
      nom: member.nom,
      prenom: member.prenom,
      email: member.email,
      password: '',
      telephone: member.telephone || '',
      poste: member.poste || '',
      shift: member.shift || 'jour',
      status: member.status || 'active'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editMode && currentStaff) {
        // Update staff
        const response = await api.put(`/users/${currentStaff._id}`, formData)
        if (response.data.success) {
          logActivity('edit_staff', `Modification: ${formData.nom} ${formData.prenom}`)
          loadStaff()
          setShowModal(false)
        }
      } else {
        // Add new staff
        const response = await authAPI.register(formData)
        if (response.data.success) {
          logActivity('add_staff', `Nouveau staff: ${formData.nom} ${formData.prenom}`)
          loadStaff()
          setShowModal(false)
        }
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur lors de la sauvegarde: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active'
    
    // Si on désactive, faire auto check-out
    const updates = { status: newStatus }
    if (newStatus === 'inactive' && member.isWorking) {
      updates.isWorking = false
    }

    try {
      const response = await api.put(`/users/${member._id}`, updates)
      if (response.data.success) {
        const message = newStatus === 'inactive' && member.isWorking 
          ? `${member.nom} ${member.prenom}: ${newStatus} (auto check-out)`
          : `${member.nom} ${member.prenom}: ${newStatus}`
        logActivity('toggle_staff_status', message)
        loadStaff()
      }
    } catch (error) {
      console.error('Erreur toggle status:', error)
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeleteStaff = async (member) => {
    if (window.confirm(`Supprimer ${member.nom} ${member.prenom}?`)) {
      try {
        const response = await api.delete(`/users/${member._id}`)
        if (response.data.success) {
          logActivity('delete_staff', `Suppression: ${member.nom} ${member.prenom}`)
          loadStaff()
        }
      } catch (error) {
        console.error('Erreur suppression:', error)
        alert('Erreur: ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleCheckInOut = async (member) => {
    // Check if staff is active
    if (member.status !== 'active') {
      alert('⚠️ Ce personnel est inactif. Activez-le d\'abord pour permettre le check-in.')
      return
    }

    try {
      const newWorkingStatus = !member.isWorking
      const response = await api.put(`/users/${member._id}`, { isWorking: newWorkingStatus })
      if (response.data.success) {
        const action = newWorkingStatus ? 'Check-in' : 'Check-out'
        logActivity('staff_checkin', `${action}: ${member.nom} ${member.prenom}`)
        loadStaff()
      }
    } catch (error) {
      console.error('Erreur check-in/out:', error)
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  const logActivity = (type, description) => {
    const activityLog = JSON.parse(localStorage.getItem('activityLog') || '[]')
    activityLog.unshift({
      id: Date.now().toString(),
      type,
      user: 'Admin',
      description,
      timestamp: new Date().toISOString()
    })
    localStorage.setItem('activityLog', JSON.stringify(activityLog))
  }

  const filteredStaff = staff.filter(member => {
    const matchSearch = `${member.nom} ${member.prenom} ${member.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || member.status === filterStatus
    const matchShift = filterShift === 'all' || member.shift === filterShift
    return matchSearch && matchStatus && matchShift
  })

  const activeCount = staff.filter(m => m.status === 'active').length
  const workingNow = staff.filter(m => m.isWorking).length
  const nightShiftCount = staff.filter(m => m.shift === 'nuit').length
  const dayShiftCount = staff.filter(m => m.shift === 'jour').length

  return (
    <div className="staff-management">
      <header className="staff-header">
        <div className="header-content">
          <div>
            <h1>👥 Gestion du Personnel</h1>
            <p>Suivi des employés et des horaires</p>
          </div>
          <button onClick={() => navigate('/admin')} className="btn-back">
            ← Retour Admin
          </button>
        </div>
      </header>

      <div className="staff-container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{staff.length}</h3>
              <p>Total Personnel</p>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{activeCount}</h3>
              <p>Actifs</p>
            </div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon">💼</div>
            <div className="stat-info">
              <h3>{workingNow}</h3>
              <p>Au travail maintenant</p>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">☀️</div>
            <div className="stat-info">
              <h3>{dayShiftCount}</h3>
              <p>Équipe Jour</p>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon">🌙</div>
            <div className="stat-info">
              <h3>{nightShiftCount}</h3>
              <p>Équipe Nuit</p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="staff-actions">
          <div className="search-filters">
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">📊 Tous les statuts</option>
              <option value="active">✅ Actifs</option>
              <option value="inactive">⏸️ Inactifs</option>
            </select>
            <select 
              value={filterShift} 
              onChange={(e) => setFilterShift(e.target.value)}
              className="filter-select"
            >
              <option value="all">🕐 Tous les horaires</option>
              <option value="jour">☀️ Équipe Jour</option>
              <option value="nuit">🌙 Équipe Nuit</option>
            </select>
          </div>
          <button onClick={handleAddStaff} className="btn-add">
            ➕ Ajouter Personnel
          </button>
        </div>

        {/* Staff List */}
        <div className="staff-list">
          {loading ? (
            <div className="loading">Chargement...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="empty-state">Aucun personnel trouvé</div>
          ) : (
            <div className="staff-grid">
              {filteredStaff.map(member => (
                <div key={member._id} className="staff-card">
                  <div className="staff-header-card">
                    <div className="staff-avatar">
                      {member.nom?.[0]}{member.prenom?.[0]}
                    </div>
                    <div className="staff-info">
                      <h3>{member.nom} {member.prenom}</h3>
                      <p className="staff-poste">{member.poste || 'Non défini'}</p>
                    </div>
                    <div className="staff-badges">
                      <span className={`status-badge ${member.status || 'active'}`}>
                        {member.status === 'active' ? '✅ Actif' : '⏸️ Inactif'}
                      </span>
                      <span className={`shift-badge ${member.shift || 'jour'}`}>
                        {member.shift === 'nuit' ? '🌙 Nuit' : '☀️ Jour'}
                      </span>
                      {member.isWorking && (
                        <span className="working-badge">
                          💼 Au travail
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="staff-details">
                    <div className="detail-row">
                      <span className="detail-label">📧 Email:</span>
                      <span className="detail-value">{member.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">📱 Téléphone:</span>
                      <span className="detail-value">{member.telephone || 'Non renseigné'}</span>
                    </div>
                  </div>

                  <div className="staff-actions-card">
                    <button 
                      onClick={() => handleCheckInOut(member)}
                      className={`btn-checkin ${member.isWorking ? 'checkout' : 'checkin'}`}
                      disabled={member.status !== 'active'}
                      style={{
                        opacity: member.status !== 'active' ? 0.5 : 1,
                        cursor: member.status !== 'active' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {member.isWorking ? '🚪 Check-out' : '💼 Check-in'}
                    </button>
                    <button 
                      onClick={() => handleEditStaff(member)}
                      className="btn-edit"
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(member)}
                      className={`btn-toggle ${member.status === 'active' ? 'deactivate' : 'activate'}`}
                    >
                      {member.status === 'active' ? '⏸️ Désactiver' : '✅ Activer'}
                    </button>
                    <button 
                      onClick={() => handleDeleteStaff(member)}
                      className="btn-delete"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editMode ? '✏️ Modifier Personnel' : '➕ Ajouter Personnel'}</h2>
            <form onSubmit={handleSubmit} className="staff-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Poste</label>
                  <input
                    type="text"
                    name="poste"
                    value={formData.poste}
                    onChange={handleInputChange}
                    placeholder="Ex: Éducateur, Assistant social..."
                  />
                </div>
                <div className="form-group">
                  <label>Mot de passe {editMode && '(laisser vide pour ne pas changer)'}</label>
                  <div style={{position: 'relative'}}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editMode}
                      style={{paddingRight: '45px'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0',
                        width: '30px',
                        height: '30px'
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Équipe</label>
                  <select name="shift" value={formData.shift} onChange={handleInputChange}>
                    <option value="jour">☀️ Équipe Jour</option>
                    <option value="nuit">🌙 Équipe Nuit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="active">✅ Actif</option>
                    <option value="inactive">⏸️ Inactif</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Annuler
                </button>
                <button type="submit" className="btn-save">
                  💾 Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffManagement
