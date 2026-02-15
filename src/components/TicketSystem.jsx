import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './TicketSystem.css'

function TicketSystem() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium'
  })

  const categories = [
    { value: 'technical', label: 'Technique', icon: '🔧' },
    { value: 'beneficiary', label: 'Bénéficiaire', icon: '👥' },
    { value: 'administrative', label: 'Administratif', icon: '📋' },
    { value: 'emergency', label: 'Urgence', icon: '🚨' },
    { value: 'suggestion', label: 'Suggestion', icon: '💡' },
    { value: 'other', label: 'Autre', icon: '❓' }
  ]

  const priorities = [
    { value: 'low', label: 'Basse', color: '#27ae60' },
    { value: 'medium', label: 'Moyenne', color: '#f39c12' },
    { value: 'high', label: 'Haute', color: '#e67e22' },
    { value: 'urgent', label: 'Urgente', color: '#e74c3c' }
  ]

  const statuses = {
    open: { label: 'Ouvert', color: '#3498db', icon: '📬' },
    'in-progress': { label: 'En cours', color: '#f39c12', icon: '⏳' },
    waiting: { label: 'En attente', color: '#9b59b6', icon: '⏸️' },
    resolved: { label: 'Résolu', color: '#27ae60', icon: '✅' },
    closed: { label: 'Fermé', color: '#95a5a6', icon: '📭' }
  }

  useEffect(() => {
    fetchTickets()
  }, [activeTab])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('professionalToken')
      const status = activeTab === 'all' ? '' : activeTab
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tickets?status=${status}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await response.json()
      if (data.success) {
        setTickets(data.data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tickets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      )
      const data = await response.json()
      if (data.success) {
        setShowModal(false)
        fetchTickets()
        setFormData({
          title: '',
          description: '',
          category: 'technical',
          priority: 'medium'
        })
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tickets/${selectedTicket._id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: newMessage })
        }
      )
      const data = await response.json()
      if (data.success) {
        setSelectedTicket(data.data)
        setNewMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tickets/${ticketId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      )
      const data = await response.json()
      if (data.success) {
        fetchTickets()
        if (selectedTicket?._id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status })
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="ticket-system">
      <div className="ticket-header">
        <div className="header-info">
          <h2>🎫 Support & Tickets</h2>
          <p>Signaler un problème ou faire une demande</p>
        </div>
        <button className="new-ticket-btn" onClick={() => setShowModal(true)}>
          ➕ Nouveau ticket
        </button>
      </div>

      {/* Tabs */}
      <div className="ticket-tabs">
        {['open', 'in-progress', 'resolved', 'all'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {statuses[tab]?.icon || '📋'} {statuses[tab]?.label || 'Tous'}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="tickets-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎫</span>
            <p>Aucun ticket</p>
          </div>
        ) : (
          tickets.map(ticket => {
            const categoryInfo = categories.find(c => c.value === ticket.category)
            const priorityInfo = priorities.find(p => p.value === ticket.priority)
            const statusInfo = statuses[ticket.status]

            return (
              <div 
                key={ticket._id} 
                className="ticket-card"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="ticket-icon">{categoryInfo?.icon}</div>
                
                <div className="ticket-content">
                  <div className="ticket-top">
                    <span className="ticket-number">{ticket.ticketNumber}</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: statusInfo.color }}
                    >
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                  
                  <h4>{ticket.title}</h4>
                  <p className="ticket-description">{ticket.description}</p>
                  
                  <div className="ticket-meta">
                    <span>👤 {ticket.createdBy?.prenom} {ticket.createdBy?.nom}</span>
                    <span>📅 {formatDate(ticket.createdAt)}</span>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: priorityInfo?.color }}
                    >
                      {priorityInfo?.label}
                    </span>
                    {ticket.messages?.length > 1 && (
                      <span className="messages-count">
                        💬 {ticket.messages.length - 1} réponse(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎫 Nouveau ticket</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Catégorie</label>
                <div className="category-selector">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      className={`cat-btn ${formData.category === cat.value ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Résumé du problème..."
                />
              </div>

              <div className="form-group">
                <label>Priorité</label>
                <div className="priority-selector">
                  {priorities.map(p => (
                    <button
                      key={p.value}
                      className={`priority-btn ${formData.priority === p.value ? 'active' : ''}`}
                      style={{ '--priority-color': p.color }}
                      onClick={() => setFormData({ ...formData, priority: p.value })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre problème en détail..."
                  rows={5}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button 
                className="submit-btn"
                onClick={handleCreateTicket}
                disabled={!formData.title || !formData.description}
              >
                📤 Créer le ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="ticket-number">{selectedTicket.ticketNumber}</span>
                <h3>{selectedTicket.title}</h3>
              </div>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="ticket-detail-meta">
              <span 
                className="status-badge"
                style={{ backgroundColor: statuses[selectedTicket.status].color }}
              >
                {statuses[selectedTicket.status].icon} {statuses[selectedTicket.status].label}
              </span>
              <span className="priority-badge" style={{ 
                backgroundColor: priorities.find(p => p.value === selectedTicket.priority)?.color 
              }}>
                {priorities.find(p => p.value === selectedTicket.priority)?.label}
              </span>
              <span>{categories.find(c => c.value === selectedTicket.category)?.label}</span>
            </div>

            {/* Status Actions */}
            <div className="status-actions">
              <span>Changer le statut:</span>
              {Object.entries(statuses).map(([key, val]) => (
                <button
                  key={key}
                  className={selectedTicket.status === key ? 'active' : ''}
                  onClick={() => handleUpdateStatus(selectedTicket._id, key)}
                >
                  {val.icon}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="messages-container">
              {selectedTicket.messages?.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender?._id === selectedTicket.createdBy?._id ? 'own' : 'other'}`}
                >
                  <div className="message-header">
                    <span className="sender-name">
                      {msg.sender?.prenom} {msg.sender?.nom}
                    </span>
                    <span className="message-time">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== 'closed' && (
              <div className="reply-section">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Votre réponse..."
                  rows={3}
                />
                <button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  📤 Envoyer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketSystem
