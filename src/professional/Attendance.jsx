import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceAPI } from '../services/api'
import './Attendance.css'

function Attendance() {
  const [user, setUser] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/professional-login')
      return
    }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Fetch real attendance records from API
    fetchAttendanceRecords()

    return () => clearInterval(timer)
  }, [navigate])

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true)
      const response = await attendanceAPI.getMy()
      setAttendanceRecords(response.data.data)
      
      // Check today's record
      const today = new Date().toISOString().split('T')[0]
      const todayRec = response.data.data.find(r => r.date.startsWith(today))
      setTodayRecord(todayRec)
    } catch (error) {
      console.error('Erreur lors du chargement des pointages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (!user) {
    return <div style={{padding: '20px'}}>Chargement...</div>
  }

  const handleCheckIn = async () => {
    try {
      await attendanceAPI.checkIn({})
      fetchAttendanceRecords() // Refresh records
    } catch (error) {
      console.error('Erreur lors du pointage d\'entrée:', error)
      alert('Erreur lors du pointage d\'entrée')
    }
  }

  const handleCheckOut = async () => {
    if (todayRecord && todayRecord._id) {
      try {
        await attendanceAPI.checkOut(todayRecord._id)
        fetchAttendanceRecords() // Refresh records
      } catch (error) {
        console.error('Erreur lors du pointage de sortie:', error)
        alert('Erreur lors du pointage de sortie')
      }
    }
  }

  const getStatutBadge = (statut) => {
    const badges = {
      present: { label: 'Présent', class: 'badge-present' },
      retard: { label: 'Retard', class: 'badge-retard' },
      absent: { label: 'Absent', class: 'badge-absent' },
      conge: { label: 'Congé', class: 'badge-conge' }
    }
    return badges[statut] || { label: statut, class: '' }
  }

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-'
    
    const [inH, inM] = checkIn.split(':').map(Number)
    const [outH, outM] = checkOut.split(':').map(Number)
    
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    return `${hours}h ${minutes}m`
  }

  const getMonthStats = () => {
    const records = attendanceRecords.filter(r => {
      const date = new Date(r.date)
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    })

    return {
      present: records.filter(r => r.statut === 'present').length,
      retard: records.filter(r => r.statut === 'retard').length,
      absent: records.filter(r => r.statut === 'absent').length,
      conge: records.filter(r => r.statut === 'conge').length
    }
  }

  const stats = getMonthStats()

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
          <a href="/professional/beneficiaries" className="nav-item">
            <span className="nav-icon">👥</span>
            <span>Bénéficiaires</span>
          </a>
          <a href="/professional/attendance" className="nav-item active">
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
            <h1>⏰ Gestion du Pointage</h1>
            <p>Enregistrement et suivi de présence</p>
          </div>
          <div className="current-time-display">
            <div className="time-label">Heure actuelle</div>
            <div className="time-value">
              {currentTime.toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </div>
            <div className="date-value">
              {currentTime.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </header>

        {/* Check In/Out Section */}
        <div className="attendance-action-card">
          <div className="action-card-content">
            <div className="action-info">
              <div className="action-icon">🕒</div>
              <div>
                <h2>Pointage du jour</h2>
                {todayRecord ? (
                  <div className="today-status">
                    {todayRecord.checkIn && (
                      <div className="status-item">
                        <span className="status-label">Arrivée:</span>
                        <span className="status-value">{todayRecord.checkIn}</span>
                      </div>
                    )}
                    {todayRecord.checkOut && (
                      <div className="status-item">
                        <span className="status-label">Départ:</span>
                        <span className="status-value">{todayRecord.checkOut}</span>
                      </div>
                    )}
                    {todayRecord.checkIn && todayRecord.checkOut && (
                      <div className="status-item">
                        <span className="status-label">Durée:</span>
                        <span className="status-value">
                          {calculateDuration(todayRecord.checkIn, todayRecord.checkOut)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-record">Aucun pointage enregistré aujourd'hui</p>
                )}
              </div>
            </div>

            <div className="action-buttons-group">
              {!todayRecord ? (
                <button className="btn-check-in" onClick={handleCheckIn}>
                  ✅ Pointer l'arrivée
                </button>
              ) : !todayRecord.checkOut ? (
                <button className="btn-check-out" onClick={handleCheckOut}>
                  🚪 Pointer le départ
                </button>
              ) : (
                <div className="completed-message">
                  <span className="check-mark">✓</span>
                  Pointage complété
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Month Stats */}
        <div className="stats-grid-attendance">
          <div className="stat-card-attendance green">
            <div className="stat-icon-attendance">✅</div>
            <div className="stat-content-attendance">
              <div className="stat-label">Présences</div>
              <div className="stat-value">{stats.present}</div>
            </div>
          </div>

          <div className="stat-card-attendance orange">
            <div className="stat-icon-attendance">⚠️</div>
            <div className="stat-content-attendance">
              <div className="stat-label">Retards</div>
              <div className="stat-value">{stats.retard}</div>
            </div>
          </div>

          <div className="stat-card-attendance red">
            <div className="stat-icon-attendance">❌</div>
            <div className="stat-content-attendance">
              <div className="stat-label">Absences</div>
              <div className="stat-value">{stats.absent}</div>
            </div>
          </div>

          <div className="stat-card-attendance blue">
            <div className="stat-icon-attendance">🏖️</div>
            <div className="stat-content-attendance">
              <div className="stat-label">Congés</div>
              <div className="stat-value">{stats.conge}</div>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="content-card">
          <div className="card-header">
            <h3>📋 Historique des pointages</h3>
            <div className="month-selector">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2024, i).toLocaleDateString('fr-FR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Jour</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Durée</th>
                  <th>Statut</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map(record => (
                  <tr key={record._id}>
                    <td>{new Date(record.date).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </td>
                    <td>{record.checkIn || '-'}</td>
                    <td>{record.checkOut || '-'}</td>
                    <td>{calculateDuration(record.checkIn, record.checkOut)}</td>
                    <td>
                      <span className={`badge ${getStatutBadge(record.statut).class}`}>
                        {getStatutBadge(record.statut).label}
                      </span>
                    </td>
                    <td className="notes-cell">{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {attendanceRecords.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>Aucun enregistrement</h3>
                <p>Commencez par pointer votre arrivée</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Attendance
