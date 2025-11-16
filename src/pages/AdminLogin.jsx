import { useState } from 'react'
import './AdminLogin.css'

function AdminLogin({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Username: admin, Password: admin123
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      localStorage.setItem('isAdminLoggedIn', 'true')
      onLogin()
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🔐 تسجيل الدخول - Admin</h1>
          <p>لوحة تحكم جمعية الظل الوارف</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="admin"
              required
            />
          </div>
          
          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="btn-login">
            دخول
          </button>
          
          <div className="login-hint">
            <small>💡 Username: admin | Password: admin123</small>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
