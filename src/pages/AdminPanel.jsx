import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminPanel.css'

function AdminPanel({ onLogout }) {
  const [news, setNews] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newArticle, setNewArticle] = useState({
    date: '',
    title: '',
    description: '',
    image: ''
  })
  const navigate = useNavigate()

  // تحميل الأخبار من localStorage
  useEffect(() => {
    const savedNews = localStorage.getItem('newsArticles')
    if (savedNews) {
      setNews(JSON.parse(savedNews))
    } else {
      // الأخبار الافتراضية
      const defaultNews = [
        {
          id: 1,
          date: '10 Novembre 2025',
          title: 'Grande collecte d\'hiver réussie !',
          description: 'Grâce à votre générosité, nous avons collecté plus de 2000 vêtements chauds et 500 couvertures pour affronter l\'hiver.',
          image: '/images/actualites/news-1.jpg'
        },
        {
          id: 2,
          date: '25 Octobre 2025',
          title: 'Nouveau partenariat avec des entreprises locales',
          description: '5 entreprises s\'engagent à nos côtés pour faciliter l\'insertion professionnelle de nos bénéficiaires.',
          image: '/images/actualites/news-2.jpg'
        },
        {
          id: 3,
          date: '15 Octobre 2025',
          title: 'Témoignage : Le parcours de Mohamed',
          description: 'Hébergé pendant 4 mois, Mohamed a retrouvé un emploi stable et un logement. Découvrez son parcours inspirant.',
          image: '/images/actualites/news-3.jpg'
        },
        {
          id: 4,
          date: '5 Octobre 2025',
          title: 'Journée portes ouvertes : un succès !',
          description: 'Plus de 200 visiteurs sont venus découvrir nos installations et rencontrer notre équipe lors de cette belle journée de partage.',
          image: '/images/actualites/news-4.jpg'
        },
        {
          id: 5,
          date: '20 Septembre 2025',
          title: 'Lancement des ateliers cuisine solidaire',
          description: 'Nos nouveaux ateliers cuisine permettent aux bénéficiaires d\'apprendre et de partager autour de repas conviviaux.',
          image: '/images/actualites/news-5.jpg'
        },
        {
          id: 6,
          date: '10 Septembre 2025',
          title: 'Nouvelle formation en rénovation',
          description: '12 bénéficiaires suivent actuellement une formation qualifiante en rénovation du bâtiment avec nos partenaires.',
          image: '/images/actualites/news-6.jpg'
        }
      ]
      setNews(defaultNews)
      localStorage.setItem('newsArticles', JSON.stringify(defaultNews))
    }
  }, [])

  // حفظ الأخبار في localStorage
  const saveNews = (updatedNews) => {
    setNews(updatedNews)
    localStorage.setItem('newsArticles', JSON.stringify(updatedNews))
  }

  // حذف خبر
  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
      const updatedNews = news.filter(article => article.id !== id)
      saveNews(updatedNews)
    }
  }

  // إضافة خبر جديد
  const handleAddArticle = (e) => {
    e.preventDefault()
    const newId = news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1
    const article = {
      id: newId,
      ...newArticle
    }
    saveNews([article, ...news])
    setNewArticle({ date: '', title: '', description: '', image: '' })
    setShowAddForm(false)
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
            <h1>🎛️ لوحة التحكم - Admin Panel</h1>
            <p>إدارة الأخبار والإعلانات</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 خروج
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
            onClick={() => setShowAddForm(!showAddForm)} 
            className="btn-add-news"
          >
            {showAddForm ? '❌ إلغاء' : '➕ إضافة خبر جديد'}
          </button>
          <div className="stats">
            <span className="stat-badge">📰 {news.length} خبر</span>
          </div>
        </div>

        {showAddForm && (
          <div className="add-form-container">
            <h2>➕ إضافة خبر جديد</h2>
            <form onSubmit={handleAddArticle} className="add-form">
              <div className="form-row">
                <div className="form-group">
                  <label>التاريخ</label>
                  <input
                    type="text"
                    value={newArticle.date}
                    onChange={(e) => setNewArticle({...newArticle, date: e.target.value})}
                    placeholder="10 Novembre 2025"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>رابط الصورة</label>
                  <input
                    type="text"
                    value={newArticle.image}
                    onChange={(e) => setNewArticle({...newArticle, image: e.target.value})}
                    placeholder="/images/actualites/news-7.jpg"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>العنوان</label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                  placeholder="عنوان الخبر"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>الوصف</label>
                <textarea
                  value={newArticle.description}
                  onChange={(e) => setNewArticle({...newArticle, description: e.target.value})}
                  placeholder="وصف الخبر..."
                  rows="4"
                  required
                />
              </div>
              
              <button type="submit" className="btn-submit">
                ✅ إضافة الخبر
              </button>
            </form>
          </div>
        )}

        <div className="news-list">
          <h2>📰 الأخبار الحالية ({news.length})</h2>
          {news.length === 0 ? (
            <div className="empty-state">
              <p>لا توجد أخبار حالياً</p>
            </div>
          ) : (
            <div className="news-grid-admin">
              {news.map(article => (
                <div key={article.id} className="news-item-admin">
                  <div className="news-image-admin">
                    <img src={article.image} alt={article.title} />
                  </div>
                  <div className="news-info">
                    <span className="news-date-admin">{article.date}</span>
                    <h3>{article.title}</h3>
                    <p>{article.description}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(article.id)}
                    className="btn-delete"
                  >
                    🗑️ حذف
                  </button>
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
