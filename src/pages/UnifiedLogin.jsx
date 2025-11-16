import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './UnifiedLogin.css'

function UnifiedLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('Login attempt:', { email, password })

    // Check if Admin
    if (email === 'admin@adelelouerif.org' && password === 'admin123') {
      console.log('Admin login detected!')
      localStorage.setItem('isAdminLoggedIn', 'true')
      localStorage.setItem('userRole', 'admin')
      
      // Log activity
      const activityLog = JSON.parse(localStorage.getItem('activityLog') || '[]')
      activityLog.unshift({
        id: Date.now().toString(),
        type: 'login',
        user: 'Admin',
        description: 'Connexion au panneau d\'administration',
        timestamp: new Date().toISOString()
      })
      localStorage.setItem('activityLog', JSON.stringify(activityLog))
      
      console.log('Navigating to /admin...')
      setLoading(false)
      navigate('/admin')
      return
    }

    // Check Professional/Staff from MongoDB
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })

      if (response.data.success) {
        const user = response.data.data
        localStorage.setItem('professionalUser', JSON.stringify(user))
        localStorage.setItem('professionalToken', user.token)
        localStorage.setItem('userRole', 'professional')
        
        // Log activity
        const activityLog = JSON.parse(localStorage.getItem('activityLog') || '[]')
        activityLog.unshift({
          id: Date.now().toString(),
          type: 'login',
          user: `${user.nom} ${user.prenom}`,
          description: 'Connexion au portail professionnel',
          timestamp: new Date().toISOString()
        })
        localStorage.setItem('activityLog', JSON.stringify(activityLog))
        
        setLoading(false)
        navigate('/professional/dashboard')
      }
    } catch (err) {
      setLoading(false)
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect')
      } else {
        setError('Erreur de connexion. Vérifiez votre connexion.')
      }
    }
  }

  return (
    <div className="unified-login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-circle">🏛️</div>
          <h1>Association Adel Elouerif</h1>
          <p>Espace de connexion</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>📧 Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@exemple.com"
              required
            />
          </div>

          <div className="form-group">
            <label>🔒 Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Connexion en cours...
              </>
            ) : (
              <>
                🚀 Se connecter
              </>
            )}
          </button>
        </form>

        <div className="login-info">
          <div className="info-box">
            <h3>👑 Administrateur</h3>
            <p>Accès complet au panneau d'administration</p>
          </div>
          <div className="info-box">
            <h3>👨‍💼 Personnel</h3>
            <p>Accès au portail professionnel</p>
          </div>
        </div>

        <div className="back-home">
          <button onClick={() => navigate('/')} className="btn-home">
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnifiedLogin
