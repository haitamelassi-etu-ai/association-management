import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { beneficiariesAPI } from '../services/api'
import NotificationBell from './NotificationBell'
import NotificationCenter from './NotificationCenter'
import ChatFloatingButton from './ChatFloatingButton'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { ProfessionalSidebar } from './SharedSidebar'
import './ProfessionalDashboard.css'

function ProfessionalDashboard() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    heberge: 0,
    nouveauxCeMois: 0,
    enSuivi: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/login')
      return
    }
    
    try {
      const parsedUser = JSON.parse(userData)
      console.log('👤 User chargé dans Dashboard:', parsedUser)
      setUser(parsedUser)
      
      // Fetch real stats from API
      fetchStats()
    } catch (error) {
      console.error('❌ Erreur parsing user:', error)
      navigate('/login')
    }
  }, [navigate])

  const fetchStats = async () => {
    try {
      const response = await beneficiariesAPI.getStats()
      console.log('📊 Stats reçues:', response.data.data)
      setStats(response.data.data)
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error)
      // Keep default stats on error
      setStats({
        total: 0,
        heberge: 0,
        nouveauxCeMois: 0,
        enSuivi: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('professionalToken')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  if (!user) {
    console.log('⏳ User pas encore chargé...')
    return <div style={{padding: '20px'}}>Chargement...</div>
  }

  return (
    <div className="professional-dashboard">
      {/* Sidebar */}
      <ProfessionalSidebar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{t('dashboard.title')}</h1>
            <p>{t('common.welcome')}, {user?.prenom || ''} {user?.nom || ''}</p>
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell onClick={() => setShowNotifications(true)} />
            <button className="btn-action">
              <span>📢</span> {t('nav.announcements')}
            </button>
            <button className="btn-action primary">
              <span>➕</span> {t('beneficiaries.newBeneficiary')}
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">{t('dashboard.totalBeneficiaries')}</div>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">🏠</div>
            <div className="stat-content">
              <div className="stat-label">{t('dashboard.currentlyHosted')}</div>
              <div className="stat-value">{stats.heberge}</div>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">{t('dashboard.newThisMonth')}</div>
              <div className="stat-value">{stats.nouveauxCeMois}</div>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">👁️</div>
            <div className="stat-content">
              <div className="stat-label">{t('dashboard.inFollowUp')}</div>
              <div className="stat-value">{stats.enSuivi}</div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="dashboard-content">
          <div className="content-card">
            <div className="card-header">
              <h3>📋 Activités récentes</h3>
              <a href="#" className="link-more">Voir tout →</a>
            </div>
            <div className="activities-list">
              <div className="activity-item">
                <div className="activity-icon new">➕</div>
                <div className="activity-details">
                  <div className="activity-title">Nouveau bénéficiaire ajouté</div>
                  <div className="activity-meta">Mohamed El Amrani · Il y a 2h</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon update">✏️</div>
                <div className="activity-details">
                  <div className="activity-title">Mise à jour du suivi social</div>
                  <div className="activity-meta">Ahmed Benali · Il y a 5h</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon check">✅</div>
                <div className="activity-details">
                  <div className="activity-title">Sortie réussie</div>
                  <div className="activity-meta">Fatima Zahra · Hier</div>
                </div>
              </div>
            </div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <h3>📢 Annonces importantes</h3>
              <a href="#" className="link-more">Voir tout →</a>
            </div>
            <div className="announcements-list">
              <div className="announcement-item urgent">
                <div className="announcement-badge">Urgent</div>
                <div className="announcement-title">Réunion d'équipe demain 10h</div>
                <div className="announcement-date">Aujourd'hui</div>
              </div>
              <div className="announcement-item info">
                <div className="announcement-badge">Info</div>
                <div className="announcement-title">Nouvelle procédure d'accueil</div>
                <div className="announcement-date">Il y a 2 jours</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      )}

      {/* Chat Floating Button */}
      <ChatFloatingButton />
    </div>
  )
}

export default ProfessionalDashboard
