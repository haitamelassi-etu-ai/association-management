import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AnalyticsDashboard.css'

function AnalyticsDashboard() {
  const { t } = useTranslation()
  const defaultStats = {
    beneficiaries: { total: 0, new: 0, active: 0, trend: 0 },
    attendance: { today: 0, average: 0, trend: 0 },
    meals: { distributed: 0, trend: 0 },
    pharmacy: { dispensed: 0, lowStock: 0 },
    activity: []
  }
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week') // day, week, month, year
  const [stats, setStats] = useState(defaultStats)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(`${API_URL}/api/analytics/dashboard?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        const incoming = data.data || {}
        setStats({
          ...defaultStats,
          ...incoming,
          beneficiaries: { ...defaultStats.beneficiaries, ...(incoming.beneficiaries || {}) },
          attendance: { ...defaultStats.attendance, ...(incoming.attendance || {}) },
          meals: { ...defaultStats.meals, ...(incoming.meals || {}) },
          pharmacy: { ...defaultStats.pharmacy, ...(incoming.pharmacy || {}) },
          activity: Array.isArray(incoming.activity) ? incoming.activity : defaultStats.activity
        })
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      // Use dummy data for demo
      setStats({
        beneficiaries: { total: 248, new: 12, active: 186, trend: 8 },
        attendance: { today: 142, average: 128, trend: 11 },
        meals: { distributed: 1847, trend: 5 },
        pharmacy: { dispensed: 324, lowStock: 7 },
        activity: generateDemoActivity()
      })
    }
    setLoading(false)
  }

  const generateDemoActivity = () => {
    const days = period === 'day' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12
    return Array.from({ length: days }, (_, i) => ({
      label: period === 'day' ? `${i}h` : period === 'week' ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][i] : `${i + 1}`,
      value: Math.floor(Math.random() * 50) + 20
    }))
  }

  const StatCard = ({ icon, title, value, subtitle, trend, color }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{loading ? '...' : value}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
          <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  )

  const BarChart = ({ data, height = 200 }) => {
    if (!data || data.length === 0) return null
    const max = Math.max(...data.map(d => d.value))
    
    return (
      <div className="bar-chart" style={{ height }}>
        <div className="chart-bars">
          {data.map((item, i) => (
            <div key={i} className="bar-container">
              <div 
                className="bar"
                style={{ height: `${(item.value / max) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="bar-label">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="chart-grid">
          {[0, 25, 50, 75, 100].map(p => (
            <div key={p} className="grid-line" style={{ bottom: `${p}%` }}>
              <span>{Math.round((p / 100) * max)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const CircleProgress = ({ value, max, label, color = '#3498db' }) => {
    const percentage = (value / max) * 100
    const circumference = 2 * Math.PI * 45
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    
    return (
      <div className="circle-progress">
        <svg viewBox="0 0 100 100">
          <circle className="bg-circle" cx="50" cy="50" r="45" />
          <circle 
            className="progress-circle"
            cx="50" cy="50" r="45"
            style={{ 
              strokeDasharray,
              stroke: color
            }}
          />
        </svg>
        <div className="circle-content">
          <span className="circle-value">{value}</span>
          <span className="circle-label">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2>📊 Tableau de bord analytique</h2>
          <p>Vue d'ensemble des activités</p>
        </div>
        <div className="period-selector">
          {[
            { value: 'day', label: 'Jour' },
            { value: 'week', label: 'Semaine' },
            { value: 'month', label: 'Mois' },
            { value: 'year', label: 'Année' }
          ].map(p => (
            <button 
              key={p.value}
              className={period === p.value ? 'active' : ''}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          icon="👥"
          title="Bénéficiaires"
          value={stats.beneficiaries.total}
          subtitle={`+${stats.beneficiaries.new} nouveaux`}
          trend={stats.beneficiaries.trend}
          color="blue"
        />
        <StatCard 
          icon="✅"
          title="Présences aujourd'hui"
          value={stats.attendance.today}
          subtitle={`Moy: ${stats.attendance.average}`}
          trend={stats.attendance.trend}
          color="green"
        />
        <StatCard 
          icon="🍽️"
          title="Repas distribués"
          value={stats.meals.distributed}
          trend={stats.meals.trend}
          color="orange"
        />
        <StatCard 
          icon="💊"
          title="Médicaments"
          value={stats.pharmacy.dispensed}
          subtitle={`${stats.pharmacy.lowStock} en rupture`}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Activity Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>📈 Activité</h3>
            <span className="chart-period">
              {period === 'day' ? 'Par heure' : 
               period === 'week' ? 'Par jour' : 
               period === 'month' ? 'Par jour' : 'Par mois'}
            </span>
          </div>
          <BarChart data={stats.activity} height={220} />
        </div>

        {/* Progress Circles */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🎯 Objectifs</h3>
          </div>
          <div className="progress-circles">
            <CircleProgress 
              value={stats.beneficiaries.active} 
              max={stats.beneficiaries.total} 
              label="Actifs"
              color="#3498db"
            />
            <CircleProgress 
              value={stats.attendance.today} 
              max={200} 
              label="Présences"
              color="#27ae60"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat">
          <span className="qs-icon">📅</span>
          <div className="qs-info">
            <span className="qs-value">23</span>
            <span className="qs-label">Événements ce mois</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="qs-icon">📋</span>
          <div className="qs-info">
            <span className="qs-value">8</span>
            <span className="qs-label">Demandes en attente</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="qs-icon">🎫</span>
          <div className="qs-info">
            <span className="qs-value">5</span>
            <span className="qs-label">Tickets ouverts</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="qs-icon">👨‍💼</span>
          <div className="qs-info">
            <span className="qs-value">12</span>
            <span className="qs-label">Staff actif</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
