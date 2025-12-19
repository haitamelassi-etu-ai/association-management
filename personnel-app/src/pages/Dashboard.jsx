import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    heberge: 0,
    nouveauxCeMois: 0,
    enSuivi: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchStats()
  }, [navigate])

  const fetchStats = async () => {
    try {
      const result = await api.getBeneficiariesStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🏢 لوحة الموظفين</h2>
          <p>{user.name}</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item active">
            📊 {t('dashboard')}
          </Link>
          <Link to="/attendance" className="nav-item">
            ⏰ {t('attendance')}
          </Link>
          <Link to="/beneficiaries" className="nav-item">
            👥 {t('beneficiaries')}
          </Link>
          <Link to="/announcements" className="nav-item">
            📢 {t('announcements')}
          </Link>
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          🚪 {t('logout')}
        </button>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1>مرحباً، {user.name}</h1>
          <p>نظرة عامة على النظام</p>
        </header>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>إجمالي المستفيدين</h3>
                <p className="stat-value">{stats.total}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏠</div>
              <div className="stat-info">
                <h3>مستفيدين مُستضافين</h3>
                <p className="stat-value">{stats.heberge}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✨</div>
              <div className="stat-info">
                <h3>جدد هذا الشهر</h3>
                <p className="stat-value">{stats.nouveauxCeMois}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <h3>في المتابعة</h3>
                <p className="stat-value">{stats.enSuivi}</p>
              </div>
            </div>
          </div>
        )}

        <div className="quick-actions">
          <h2>الإجراءات السريعة</h2>
          <div className="actions-grid">
            <Link to="/attendance" className="action-card">
              <span className="action-icon">⏰</span>
              <h3>تسجيل الحضور</h3>
              <p>سجل حضورك اليوم</p>
            </Link>

            <Link to="/beneficiaries" className="action-card">
              <span className="action-icon">➕</span>
              <h3>إضافة مستفيد</h3>
              <p>تسجيل مستفيد جديد</p>
            </Link>

            <Link to="/announcements" className="action-card">
              <span className="action-icon">📢</span>
              <h3>الإعلانات</h3>
              <p>عرض الإعلانات</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
