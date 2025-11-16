import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'Association Adel Elouerif',
    logoUrl: '/images/logo.png',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    emailNotifications: true,
    smsNotifications: false,
    autoBackup: true,
    backupFrequency: 'daily',
    maxBeneficiaries: 50,
    language: 'fr',
    timezone: 'Africa/Casablanca'
  })

  const [activeTab, setActiveTab] = useState('general')
  const navigate = useNavigate()

  useEffect(() => {
    // Check admin authentication
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
    if (!isAdminLoggedIn) {
      navigate('/admin-login')
      return
    }

    // Load settings
    const savedSettings = localStorage.getItem('systemSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [navigate])

  const handleSave = (e) => {
    e.preventDefault()
    localStorage.setItem('systemSettings', JSON.stringify(settings))
    
    // Log activity
    logActivity('settings_change', 'Modification des paramètres système')
    
    alert('✅ Paramètres sauvegardés avec succès!')
  }

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      const defaultSettings = {
        siteName: 'Association Adel Elouerif',
        logoUrl: '/images/logo.png',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        emailNotifications: true,
        smsNotifications: false,
        autoBackup: true,
        backupFrequency: 'daily',
        maxBeneficiaries: 50,
        language: 'fr',
        timezone: 'Africa/Casablanca'
      }
      setSettings(defaultSettings)
      localStorage.setItem('systemSettings', JSON.stringify(defaultSettings))
      logActivity('settings_change', 'Réinitialisation des paramètres par défaut')
    }
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

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>⚙️ Paramètres Système</h1>
        <div className="admin-actions">
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Retour au panneau
          </button>
        </div>
      </div>

      <div className="settings-container">
        {/* Tabs */}
        <div className="settings-tabs">
          <button 
            className={activeTab === 'general' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('general')}
          >
            🏢 Général
          </button>
          <button 
            className={activeTab === 'appearance' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('appearance')}
          >
            🎨 Apparence
          </button>
          <button 
            className={activeTab === 'notifications' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notifications
          </button>
          <button 
            className={activeTab === 'backup' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('backup')}
          >
            💾 Sauvegarde
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>Paramètres Généraux</h3>
              
              <div className="form-group">
                <label>Nom du site</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>URL du logo</label>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Langue</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                >
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fuseau horaire</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                >
                  <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
                  <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Capacité maximale (bénéficiaires)</label>
                <input
                  type="number"
                  value={settings.maxBeneficiaries}
                  onChange={(e) => setSettings({...settings, maxBeneficiaries: parseInt(e.target.value)})}
                  min="10"
                  max="200"
                />
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Apparence</h3>
              
              <div className="form-group">
                <label>Couleur Principale</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    placeholder="#667eea"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Couleur Secondaire</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                    placeholder="#764ba2"
                  />
                </div>
              </div>

              <div className="color-preview">
                <div className="preview-box" style={{
                  background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`
                }}>
                  Aperçu du dégradé
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>Notifications</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                  />
                  <span>Activer les notifications par email</span>
                </label>
                <p className="help-text">Recevez des emails pour les événements importants</p>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                  />
                  <span>Activer les notifications par SMS</span>
                </label>
                <p className="help-text">Recevez des SMS pour les alertes urgentes</p>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="settings-section">
              <h3>Sauvegarde Automatique</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.autoBackup}
                    onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                  />
                  <span>Activer la sauvegarde automatique</span>
                </label>
                <p className="help-text">Sauvegarde automatique de toutes les données</p>
              </div>

              <div className="form-group">
                <label>Fréquence de sauvegarde</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
                  disabled={!settings.autoBackup}
                >
                  <option value="hourly">Chaque heure</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="settings-footer">
            <button type="button" onClick={handleReset} className="btn-secondary">
              🔄 Réinitialiser
            </button>
            <button type="submit" className="btn-primary">
              💾 Sauvegarder les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Settings
