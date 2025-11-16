import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './UserManagement.css'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    // Check admin authentication
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
    if (!isAdminLoggedIn) {
      navigate('/admin-login')
      return
    }

    // Load users from localStorage
    loadUsers()
  }, [navigate])

  const loadUsers = () => {
    const savedUsers = localStorage.getItem('systemUsers')
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers))
    } else {
      // Default users
      const defaultUsers = [
        {
          id: '1',
          nom: 'Admin',
          prenom: 'Principal',
          email: 'admin@adelelouerif.org',
          role: 'admin',
          telephone: '0612345678',
          poste: 'Directeur',
          dateCreation: '2024-01-15',
          statut: 'actif',
          permissions: ['all']
        },
        {
          id: '2',
          nom: 'Benali',
          prenom: 'Fatima',
          email: 'f.benali@adelelouerif.org',
          role: 'staff',
          telephone: '0623456789',
          poste: 'Assistante Sociale',
          dateCreation: '2024-03-20',
          statut: 'actif',
          permissions: ['beneficiaries', 'announcements']
        },
        {
          id: '3',
          nom: 'Alami',
          prenom: 'Hassan',
          email: 'h.alami@adelelouerif.org',
          role: 'staff',
          telephone: '0634567890',
          poste: 'Coordinateur',
          dateCreation: '2024-05-10',
          statut: 'actif',
          permissions: ['attendance', 'reports']
        }
      ]
      setUsers(defaultUsers)
      localStorage.setItem('systemUsers', JSON.stringify(defaultUsers))
    }
  }

  const saveUsers = (updatedUsers) => {
    setUsers(updatedUsers)
    localStorage.setItem('systemUsers', JSON.stringify(updatedUsers))
  }

  const handleAddUser = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const newUser = {
      id: Date.now().toString(),
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      email: formData.get('email'),
      role: formData.get('role'),
      telephone: formData.get('telephone'),
      poste: formData.get('poste'),
      dateCreation: new Date().toISOString().split('T')[0],
      statut: 'actif',
      permissions: Array.from(formData.getAll('permissions'))
    }

    const updatedUsers = [...users, newUser]
    saveUsers(updatedUsers)
    setShowAddModal(false)
    
    // Log activity
    logActivity('add_user', `Ajout utilisateur: ${newUser.prenom} ${newUser.nom}`)
  }

  const handleEditUser = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const updatedUser = {
      ...selectedUser,
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      email: formData.get('email'),
      role: formData.get('role'),
      telephone: formData.get('telephone'),
      poste: formData.get('poste'),
      permissions: Array.from(formData.getAll('permissions'))
    }

    const updatedUsers = users.map(u => u.id === selectedUser.id ? updatedUser : u)
    saveUsers(updatedUsers)
    setShowEditModal(false)
    setSelectedUser(null)
    
    // Log activity
    logActivity('edit_user', `Modification utilisateur: ${updatedUser.prenom} ${updatedUser.nom}`)
  }

  const handleDeleteUser = (userId) => {
    const user = users.find(u => u.id === userId)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?`)) {
      const updatedUsers = users.filter(u => u.id !== userId)
      saveUsers(updatedUsers)
      
      // Log activity
      logActivity('delete_user', `Suppression utilisateur: ${user.prenom} ${user.nom}`)
    }
  }

  const handleToggleStatus = (userId) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const newStatus = u.statut === 'actif' ? 'inactif' : 'actif'
        logActivity('toggle_status', `Changement statut: ${u.prenom} ${u.nom} → ${newStatus}`)
        return { ...u, statut: newStatus }
      }
      return u
    })
    saveUsers(updatedUsers)
  }

  const logActivity = (type, description) => {
    const activities = JSON.parse(localStorage.getItem('activityLog') || '[]')
    const newActivity = {
      id: Date.now().toString(),
      type,
      description,
      timestamp: new Date().toISOString(),
      user: 'Admin Principal'
    }
    activities.unshift(newActivity)
    localStorage.setItem('activityLog', JSON.stringify(activities.slice(0, 100))) // Keep last 100
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', class: 'role-admin' },
      staff: { label: 'Staff', class: 'role-staff' },
      viewer: { label: 'Viewer', class: 'role-viewer' }
    }
    return badges[role] || { label: role, class: '' }
  }

  const getStatutBadge = (statut) => {
    return statut === 'actif' 
      ? { label: 'Actif', class: 'status-active' }
      : { label: 'Inactif', class: 'status-inactive' }
  }

  const filteredUsers = users.filter(user => {
    const matchSearch = user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
            className={filterRole === 'staff' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('staff')}
          >
            Staff ({users.filter(u => u.role === 'staff').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="content-card">
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
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar-small">
                      {user.prenom[0]}{user.nom[0]}
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
                <td>{new Date(user.dateCreation).toLocaleDateString('fr-FR')}</td>
                <td>
                  <span className={`badge ${getStatutBadge(user.statut).class}`}>
                    {getStatutBadge(user.statut).label}
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
                      onClick={() => handleToggleStatus(user.id)}
                      title={user.statut === 'actif' ? 'Désactiver' : 'Activer'}
                    >
                      {user.statut === 'actif' ? '🔴' : '🟢'}
                    </button>
                    {user.role !== 'admin' && (
                      <button 
                        className="btn-icon danger"
                        onClick={() => handleDeleteUser(user.id)}
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
                  <label>Téléphone *</label>
                  <input type="tel" name="telephone" required />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select name="role" required>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Poste *</label>
                  <input type="text" name="poste" required />
                </div>
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" name="permissions" value="beneficiaries" />
                    Gestion des bénéficiaires
                  </label>
                  <label>
                    <input type="checkbox" name="permissions" value="attendance" />
                    Gestion du pointage
                  </label>
                  <label>
                    <input type="checkbox" name="permissions" value="announcements" />
                    Gestion des annonces
                  </label>
                  <label>
                    <input type="checkbox" name="permissions" value="reports" />
                    Accès aux rapports
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Ajouter
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
                  <label>Téléphone *</label>
                  <input type="tel" name="telephone" defaultValue={selectedUser.telephone} required />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select name="role" defaultValue={selectedUser.role} required>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Poste *</label>
                  <input type="text" name="poste" defaultValue={selectedUser.poste} required />
                </div>
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      name="permissions" 
                      value="beneficiaries"
                      defaultChecked={selectedUser.permissions.includes('beneficiaries')}
                    />
                    Gestion des bénéficiaires
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      name="permissions" 
                      value="attendance"
                      defaultChecked={selectedUser.permissions.includes('attendance')}
                    />
                    Gestion du pointage
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      name="permissions" 
                      value="announcements"
                      defaultChecked={selectedUser.permissions.includes('announcements')}
                    />
                    Gestion des annonces
                  </label>
                  <label>
                    <input 
                      type="checkbox" 
                      name="permissions" 
                      value="reports"
                      defaultChecked={selectedUser.permissions.includes('reports')}
                    />
                    Accès aux rapports
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
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
    </div>
  )
}

export default UserManagement
