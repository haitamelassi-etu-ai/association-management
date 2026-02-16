import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'

// Eagerly load public pages (small, always needed)
import HomePage from './pages/HomePage'
import UnifiedLogin from './pages/UnifiedLogin'
import NotFoundPage from './components/NotFoundPage'

// Lazy load all other pages for code splitting
const DonationPage = lazy(() => import('./pages/DonationPage'))
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const StaffManagement = lazy(() => import('./pages/StaffManagement'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const Settings = lazy(() => import('./pages/Settings'))
const BackupSystem = lazy(() => import('./pages/BackupSystem'))

// Professional portal - lazy loaded
const ProfessionalDashboard = lazy(() => import('./professional/ProfessionalDashboard'))
const Beneficiaries = lazy(() => import('./professional/Beneficiaries'))
const Attendance = lazy(() => import('./professional/Attendance'))
const Announcements = lazy(() => import('./professional/Announcements'))
const Reports = lazy(() => import('./professional/Reports'))
const AnalyticsDashboard = lazy(() => import('./professional/AnalyticsDashboard'))
const BackupManager = lazy(() => import('./components/BackupManager'))
const MealDistribution = lazy(() => import('./components/MealDistribution'))
const AdvancedReports = lazy(() => import('./components/AdvancedReports'))
const MedicationManagement = lazy(() => import('./components/MedicationManagement'))
const PharmacyStock = lazy(() => import('./components/PharmacyStock'))
const ExitTracking = lazy(() => import('./components/ExitTracking'))
const FoodStockManagement = lazy(() => import('./components/FoodStockManagement'))
const ScheduleCalendar = lazy(() => import('./components/ScheduleCalendar'))
const TicketSystem = lazy(() => import('./components/TicketSystem'))
const DocumentManager = lazy(() => import('./components/DocumentManager'))
const ApprovalWorkflow = lazy(() => import('./components/ApprovalWorkflow'))
const AuditLogViewer = lazy(() => import('./components/AuditLogViewer'))
const TwoFactorSetup = lazy(() => import('./components/TwoFactorSetup'))
const UserSettings = lazy(() => import('./components/UserSettings'))
const VisitorManagement = lazy(() => import('./components/VisitorManagement'))
const VolunteerPortal = lazy(() => import('./components/VolunteerPortal'))
const FinancialTracker = lazy(() => import('./components/FinancialTracker'))
const RoomManagement = lazy(() => import('./components/RoomManagement'))
const HealthRecords = lazy(() => import('./components/HealthRecords'))
const CommunicationHub = lazy(() => import('./components/CommunicationHub'))
const Integrations = lazy(() => import('./components/Integrations'))
const NotificationsCenter = lazy(() => import('./components/NotificationsCenter'))
const ExportReports = lazy(() => import('./components/ExportReports'))
const AdvancedSearch = lazy(() => import('./components/AdvancedSearch'))

// Auth guard for professional routes
const RequireAuth = ({ children }) => {
  const user = localStorage.getItem('professionalUser')
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRouter() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = localStorage.getItem('isAdminLoggedIn')
      setIsAdminLoggedIn(loggedIn === 'true')
    }
    
    checkAuth()
    window.addEventListener('storage', checkAuth)
    
    // Custom event for same-tab auth changes
    window.addEventListener('auth-change', checkAuth)
    
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth-change', checkAuth)
    }
  }, [])

  const handleLogout = () => {
    setIsAdminLoggedIn(false)
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('userRole')
  }

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/don" element={<DonationPage />} />
          <Route path="/urgence" element={<EmergencyPage />} />
          <Route path="/login" element={<UnifiedLogin />} />
          <Route path="/professional-login" element={<UnifiedLogin />} />

          {/* Admin routes */}
          <Route path="/admin" element={isAdminLoggedIn ? <AdminPanel onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={isAdminLoggedIn ? <UserManagement /> : <Navigate to="/login" />} />
          <Route path="/admin/staff" element={isAdminLoggedIn ? <StaffManagement /> : <Navigate to="/login" />} />
          <Route path="/admin/activity" element={isAdminLoggedIn ? <ActivityLog /> : <Navigate to="/login" />} />
          <Route path="/admin/settings" element={isAdminLoggedIn ? <Settings /> : <Navigate to="/login" />} />
          <Route path="/admin/backup" element={isAdminLoggedIn ? <BackupSystem /> : <Navigate to="/login" />} />

          {/* Professional routes - auth guarded */}
          <Route path="/professional/dashboard" element={<RequireAuth><ProfessionalDashboard /></RequireAuth>} />
          <Route path="/professional/analytics" element={<RequireAuth><AnalyticsDashboard /></RequireAuth>} />
          <Route path="/professional/beneficiaries" element={<RequireAuth><Beneficiaries /></RequireAuth>} />
          <Route path="/professional/attendance" element={<RequireAuth><Attendance /></RequireAuth>} />
          <Route path="/professional/announcements" element={<RequireAuth><Announcements /></RequireAuth>} />
          <Route path="/professional/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/professional/backup" element={<RequireAuth><BackupManager /></RequireAuth>} />
          <Route path="/professional/meals" element={<RequireAuth><MealDistribution /></RequireAuth>} />
          <Route path="/professional/pharmacy" element={<RequireAuth><PharmacyStock /></RequireAuth>} />
          <Route path="/professional/medications" element={<RequireAuth><MedicationManagement /></RequireAuth>} />
          <Route path="/professional/exit-tracking" element={<RequireAuth><ExitTracking /></RequireAuth>} />
          <Route path="/professional/food-stock" element={<RequireAuth><FoodStockManagement /></RequireAuth>} />
          <Route path="/professional/advanced-reports" element={<RequireAuth><AdvancedReports /></RequireAuth>} />
          <Route path="/professional/schedule" element={<RequireAuth><ScheduleCalendar /></RequireAuth>} />
          <Route path="/professional/tickets" element={<RequireAuth><TicketSystem /></RequireAuth>} />
          <Route path="/professional/documents" element={<RequireAuth><DocumentManager /></RequireAuth>} />
          <Route path="/professional/approvals" element={<RequireAuth><ApprovalWorkflow /></RequireAuth>} />
          <Route path="/professional/audit-log" element={<RequireAuth><AuditLogViewer /></RequireAuth>} />
          <Route path="/professional/two-factor" element={<RequireAuth><TwoFactorSetup /></RequireAuth>} />
          <Route path="/professional/settings" element={<RequireAuth><UserSettings /></RequireAuth>} />
          <Route path="/professional/visitors" element={<RequireAuth><VisitorManagement /></RequireAuth>} />
          <Route path="/professional/volunteers" element={<RequireAuth><VolunteerPortal /></RequireAuth>} />
          <Route path="/professional/financial" element={<RequireAuth><FinancialTracker /></RequireAuth>} />
          <Route path="/professional/rooms" element={<RequireAuth><RoomManagement /></RequireAuth>} />
          <Route path="/professional/health-records" element={<RequireAuth><HealthRecords /></RequireAuth>} />
          <Route path="/professional/communications" element={<RequireAuth><CommunicationHub /></RequireAuth>} />
          <Route path="/professional/integrations" element={<RequireAuth><Integrations /></RequireAuth>} />
          <Route path="/professional/notifications" element={<RequireAuth><NotificationsCenter /></RequireAuth>} />
          <Route path="/professional/export-reports" element={<RequireAuth><ExportReports /></RequireAuth>} />
          <Route path="/professional/search" element={<RequireAuth><AdvancedSearch /></RequireAuth>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default AppRouter
