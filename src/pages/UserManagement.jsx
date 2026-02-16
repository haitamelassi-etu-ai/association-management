import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersAPI } from '../services/api'
import './UserManagement.css'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('professionalToken')
    if (!token) {
      navigate('/login')
      return
    }
    loadUsers()
  }, [navigate])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await usersAPI.getAll()
      setUsers(res.data.data || [])
    } catch (err) {
      console.error('Failed to load users:', err)
      if (err.response?.status === 401) {
        navigate('/login')
      } else if (err.response?.status === 403) {
        setError('Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.')
      } else {
        setError('Impossible de charger les utilisateurs. Vérifiez la connexion.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const formData = new FormData(e.target)
    
    const newUser = {
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      telephone: formData.get('telephone'),
      poste: formData.get('poste')
    }

    try {
      await usersAPI.create(newUser)
      await loadUsers()
      setShowAddModal(false)
    } catch (err) {
      console.error('Failed to add user:', err)
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout de l\'utilisateur')
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const formData = new FormData(e.target)
    
    const updatedData = {
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      email: formData.get('email'),
      role: formData.get('role'),
      telephone: formData.get('telephone'),
      poste: formData.get('poste')
    }

    // Only include password if provided
    const password = formData.get('password')
    if (password && password.trim() !== '') {
      updatedData.password = password
    }

    try {
      await usersAPI.update(selectedUser._id, updatedData)
      await loadUsers()
      setShowEditModal(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to update user:', err)
      setError(err.response?.data?.message || 'Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u._id === userId)
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?`)) return
    
    try {
      await usersAPI.delete(userId)
      await loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const handleToggleStatus = async (userId) => {
    const user = users.find(u => u._id === userId)
    try {
      await usersAPI.update(userId, { isActive: !user.isActive })
      await loadUsers()
    } catch (err) {
      console.error('Failed to toggle status:', err)
      setError(err.response?.data?.message || 'Erreur lors du changement de statut')
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', class: 'role-admin' },
      responsable: { label: 'Responsable', class: 'role-responsable' },
      staff: { label: 'Staff', class: 'role-staff' },
      volunteer: { label: 'Bénévole', class: 'role-volunteer' }
    }
    return badges[role] || { label: role, class: '' }
  }

  const getStatutBadge = (isActive) => {
    return isActive
      ? { label: 'Actif', class: 'status-active' }
      : { label: 'Inactif', class: 'status-inactive' }
  }

  const filteredUsers = users.filter(user => {
    const matchSearch = user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = filterRole === 'all' || user.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>👥 Gestion des Utilisateurs</h1>
        <div className="admin-actions">
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Retour au panneau
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            ➕ Nouvel utilisateur
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '10px 0', padding: '12px', background: '#fee', color: '#c00', borderRadius: '8px' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={filterRole === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('all')}
          >
            Tous ({users.length})
          </button>
          <button 
            className={filterRole === 'admin' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('admin')}
          >
            Admins ({users.filter(u => u.role === 'admin').length})
          </button>
          <button 
            className={filterRole === 'responsable' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('responsable')}
          >
            Responsables ({users.filter(u => u.role === 'responsable').length})
          </button>
          <button 
            className={filterRole === 'staff' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('staff')}
          >
            Staff ({users.filter(u => u.role === 'staff').length})
          </button>
          <button 
            className={filterRole === 'volunteer' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('volunteer')}
          >
            Bénévoles ({users.filter(u => u.role === 'volunteer').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="content-card">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Chargement...</h3>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Poste</th>
                  <th>Date création</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-small">
                          {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        <div>
                          <div className="user-name-primary">{user.prenom} {user.nom}</div>
                          <div className="user-phone">{user.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadge(user.role).class}`}>
                        {getRoleBadge(user.role).label}
                      </span>
                    </td>
                    <td>{user.poste}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>
                      <span className={`badge ${getStatutBadge(user.isActive).class}`}>
                        {getStatutBadge(user.isActive).label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowEditModal(true)
                          }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon"
                          onClick={() => handleToggleStatus(user._id)}
                          title={user.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {user.isActive ? '🔴' : '🟢'}
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            className="btn-icon danger"
                            onClick={() => handleDeleteUser(user._id)}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Aucun utilisateur trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nouvel utilisateur</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
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
                  <label>Email *</label>
                  <input type="email" name="email" required />
                </div>
                <div className="form-group">
                  <label>Mot de passe *</label>
                  <input type="password" name="password" required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" name="telephone" />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select name="role" required>
                    <option value="staff">Staff</option>
                    <option value="responsable">Responsable</option>
                    <option value="admin">Admin</option>
                    <option value="volunteer">Bénévole</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Poste</label>
                  <input type="text" name="poste" />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '⏳ Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Modifier l'utilisateur</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="nom" defaultValue={selectedUser.nom} required />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="prenom" defaultValue={selectedUser.prenom} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" defaultValue={selectedUser.email} required />
                </div>
                <div className="form-group">
                  <label>Nouveau mot de passe</label>
                  <input type="password" name="password" placeholder="Laisser vide pour ne pas changer" minLength={6} />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" name="telephone" defaultValue={selectedUser.telephone} />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select name="role" defaultValue={selectedUser.role} required>
                    <option value="staff">Staff</option>
                    <option value="responsable">Responsable</option>
                    <option value="admin">Admin</option>
                    <option value="volunteer">Bénévole</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Poste</label>
                  <input type="text" name="poste" defaultValue={selectedUser.poste} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '⏳ Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
