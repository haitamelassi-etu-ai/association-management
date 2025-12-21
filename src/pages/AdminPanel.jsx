import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './AdminPanel.css'
import { API_URL } from '../utils/api'

function AdminPanel({ onLogout }) {
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [newsError, setNewsError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newArticle, setNewArticle] = useState({
    date: '',
    title: '',
    description: '',
    image: '',
    isActive: true,
  })
  const navigate = useNavigate()

  const getAuthHeaders = () => {
    const token = localStorage.getItem('professionalToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const formatDateFr = (value) => {
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const toDateInputValue = (value) => {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const loadNews = async () => {
    setLoadingNews(true)
    setNewsError('')
    try {
      const res = await axios.get(`${API_URL}/news/all`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        timeout: 15000,
      })
      setNews(res.data?.data || [])
    } catch (err) {
      console.error('❌ Failed to load news:', err)
      setNewsError('Impossible de charger les actualités. Vérifiez la connexion.')
      setNews([])
    } finally {
      setLoadingNews(false)
    }
  }

  useEffect(() => {
    loadNews()
  }, [])

  const fileToCompressedDataUrl = (file, { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('Image invalide'))
        img.onload = () => {
          let { width, height } = img
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(dataUrl)
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    })
  }

  // حذف خبر
  const handleDelete = (id) => {
    if (!window.confirm('Supprimer cette actualité ?')) return

    ;(async () => {
      try {
        await axios.delete(`${API_URL}/news/${id}`, {
          headers: {
            ...getAuthHeaders(),
          },
          timeout: 15000,
        })
        await loadNews()
      } catch (err) {
        console.error('❌ Delete failed:', err)
        window.alert('Suppression impossible. Réessayez.')
      }
    })()
  }

  const resetForm = () => {
    setEditingId(null)
    setNewArticle({ date: '', title: '', description: '', image: '', isActive: true })
  }

  const startCreate = () => {
    resetForm()
    setShowAddForm(true)
  }

  const startEdit = (article) => {
    setEditingId(article._id)
    setNewArticle({
      date: toDateInputValue(article.date),
      title: article.title || '',
      description: article.description || '',
      image: article.image || '',
      isActive: typeof article.isActive === 'boolean' ? article.isActive : true,
    })
    setShowAddForm(true)
  }

  const handleSubmitArticle = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setNewsError('')

    try {
      const payload = {
        title: newArticle.title,
        description: newArticle.description,
        date: newArticle.date,
        image: newArticle.image,
        isActive: newArticle.isActive,
      }

      if (editingId) {
        await axios.put(`${API_URL}/news/${editingId}`, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          timeout: 20000,
        })
      } else {
        await axios.post(`${API_URL}/news`, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          timeout: 20000,
        })
      }

      await loadNews()
      setShowAddForm(false)
      resetForm()
    } catch (err) {
      console.error('❌ Save failed:', err)
      setNewsError('Enregistrement impossible. Vérifiez les champs et réessayez.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePickImage = async (file) => {
    if (!file) return
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      // Keep it safely below serverless JSON limit (10mb). Data URL is ~33% overhead.
      if (dataUrl.length > 3_000_000) {
        window.alert('Image trop grande après compression. Choisissez une image plus petite.')
        return
      }
      setNewArticle((prev) => ({ ...prev, image: dataUrl }))
    } catch (err) {
      console.error(err)
      window.alert("Impossible de traiter l'image.")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn')
    onLogout()
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>🎛️ Panneau d'administration</h1>
            <p>Gestion des actualités</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* Quick Actions Menu */}
      <div className="admin-menu-grid">
        <button onClick={() => navigate('/admin/users')} className="menu-card blue">
          <div className="menu-icon">👥</div>
          <h3>Gestion des Utilisateurs</h3>
          <p>Ajouter, modifier, supprimer des utilisateurs</p>
        </button>
        <button onClick={() => navigate('/admin/staff')} className="menu-card teal">
          <div className="menu-icon">👨‍💼</div>
          <h3>Gestion du Personnel</h3>
          <p>Équipes, horaires, statuts</p>
        </button>
        <button onClick={() => navigate('/admin/activity')} className="menu-card green">
          <div className="menu-icon">📜</div>
          <h3>Journal d'Activité</h3>
          <p>Consulter l'historique des actions</p>
        </button>
        <button onClick={() => navigate('/admin/settings')} className="menu-card purple">
          <div className="menu-icon">⚙️</div>
          <h3>Paramètres</h3>
          <p>Configuration système</p>
        </button>
        <button onClick={() => navigate('/admin/backup')} className="menu-card orange">
          <div className="menu-icon">💾</div>
          <h3>Sauvegardes</h3>
          <p>Backup et restauration</p>
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-actions">
          <button 
            onClick={() => (showAddForm ? (setShowAddForm(false), resetForm()) : startCreate())} 
            className="btn-add-news"
          >
            {showAddForm ? '❌ Annuler' : '➕ Ajouter une actualité'}
          </button>
          <div className="stats">
            <span className="stat-badge">📰 {news.length} actualité(s)</span>
          </div>
        </div>

        {newsError && (
          <div className="error-message" style={{ marginBottom: '12px' }}>
            ⚠️ {newsError}
          </div>
        )}

        {showAddForm && (
          <div className="add-form-container">
            <h2>{editingId ? '✏️ Modifier une actualité' : '➕ Ajouter une actualité'}</h2>
            <form onSubmit={handleSubmitArticle} className="add-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={newArticle.date}
                    onChange={(e) => setNewArticle({...newArticle, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Image (URL optionnel)</label>
                  <input
                    type="text"
                    value={newArticle.image}
                    onChange={(e) => setNewArticle({...newArticle, image: e.target.value})}
                    placeholder="https://... (ou laissez vide si vous téléversez)"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Téléverser une image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handlePickImage(e.target.files?.[0])
                      // allow re-selecting the same file
                      e.target.value = ''
                    }}
                  />
                  <small style={{ opacity: 0.8 }}>
                    Sur téléphone : vous pouvez choisir depuis la galerie ou l'appareil photo.
                  </small>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!newArticle.isActive}
                      onChange={(e) => setNewArticle({ ...newArticle, isActive: e.target.checked })}
                    />
                    Publiée sur le site
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                  placeholder="Titre de l'actualité"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newArticle.description}
                  onChange={(e) => setNewArticle({...newArticle, description: e.target.value})}
                  placeholder="Description..."
                  rows="4"
                  required
                />
              </div>

              {newArticle.image ? (
                <div className="form-group">
                  <label>Aperçu</label>
                  <div style={{ maxWidth: '320px' }}>
                    <img
                      src={newArticle.image}
                      alt="Aperçu"
                      style={{ width: '100%', borderRadius: '10px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              ) : null}
              
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? '⏳ Enregistrement...' : (editingId ? '✅ Mettre à jour' : '✅ Ajouter')}
              </button>
            </form>
          </div>
        )}

        <div className="news-list">
          <h2>📰 Actualités ({news.length})</h2>
          {loadingNews ? (
            <div className="empty-state"><p>Chargement...</p></div>
          ) : news.length === 0 ? (
            <div className="empty-state">
              <p>Aucune actualité pour le moment</p>
            </div>
          ) : (
            <div className="news-grid-admin">
              {news.map(article => (
                <div key={article._id} className="news-item-admin">
                  <div className="news-image-admin">
                    {article.image ? (
                      <img
                        src={article.image}
                        alt={article.title}
                        onError={(e) => (e.currentTarget.parentElement.innerHTML = '📸')}
                      />
                    ) : (
                      '📸'
                    )}
                  </div>
                  <div className="news-info">
                    <span className="news-date-admin">{formatDateFr(article.date)}</span>
                    <h3>{article.title}</h3>
                    <p>{article.description}</p>
                    <p style={{ marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>
                      Statut : {article.isActive ? 'Publié' : 'Brouillon'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', padding: '0 14px 14px' }}>
                    <button
                      onClick={() => startEdit(article)}
                      className="btn-submit"
                      type="button"
                      style={{ flex: 1 }}
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(article._id)}
                      className="btn-delete"
                      type="button"
                      style={{ flex: 1 }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
