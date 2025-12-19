import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import ProfessionalLogin from './pages/ProfessionalLogin'
import ProfessionalDashboard from './pages/ProfessionalDashboard'
import Attendance from './pages/Attendance'
import Beneficiaries from './pages/Beneficiaries'
import Announcements from './pages/Announcements'
import Reports from './pages/Reports'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import DocumentsManager from './pages/DocumentsManager'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/professional-login" replace />} />
          <Route path="/professional-login" element={<ProfessionalLogin />} />
          <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />
          <Route path="/professional-attendance" element={<Attendance />} />
          <Route path="/professional-beneficiaries" element={<Beneficiaries />} />
          <Route path="/professional-announcements" element={<Announcements />} />
          <Route path="/professional-reports" element={<Reports />} />
          <Route path="/professional-analytics" element={<AnalyticsDashboard />} />
          <Route path="/professional-documents" element={<DocumentsManager />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
