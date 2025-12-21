import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { beneficiariesAPI, attendanceAPI, announcementsAPI } from '../services/api'
import { ProfessionalSidebar } from './SharedSidebar'
import './ProfessionalDashboard.css'
import './Reports.css'

function Reports() {
  const [user, setUser] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState({
    beneficiaires: {
      total: 0,
      heberge: 0,
      enSuivi: 0,
      sorti: 0,
      transfere: 0,
      nouveauxCeMois: 0,
      sortiesCeMois: 0
    },
    attendance: {
      totalJours: 20,
      presents: 0,
      retards: 0,
      absences: 0,
      conges: 0,
      tauxPresence: 0
    },
    activities: {
      totalAnnonces: 0,
      annoncesUrgentes: 0,
      suivisRealises: 0,
      ateliersOrganises: 0,
      suiviSociaux: 0,
      entretiens: 0,
      ateliers: 0,
      visites: 0
    },
    success: {
      reinsertionPro: 0,
      reinsertionFamiliale: 0,
      logementTrouve: 0,
      formationComplete: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/professional-login')
      return
    }
    setUser(JSON.parse(userData))
    
    // Fetch real statistics
    fetchStats()
  }, [navigate])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch beneficiaries stats
      const beneficiariesResponse = await beneficiariesAPI.getStats()
      const beneficiairesData = beneficiariesResponse.data.data || {}
      
      // Fetch attendance stats
      const attendanceResponse = await attendanceAPI.getMy()
      const attendanceData = attendanceResponse.data.data || []
      
      // Fetch announcements stats
      const announcementsResponse = await announcementsAPI.getAll()
      const announcementsData = announcementsResponse.data.data || []
      
      // Calculate attendance statistics
      const totalPresents = attendanceData.filter(a => a.statut === 'present').length
      const totalRetards = attendanceData.filter(a => a.statut === 'retard').length
      const totalAbsences = attendanceData.filter(a => a.statut === 'absent').length
      const totalConges = attendanceData.filter(a => a.statut === 'conge').length
      const tauxPresence = attendanceData.length > 0 
        ? Math.round((totalPresents / attendanceData.length) * 100) 
        : 0
      
      // Calculate announcements statistics
      const totalAnnonces = announcementsData.length
      const annoncesUrgentes = announcementsData.filter(a => a.type === 'urgent').length
      
      setStats({
        beneficiaires: beneficiairesData,
        attendance: {
          totalJours: attendanceData.length,
          presents: totalPresents,
          retards: totalRetards,
          absences: totalAbsences,
          conges: totalConges,
          tauxPresence: tauxPresence
        },
        activities: {
          totalAnnonces: totalAnnonces,
          annoncesUrgentes: annoncesUrgentes,
          suivisRealises: 0,
          ateliersOrganises: 0,
          suiviSociaux: 0,
          entretiens: 0,
          ateliers: 0,
          visites: 0
        },
        success: {
          reinsertionPro: beneficiairesData?.sorti || 0,
          reinsertionFamiliale: 0,
          logementTrouve: 0,
          formationComplete: 0
        }
      })
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('token')
    navigate('/professional-login')
  }

  if (!user) {
    return <div style={{padding: '20px'}}>Chargement...</div>
  }

  const monthlyEvolution = [
    { month: 'Jan', entrees: 12, sorties: 8 },
    { month: 'Fév', entrees: 10, sorties: 9 },
    { month: 'Mar', entrees: 15, sorties: 11 },
    { month: 'Avr', entrees: 13, sorties: 10 },
    { month: 'Mai', entrees: 14, sorties: 12 },
    { month: 'Juin', entrees: 11, sorties: 9 },
    { month: 'Juil', entrees: 9, sorties: 7 },
    { month: 'Août', entrees: 8, sorties: 6 },
    { month: 'Sep', entrees: 14, sorties: 10 },
    { month: 'Oct', entrees: 16, sorties: 13 },
    { month: 'Nov', entrees: 8, sorties: 5 }
  ]

  const handleExportPDF = async () => {
    try {
      setIsLoading(true)
      
      // Get token
      const professionalUser = localStorage.getItem('professionalUser')
      if (!professionalUser) return
      
      const userData = JSON.parse(professionalUser)
      const token = userData.token
      
      // Fetch analytics data
      const analyticsResponse = await apiClient.get('/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Fetch beneficiaries
      const beneficiariesResponse = await beneficiariesAPI.getAll()
      
      // Fetch announcements
      const announcementsResponse = await announcementsAPI.getAll()
      
      // TODO: Generate PDF (not yet implemented in local app)
      alert('⚠️ Génération PDF pas encore disponible en mode local')
      
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      alert('❌ Erreur lors de la génération du rapport PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = () => {
    alert('Export Excel en cours de développement...')
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
            <h1>📈 Rapports & Statistiques</h1>
            <p>Analyse et suivi des activités de l'association</p>
          </div>
          <div className="export-buttons">
            <button className="btn-export" onClick={handleExportPDF} disabled={isLoading}>
              {isLoading ? '⏳ Génération...' : '📄 Rapport Mensuel PDF'}
            </button>
            <button className="btn-export primary" onClick={handleExportExcel}>
              📊 Export Excel
            </button>
          </div>
        </header>

        {/* Period Selector */}
        <div className="period-selector">
          <button 
            className={selectedPeriod === 'week' ? 'period-btn active' : 'period-btn'}
            onClick={() => setSelectedPeriod('week')}
          >
            Cette semaine
          </button>
          <button 
            className={selectedPeriod === 'month' ? 'period-btn active' : 'period-btn'}
            onClick={() => setSelectedPeriod('month')}
          >
            Ce mois
          </button>
          <button 
            className={selectedPeriod === 'year' ? 'period-btn active' : 'period-btn'}
            onClick={() => setSelectedPeriod('year')}
          >
            Cette année
          </button>
          <button 
            className={selectedPeriod === 'custom' ? 'period-btn active' : 'period-btn'}
            onClick={() => setSelectedPeriod('custom')}
          >
            Personnalisé
          </button>
        </div>

        {/* Main Statistics */}
        <div className="report-section">
          <h2>📊 Statistiques Générales</h2>
          <div className="stats-grid-reports">
            <div className="stat-card-report blue">
              <div className="stat-header">
                <div className="stat-icon-report">👥</div>
                <div className="stat-trend positive">↑ 5%</div>
              </div>
              <div className="stat-label">Total Bénéficiaires</div>
              <div className="stat-value-report">{stats.beneficiaires.total}</div>
              <div className="stat-detail">
                +{stats.beneficiaires.nouveauxCeMois} ce mois
              </div>
            </div>

            <div className="stat-card-report green">
              <div className="stat-header">
                <div className="stat-icon-report">🏠</div>
                <div className="stat-trend positive">↑ 12%</div>
              </div>
              <div className="stat-label">Hébergés Actuellement</div>
              <div className="stat-value-report">{stats.beneficiaires?.heberge || 0}</div>
              <div className="stat-detail">
                Capacité: 50 places
              </div>
            </div>

            <div className="stat-card-report orange">
              <div className="stat-header">
                <div className="stat-icon-report">✅</div>
                <div className="stat-trend positive">↑ 8%</div>
              </div>
              <div className="stat-label">Sorties Réussies</div>
              <div className="stat-value-report">{stats.beneficiaires?.sortiesCeMois || 0}</div>
              <div className="stat-detail">
                Ce mois-ci
              </div>
            </div>

            <div className="stat-card-report purple">
              <div className="stat-header">
                <div className="stat-icon-report">📈</div>
                <div className="stat-trend positive">↑ 95%</div>
              </div>
              <div className="stat-label">Taux de Présence</div>
              <div className="stat-value-report">{stats.attendance?.tauxPresence || 0}%</div>
              <div className="stat-meta">
                {stats.attendance?.presents || 0}/{stats.attendance?.totalJours || 0} jours
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiaries Breakdown */}
        <div className="report-section">
          <h2>👥 Répartition des Bénéficiaires</h2>
          <div className="breakdown-grid">
            <div className="breakdown-card">
              <div className="breakdown-chart">
                <div className="pie-chart">
                  <div className="pie-slice heberge" style={{ '--percentage': '27%' }}></div>
                  <div className="pie-center">
                    <span className="pie-total">{stats.beneficiaires?.total || 0}</span>
                    <span className="pie-label">Total</span>
                  </div>
                </div>
              </div>
              <div className="breakdown-legend">
                <div className="legend-item">
                  <span className="legend-color heberge"></span>
                  <span className="legend-label">Hébergés</span>
                  <span className="legend-value">{stats.beneficiaires?.heberge || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color sorti"></span>
                  <span className="legend-label">Sorti</span>
                  <span className="legend-value">{stats.beneficiaires?.sorti || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color en_suivi"></span>
                  <span className="legend-label">En Suivi</span>
                  <span className="legend-value">{stats.beneficiaires?.enSuivi || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color transfere"></span>
                  <span className="legend-label">Transféré</span>
                  <span className="legend-value">{stats.beneficiaires?.transfere || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Evolution */}
        <div className="report-section">
          <h2>📊 Évolution Mensuelle 2024</h2>
          <div className="chart-container">
            <div className="bar-chart">
              {monthlyEvolution.map((data, index) => (
                <div key={index} className="bar-group">
                  <div className="bars">
                    <div 
                      className="bar entrees" 
                      style={{ height: `${(data.entrees / 20) * 100}%` }}
                      title={`Entrées: ${data.entrees}`}
                    >
                      <span className="bar-value">{data.entrees}</span>
                    </div>
                    <div 
                      className="bar sorties" 
                      style={{ height: `${(data.sorties / 20) * 100}%` }}
                      title={`Sorties: ${data.sorties}`}
                    >
                      <span className="bar-value">{data.sorties}</span>
                    </div>
                  </div>
                  <div className="bar-label">{data.month}</div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="chart-legend-item">
                <span className="chart-legend-color entrees"></span>
                <span>Entrées</span>
              </div>
              <div className="chart-legend-item">
                <span className="chart-legend-color sorties"></span>
                <span>Sorties</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activities Summary */}
        <div className="report-section">
          <h2>📋 Résumé des Activités</h2>
          <div className="activities-grid">
            <div className="activity-card">
              <div className="activity-icon blue">📝</div>
              <div className="activity-content">
                <div className="activity-value">{stats.activities.suiviSociaux}</div>
                <div className="activity-label">Suivis Sociaux</div>
              </div>
            </div>
            <div className="activity-card">
              <div className="activity-icon green">💬</div>
              <div className="activity-content">
                <div className="activity-value">{stats.activities.entretiens}</div>
                <div className="activity-label">Entretiens</div>
              </div>
            </div>
            <div className="activity-card">
              <div className="activity-icon orange">🎓</div>
              <div className="activity-content">
                <div className="activity-value">{stats.activities.ateliers}</div>
                <div className="activity-label">Ateliers</div>
              </div>
            </div>
            <div className="activity-card">
              <div className="activity-icon purple">🏥</div>
              <div className="activity-content">
                <div className="activity-value">{stats.activities.visites}</div>
                <div className="activity-label">Visites</div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Indicators */}
        <div className="report-section">
          <h2>🎯 Indicateurs de Réussite</h2>
          <div className="success-indicators">
            <div className="indicator-item">
              <div className="indicator-header">
                <span className="indicator-label">Réinsertion Professionnelle</span>
                <span className="indicator-value">{stats.success?.reinsertionPro || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '65%' }}></div>
              </div>
              <div className="indicator-footer">
                <span>65% du total des sorties</span>
              </div>
            </div>

            <div className="indicator-item">
              <div className="indicator-header">
                <span className="indicator-label">Réinsertion Familiale</span>
                <span className="indicator-value">{stats.success?.reinsertionFamiliale || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '42%' }}></div>
              </div>
              <div className="indicator-footer">
                <span>42% du total des sorties</span>
              </div>
            </div>

            <div className="indicator-item">
              <div className="indicator-header">
                <span className="indicator-label">Logement Trouvé</span>
                <span className="indicator-value">{stats.success?.logementTrouve || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '51%' }}></div>
              </div>
              <div className="indicator-footer">
                <span>51% du total des sorties</span>
              </div>
            </div>

            <div className="indicator-item">
              <div className="indicator-header">
                <span className="indicator-label">Formation Complétée</span>
                <span className="indicator-value">{stats.success?.formationComplete || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '34%' }}></div>
              </div>
              <div className="indicator-footer">
                <span>34% du total des sorties</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Table */}
        <div className="report-section">
          <h2>📑 Tableau Récapitulatif</h2>
          <div className="content-card">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Nombre</th>
                  <th>Pourcentage</th>
                  <th>Évolution</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nouveaux bénéficiaires</td>
                  <td>{stats.beneficiaires.nouveauxCeMois}</td>
                  <td>5.1%</td>
                  <td><span className="trend-up">↑ 12%</span></td>
                </tr>
                <tr>
                  <td>Sorties réussies</td>
                  <td>{stats.beneficiaires.sortiesCeMois}</td>
                  <td>3.2%</td>
                  <td><span className="trend-up">↑ 8%</span></td>
                </tr>
                <tr>
                  <td>Taux d'occupation</td>
                  <td>{stats.beneficiaires.heberge}/50</td>
                  <td>84%</td>
                  <td><span className="trend-up">↑ 5%</span></td>
                </tr>
                <tr>
                  <td>Taux de présence staff</td>
                  <td>{stats.attendance.presents}/{stats.attendance.totalJours}</td>
                  <td>{stats.attendance.tauxPresence}%</td>
                  <td><span className="trend-stable">→ 0%</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Reports
