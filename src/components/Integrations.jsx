import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './Integrations.css'

function Integrations() {
  const { t } = useTranslation()
  const [integrations, setIntegrations] = useState({
    googleCalendar: { enabled: false, connected: false },
    whatsapp: { enabled: false, phoneNumber: '' },
    emailjs: { enabled: false, serviceId: '', templateId: '', publicKey: '' }
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('professionalToken')
        const response = await fetch(`${API_URL}/api/settings/integrations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          setIntegrations(prev => ({
            ...prev,
            ...data.data,
            googleCalendar: { ...prev.googleCalendar, ...(data.data?.googleCalendar || {}) },
            whatsapp: { ...prev.whatsapp, ...(data.data?.whatsapp || {}) },
            emailjs: { ...prev.emailjs, ...(data.data?.emailjs || {}) }
          }))
        }
      } catch (error) {
        console.error('Failed to load integrations:', error)
      }
    }

    loadSettings()
  }, [])

  // Google Calendar Integration
  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setMessage({ type: 'error', text: 'Configuration Google Calendar manquante' })
      return
    }
    
    const redirectUri = `${window.location.origin}/integrations/google/callback`
    const scope = 'https://www.googleapis.com/auth/calendar.events'
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`
    
    window.open(authUrl, '_blank', 'width=500,height=600')
  }

  const addToGoogleCalendar = async (event) => {
    try {
      const token = localStorage.getItem('googleAccessToken')
      if (!token) {
        setMessage({ type: 'error', text: 'Veuillez connecter Google Calendar' })
        return
      }

      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: new Date(event.startDate).toISOString(),
          timeZone: 'Africa/Casablanca'
        },
        end: {
          dateTime: new Date(event.endDate).toISOString(),
          timeZone: 'Africa/Casablanca'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 }
          ]
        }
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        }
      )

      if (response.ok) {
        setMessage({ type: 'success', text: 'Événement ajouté à Google Calendar' })
      } else {
        throw new Error('Failed to add event')
      }
    } catch (error) {
      console.error('Google Calendar error:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout' })
    }
  }

  // WhatsApp Integration
  const sendWhatsAppMessage = (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  const sendWhatsAppNotification = (beneficiary, template) => {
    if (!beneficiary.phone) {
      setMessage({ type: 'error', text: 'Pas de numéro de téléphone' })
      return
    }

    const templates = {
      appointment: `Bonjour ${beneficiary.name}, nous vous rappelons votre rendez-vous prévu. Association Adel Elouerif`,
      announcement: `Bonjour ${beneficiary.name}, une nouvelle annonce a été publiée. Consultez notre application.`,
      emergency: `⚠️ URGENT: ${beneficiary.name}, veuillez contacter l'association Adel Elouerif dès que possible.`
    }

    const message = templates[template] || template
    sendWhatsAppMessage(beneficiary.phone, message)
  }

  // EmailJS Integration
  const initEmailJS = async () => {
    if (integrations.emailjs.enabled && integrations.emailjs.publicKey) {
      try {
        const emailjs = await import('@emailjs/browser')
        emailjs.init(integrations.emailjs.publicKey)
        return emailjs
      } catch (error) {
        console.error('EmailJS init error:', error)
      }
    }
    return null
  }

  const sendEmail = async (to, subject, message, templateParams = {}) => {
    if (!integrations.emailjs.enabled) {
      setMessage({ type: 'error', text: 'EmailJS non configuré' })
      return false
    }

    try {
      const emailjs = await initEmailJS()
      if (!emailjs) return false

      const params = {
        to_email: to,
        subject: subject,
        message: message,
        from_name: 'Association Adel Elouerif',
        ...templateParams
      }

      await emailjs.send(
        integrations.emailjs.serviceId,
        integrations.emailjs.templateId,
        params
      )

      setMessage({ type: 'success', text: 'Email envoyé avec succès' })
      return true
    } catch (error) {
      console.error('Email send error:', error)
      setMessage({ type: 'error', text: 'Erreur d\'envoi de l\'email' })
      return false
    }
  }

  const saveIntegrationSettings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('professionalToken')
      await fetch(`${API_URL}/api/settings/integrations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(integrations)
      })
      setMessage({ type: 'success', text: 'Paramètres sauvegardés' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de sauvegarde' })
    }
    setLoading(false)
  }

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <h2>🔌 Intégrations</h2>
        <p>Connectez des services externes pour améliorer votre productivité</p>
      </div>

      {message.text && (
        <div className={`integration-message ${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="integrations-grid">
        {/* Google Calendar */}
        <div className="integration-card">
          <div className="card-header">
            <div className="integration-logo google">
              <span>📅</span>
            </div>
            <div className="integration-info">
              <h3>Google Calendar</h3>
              <p>Synchronisez les rendez-vous et événements</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox"
                checked={integrations.googleCalendar.enabled}
                onChange={e => setIntegrations(prev => ({
                  ...prev,
                  googleCalendar: { ...prev.googleCalendar, enabled: e.target.checked }
                }))}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {integrations.googleCalendar.enabled && (
            <div className="card-body">
              {integrations.googleCalendar.connected ? (
                <div className="connected-status">
                  <span className="status-badge connected">✅ Connecté</span>
                  <button className="disconnect-btn">Déconnecter</button>
                </div>
              ) : (
                <button className="connect-btn google" onClick={handleGoogleConnect}>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
                  Se connecter avec Google
                </button>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div className="integration-card">
          <div className="card-header">
            <div className="integration-logo whatsapp">
              <span>💬</span>
            </div>
            <div className="integration-info">
              <h3>WhatsApp</h3>
              <p>Envoyez des notifications aux bénéficiaires</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox"
                checked={integrations.whatsapp.enabled}
                onChange={e => setIntegrations(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, enabled: e.target.checked }
                }))}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {integrations.whatsapp.enabled && (
            <div className="card-body">
              <div className="form-group">
                <label>Numéro WhatsApp Business</label>
                <input 
                  type="tel"
                  placeholder="+212 6XX XXX XXX"
                  value={integrations.whatsapp.phoneNumber}
                  onChange={e => setIntegrations(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, phoneNumber: e.target.value }
                  }))}
                />
              </div>
              <div className="templates-section">
                <h4>Templates de messages</h4>
                <div className="template-tags">
                  <span className="template-tag">📅 Rappel RDV</span>
                  <span className="template-tag">📢 Annonce</span>
                  <span className="template-tag">🚨 Urgence</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EmailJS */}
        <div className="integration-card">
          <div className="card-header">
            <div className="integration-logo email">
              <span>📧</span>
            </div>
            <div className="integration-info">
              <h3>EmailJS</h3>
              <p>Envoyez des emails directement depuis l'application</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox"
                checked={integrations.emailjs.enabled}
                onChange={e => setIntegrations(prev => ({
                  ...prev,
                  emailjs: { ...prev.emailjs, enabled: e.target.checked }
                }))}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {integrations.emailjs.enabled && (
            <div className="card-body">
              <div className="form-group">
                <label>Service ID</label>
                <input 
                  type="text"
                  placeholder="service_xxxxxx"
                  value={integrations.emailjs.serviceId}
                  onChange={e => setIntegrations(prev => ({
                    ...prev,
                    emailjs: { ...prev.emailjs, serviceId: e.target.value }
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Template ID</label>
                <input 
                  type="text"
                  placeholder="template_xxxxxx"
                  value={integrations.emailjs.templateId}
                  onChange={e => setIntegrations(prev => ({
                    ...prev,
                    emailjs: { ...prev.emailjs, templateId: e.target.value }
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Public Key</label>
                <input 
                  type="text"
                  placeholder="xxxxxxxxxxxxxx"
                  value={integrations.emailjs.publicKey}
                  onChange={e => setIntegrations(prev => ({
                    ...prev,
                    emailjs: { ...prev.emailjs, publicKey: e.target.value }
                  }))}
                />
              </div>
              <a 
                href="https://www.emailjs.com/docs/sdk/installation/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="help-link"
              >
                📚 Comment configurer EmailJS?
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="integrations-footer">
        <button 
          className="save-btn"
          onClick={saveIntegrationSettings}
          disabled={loading}
        >
          {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder les paramètres'}
        </button>
      </div>
    </div>
  )
}

// Export helper functions for use in other components
export const useIntegrations = () => {
  const sendWhatsApp = (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
  }

  const openGoogleCalendar = (event) => {
    const startDate = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const endDate = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}`
    window.open(url, '_blank')
  }

  return { sendWhatsApp, openGoogleCalendar }
}

export default Integrations
