import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import DonationPage from './pages/DonationPage'
import EmergencyPage from './pages/EmergencyPage'
import UnifiedLogin from './pages/UnifiedLogin'
import AdminPanel from './pages/AdminPanel'
import UserManagement from './pages/UserManagement'
import StaffManagement from './pages/StaffManagement'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'
import BackupSystem from './pages/BackupSystem'
import ProfessionalDashboard from './professional/ProfessionalDashboard'
import Beneficiaries from './professional/Beneficiaries'
import Attendance from './professional/Attendance'
import Announcements from './professional/Announcements'
import Reports from './professional/Reports'
import AnalyticsDashboard from './professional/AnalyticsDashboard'
import BackupManager from './components/BackupManager'
import MealDistribution from './components/MealDistribution'
import AdvancedReports from './components/AdvancedReports'
import MedicationManagement from './components/MedicationManagement'
import PharmacyStock from './components/PharmacyStock'
import ExitTracking from './components/ExitTracking'
import FoodStockManagement from './components/FoodStockManagement'

function AppRouter() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)

  useEffect(() => {
    // Check on mount and when storage changes
    const checkAuth = () => {
      const loggedIn = localStorage.getItem('isAdminLoggedIn')
      setIsAdminLoggedIn(loggedIn === 'true')
    }
    
    checkAuth()
    
    // Listen for storage changes
    window.addEventListener('storage', checkAuth)
    
    // Also check periodically (for same-tab changes)
    const interval = setInterval(checkAuth, 500)
    
    return () => {
      window.removeEventListener('storage', checkAuth)
      clearInterval(interval)
    }
  }, [])

  const handleLogin = () => {
    setIsAdminLoggedIn(true)
  }

  const handleLogout = () => {
    setIsAdminLoggedIn(false)
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('userRole')
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/don" element={<DonationPage />} />
        <Route path="/urgence" element={<EmergencyPage />} />
        <Route 
          path="/login" 
          element={<UnifiedLogin />} 
        />
        <Route 
          path="/admin" 
          element={
            isAdminLoggedIn ? <AdminPanel onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            isAdminLoggedIn ? <UserManagement /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/staff" 
          element={
            isAdminLoggedIn ? <StaffManagement /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/activity" 
          element={
            isAdminLoggedIn ? <ActivityLog /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            isAdminLoggedIn ? <Settings /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/backup" 
          element={
            isAdminLoggedIn ? <BackupSystem /> : <Navigate to="/login" />
          } 
        />
        <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
        <Route path="/professional/analytics" element={<AnalyticsDashboard />} />
        <Route path="/professional/beneficiaries" element={<Beneficiaries />} />
        <Route path="/professional/attendance" element={<Attendance />} />
        <Route path="/professional/announcements" element={<Announcements />} />
        <Route path="/professional/reports" element={<Reports />} />
        <Route path="/professional/backup" element={<BackupManager />} />
        <Route path="/professional/meals" element={<MealDistribution />} />
        <Route path="/professional/pharmacy" element={<PharmacyStock />} />
        <Route path="/professional/medications" element={<MedicationManagement />} />
        <Route path="/professional/exit-tracking" element={<ExitTracking />} />
        <Route path="/professional/food-stock" element={<FoodStockManagement />} />
        <Route path="/professional/advanced-reports" element={<AdvancedReports />} />
      </Routes>
    </Router>
  )
}

export default AppRouter
