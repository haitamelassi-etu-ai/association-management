import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './BackupSystem.css'

function BackupSystem() {
  const [backups, setBackups] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check admin authentication
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
    if (!isAdminLoggedIn) {
      navigate('/admin-login')
      return
    }

    // Load backups list
    loadBackups()
  }, [navigate])

  const loadBackups = () => {
    const savedBackups = JSON.parse(localStorage.getItem('systemBackups') || '[]')
    setBackups(savedBackups)
  }

  const createBackup = () => {
    setIsCreating(true)
    
    // Simulate backup creation delay
    setTimeout(() => {
      // Collect all data
      const backupData = {
        users: localStorage.getItem('systemUsers'),
        beneficiaries: localStorage.getItem('beneficiaries'),
        announcements: localStorage.getItem('announcements'),
        attendance: localStorage.getItem('attendance'),
        news: localStorage.getItem('newsArticles'),
        settings: localStorage.getItem('systemSettings'),
        activityLog: localStorage.getItem('activityLog'),
        professionalUser: localStorage.getItem('professionalUser')
      }

      // Create backup object
      const backup = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        size: JSON.stringify(backupData).length,
        dataCount: {
          users: JSON.parse(backupData.users || '[]').length,
          beneficiaries: JSON.parse(backupData.beneficiaries || '[]').length,
          announcements: JSON.parse(backupData.announcements || '[]').length,
          attendance: JSON.parse(backupData.attendance || '[]').length
        },
        data: backupData
      }

      // Save backup
      const backupsList = JSON.parse(localStorage.getItem('systemBackups') || '[]')
      backupsList.unshift(backup)
      
      // Keep only last 10 backups
      const limitedBackups = backupsList.slice(0, 10)
      localStorage.setItem('systemBackups', JSON.stringify(limitedBackups))

      // Log activity
      logActivity('backup', `Sauvegarde créée - ${formatFileSize(backup.size)}`)

      setBackups(limitedBackups)
      setIsCreating(false)
      alert('✅ Sauvegarde créée avec succès!')
    }, 1500)
  }

  const restoreBackup = (backupId) => {
    if (!window.confirm('⚠️ Êtes-vous sûr ? Toutes les données actuelles seront remplacées par cette sauvegarde.')) {
      return
    }

    const backup = backups.find(b => b.id === backupId)
    if (!backup) {
      alert('❌ Sauvegarde introuvable')
      return
    }

    // Restore all data
    Object.keys(backup.data).forEach(key => {
      if (backup.data[key]) {
        localStorage.setItem(key, backup.data[key])
      }
    })

    // Log activity
    logActivity('restore', `Restauration depuis sauvegarde du ${new Date(backup.date).toLocaleString('fr-FR')}`)

    alert('✅ Restauration réussie! La page va se recharger.')
    setTimeout(() => window.location.reload(), 1000)
  }

  const downloadBackup = (backupId) => {
    const backup = backups.find(b => b.id === backupId)
    if (!backup) return

    const dataStr = JSON.stringify(backup, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup-${new Date(backup.date).toISOString().split('T')[0]}.json`
    link.click()

    logActivity('backup', `Téléchargement sauvegarde - ${new Date(backup.date).toLocaleDateString('fr-FR')}`)
  }

  const deleteBackup = (backupId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) {
      return
    }

    const updatedBackups = backups.filter(b => b.id !== backupId)
    setBackups(updatedBackups)
    localStorage.setItem('systemBackups', JSON.stringify(updatedBackups))

    logActivity('backup', 'Suppression d\'une sauvegarde')
  }

  const importBackup = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result)
        
        if (!backup.data || !backup.date) {
          alert('❌ Fichier de sauvegarde invalide')
          return
        }

        // Restore data
        Object.keys(backup.data).forEach(key => {
          if (backup.data[key]) {
            localStorage.setItem(key, backup.data[key])
          }
        })

        logActivity('restore', `Import et restauration depuis fichier`)
        alert('✅ Import réussi! La page va se recharger.')
        setTimeout(() => window.location.reload(), 1000)
      } catch (error) {
        alert('❌ Erreur lors de l\'import du fichier')
      }
    }
    reader.readAsText(file)
  }

  const logActivity = (type, description) => {
    const activities = JSON.parse(localStorage.getItem('activityLog') || '[]')
    activities.unshift({
      id: Date.now().toString(),
      type,
      description,
      timestamp: new Date().toISOString(),
      user: 'Admin Principal'
    })
    localStorage.setItem('activityLog', JSON.stringify(activities.slice(0, 100)))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>💾 Système de Sauvegarde</h1>
        <div className="admin-actions">
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Retour au panneau
          </button>
          <label className="btn-secondary" style={{cursor: 'pointer'}}>
            📥 Importer
            <input
              type="file"
              accept=".json"
              onChange={importBackup}
              style={{display: 'none'}}
            />
          </label>
          <button 
            onClick={createBackup} 
            className="btn-primary"
            disabled={isCreating}
          >
            {isCreating ? '⏳ Création...' : '➕ Nouvelle sauvegarde'}
          </button>
        </div>
      </div>

      {/* Backup Stats */}
      <div className="backup-stats">
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{backups.length}</div>
            <div className="stat-label">Sauvegardes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">
              {backups.length > 0 ? formatFileSize(backups.reduce((sum, b) => sum + b.size, 0)) : '0 B'}
            </div>
            <div className="stat-label">Espace Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">
              {backups.length > 0 ? new Date(backups[0].date).toLocaleDateString('fr-FR') : 'N/A'}
            </div>
            <div className="stat-label">Dernière Sauvegarde</div>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="content-card">
        <h3>📜 Historique des Sauvegardes</h3>
        
        {backups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💾</div>
            <h3>Aucune sauvegarde</h3>
            <p>Créez votre première sauvegarde pour sécuriser vos données</p>
          </div>
        ) : (
          <div className="backups-list">
            {backups.map((backup) => (
              <div key={backup.id} className="backup-item">
                <div className="backup-icon">💾</div>
                <div className="backup-info">
                  <div className="backup-title">
                    Sauvegarde du {new Date(backup.date).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(backup.date).toLocaleTimeString('fr-FR')}
                  </div>
                  <div className="backup-meta">
                    <span>📦 {formatFileSize(backup.size)}</span>
                    <span>👥 {backup.dataCount.users} utilisateurs</span>
                    <span>🤝 {backup.dataCount.beneficiaries} bénéficiaires</span>
                    <span>📢 {backup.dataCount.announcements} annonces</span>
                  </div>
                </div>
                <div className="backup-actions">
                  <button
                    onClick={() => restoreBackup(backup.id)}
                    className="btn-icon"
                    title="Restaurer"
                  >
                    ♻️
                  </button>
                  <button
                    onClick={() => downloadBackup(backup.id)}
                    className="btn-icon"
                    title="Télécharger"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.id)}
                    className="btn-icon danger"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>ℹ️ Informations importantes</h4>
        <ul>
          <li>Les sauvegardes sont stockées localement dans votre navigateur</li>
          <li>Un maximum de 10 sauvegardes est conservé automatiquement</li>
          <li>Pensez à télécharger régulièrement vos sauvegardes en fichiers JSON</li>
          <li>La restauration remplace toutes les données actuelles</li>
          <li>Les sauvegardes incluent: utilisateurs, bénéficiaires, annonces, présences, actualités</li>
        </ul>
      </div>
    </div>
  )
}

export default BackupSystem
