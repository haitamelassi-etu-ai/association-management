import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import './Login.css'

function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.login(formData.username, formData.password)
      
      if (result.success) {
        localStorage.setItem('user', JSON.stringify(result.user))
        navigate('/dashboard')
      } else {
        setError(result.message || 'خطأ في تسجيل الدخول')
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🏢 لوحة الموظفين</h1>
          <p>نظام إدارة محلي مستقل</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>{t('username')}</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>{t('password')}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'جاري التسجيل...' : t('login')}
          </button>

          <div className="login-info">
            <small>
              الحساب الافتراضي: <strong>admin</strong> / <strong>admin123</strong>
            </small>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
