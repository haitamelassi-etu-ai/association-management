import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProfessionalSidebar } from './SharedSidebar'
import './ProfessionalDashboard.css'

function ProfessionalLayout({ children, noPadding = false }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/login')
      return
    }

    try {
      const parsed = JSON.parse(userData)
      setUser(parsed)
    } catch {
      navigate('/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('token')
    localStorage.removeItem('professionalToken')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="professional-dashboard">
      <ProfessionalSidebar user={user} onLogout={handleLogout} />
      <main className={noPadding ? 'dashboard-main dashboard-main--no-padding' : 'dashboard-main'}>
        {children}
      </main>
    </div>
  )
}

export default ProfessionalLayout
