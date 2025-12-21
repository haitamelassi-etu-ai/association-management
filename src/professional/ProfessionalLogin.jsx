import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './ProfessionalLogin.css'
import { SITE_INFO } from '../config/siteInfo'

function ProfessionalLogin() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Real API call
      console.log('🔵 Tentative de connexion avec:', credentials)
      const response = await authAPI.login(credentials)
      console.log('🟢 Réponse API:', response.data)

      const userData = response.data.data
      // Save user data with token
      localStorage.setItem('professionalUser', JSON.stringify(userData))
      localStorage.setItem('professionalToken', userData.token)
      localStorage.setItem('userRole', userData?.role === 'admin' ? 'admin' : 'professional')
      
      navigate('/professional/dashboard')
    } catch (err) {
      console.error('❌ Erreur de connexion:', err)
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect')
      setIsLoading(false)
    }
  }

  return (
    <div className="professional-login-page">
      <div className="login-container-pro">
        <div className="login-header-pro">
          <div className="logo-section">
            <img src="/images/logo.png" alt={`Logo ${SITE_INFO.name}`} className="login-logo" />
            <h1>Portail Professionnel</h1>
          </div>
          <p>{SITE_INFO.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-pro">
          {error && <div className="error-message-pro">{error}</div>}

          <div className="form-group-pro">
            <label>Email professionnel</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              placeholder="votre@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group-pro">
            <label>Mot de passe</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn-login-pro" disabled={isLoading}>
            {isLoading ? '⏳ Connexion...' : '🔓 Se connecter'}
          </button>

          <div className="login-hint-pro">
            <small>💡 Utilisez votre compte professionnel</small>
          </div>
        </form>

        <div className="login-footer-pro">
          <a href="/">← Retour au site public</a>
        </div>
      </div>
    </div>
  )
}

export default ProfessionalLogin
