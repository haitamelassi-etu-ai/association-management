import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './ProfessionalLogin.css'

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
      
      const { user, token } = response.data.data
      console.log('✅ User:', user, 'Token:', token)
      
      // Save user data with token
      const userData = {
        ...user,
        token
      }
      localStorage.setItem('professionalUser', JSON.stringify(userData))
      console.log('💾 Données sauvegardées:', userData)
      
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
            <img src="/images/logo.png" alt="Logo" className="login-logo" />
            <h1>Portail Professionnel</h1>
          </div>
          <p>Association Adel Elouerif</p>
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
            <small>💡 Demo: admin@adelelouerif.org / admin123</small>
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
