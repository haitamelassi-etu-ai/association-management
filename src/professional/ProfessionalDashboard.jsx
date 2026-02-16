import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { beneficiariesAPI } from '../services/api'
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import NotificationBell from './NotificationBell'
import NotificationCenter from './NotificationCenter'
import ChatFloatingButton from './ChatFloatingButton'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { ProfessionalSidebar } from './SharedSidebar'
import './ProfessionalDashboard.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const MABAARD_LABELS = {
  nazil_bilmarkaz: 'نزيل بالمركز',
  mughAdara: 'مغادرة',
  idmaj_usari: 'إدماج أسري',
  firAr: 'فرار',
  tard: 'طرد',
  wafat: 'وفاة'
};
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const MiniTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="mini-tooltip">
      <span>{payload[0]?.name || payload[0]?.payload?.name}: <strong>{payload[0]?.value}</strong></span>
    </div>
  );
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

const actionLabels = {
  create: { text: 'Création', icon: '➕', cls: 'new' },
  update: { text: 'Mise à jour', icon: '✏️', cls: 'update' },
  delete: { text: 'Suppression', icon: '🗑️', cls: 'danger' },
  login: { text: 'Connexion', icon: '🔑', cls: 'info' },
  export: { text: 'Export', icon: '📤', cls: 'info' },
  import: { text: 'Import', icon: '📥', cls: 'success' },
  view: { text: 'Consultation', icon: '👁️', cls: 'info' },
  status_change: { text: 'Changement statut', icon: '🔄', cls: 'update' },
  attendance_marked: { text: 'Pointage', icon: '⏰', cls: 'success' },
  exit_recorded: { text: 'Sortie', icon: '🚶', cls: 'update' },
  meal_served: { text: 'Repas servi', icon: '🍽️', cls: 'success' },
};

const resourceLabels = {
  beneficiary: 'bénéficiaire',
  user: 'utilisateur',
  attendance: 'pointage',
  announcement: 'annonce',
  medication: 'médicament',
  meal: 'repas',
  pharmacy: 'pharmacie',
  foodStock: 'stock alimentaire',
  document: 'document',
  report: 'rapport',
  system: 'système',
};

function ProfessionalDashboard() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) { navigate('/login'); return; }
    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchStats()
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])

  const fetchStats = async () => {
    try {
      const response = await beneficiariesAPI.getStats()
      setStats(response.data.data)
    } catch (error) {
      console.error('Erreur stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('professionalToken')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  if (!user) return <div className="dash-loading"><div className="dash-spinner"></div></div>;

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Prepare chart data
  const maBaadData = stats?.maBaadStats?.map(s => ({
    name: MABAARD_LABELS[s._id] || s._id,
    value: s.count
  })) || [];

  const healthData = stats?.healthStats?.map(s => ({
    name: s._id,
    value: s.count
  })) || [];

  const lieuData = stats?.lieuStats?.map(s => ({
    name: s._id,
    value: s.count
  })) || [];

  const trendData = stats?.monthlyTrend?.map(s => {
    const [y, m] = s._id.split('-');
    return { name: `${MONTH_NAMES[parseInt(m)-1]}`, value: s.count };
  }) || [];

  const activities = stats?.recentActivities || [];
  const announcements = stats?.announcements || [];
  const recentBens = stats?.recentBeneficiaries || [];

  return (
    <div className="professional-dashboard">
      <ProfessionalSidebar user={user} onLogout={handleLogout} />

      <main className="dashboard-main">
        {/* ── Header ── */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Tableau de bord</h1>
            <p className="header-date">{dateStr}</p>
            <p className="header-welcome">Bienvenue, <strong>{user?.prenom || ''} {user?.nom || ''}</strong></p>
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell onClick={() => setShowNotifications(true)} />
            <Link to="/professional/announcements" className="btn-action">
              <span>📢</span> Annonces
            </Link>
            <Link to="/professional/beneficiaries" className="btn-action primary">
              <span>➕</span> Nouveau bénéficiaire
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="dash-loading"><div className="dash-spinner"></div><p>Chargement...</p></div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-label">Total bénéficiaires</div>
                  <div className="stat-value">{stats?.total || 0}</div>
                  <div className="stat-sub">Depuis la création</div>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">🏠</div>
                <div className="stat-content">
                  <div className="stat-label">Actuellement hébergés</div>
                  <div className="stat-value">{stats?.heberge || 0}</div>
                  <div className="stat-sub">Capacité active</div>
                </div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-label">Nouveaux ce mois</div>
                  <div className="stat-value">{stats?.nouveauxCeMois || 0}</div>
                  <div className="stat-sub">{stats?.sortisCeMois || 0} sorties</div>
                </div>
              </div>
              <div className="stat-card red">
                <div className="stat-icon">🚪</div>
                <div className="stat-content">
                  <div className="stat-label">Total sortis</div>
                  <div className="stat-value">{stats?.sorti || 0}</div>
                  <div className="stat-sub">{stats?.total ? ((stats.sorti / stats.total) * 100).toFixed(0) : 0}% du total</div>
                </div>
              </div>
              <div className="stat-card purple">
                <div className="stat-icon">👔</div>
                <div className="stat-content">
                  <div className="stat-label">Personnel actif</div>
                  <div className="stat-value">{stats?.staffCount || 0}</div>
                  <div className="stat-sub">Utilisateurs</div>
                </div>
              </div>
              <div className="stat-card teal">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-label">Distributions</div>
                  <div className="stat-value">{stats?.distributionsCeMois || 0}</div>
                  <div className="stat-sub">Ce mois</div>
                </div>
              </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="dashboard-charts">
              {/* Monthly Trend */}
              <div className="dash-chart-card wide">
                <div className="chart-title">
                  <h3>📈 Évolution des entrées</h3>
                  <span className="chart-period">12 derniers mois</span>
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip content={<MiniTooltip />} />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5}
                        fill="url(#gradBlue)" dot={{ fill: '#3b82f6', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">Aucune donnée</div>}
              </div>

              {/* مابعد الايواء */}
              <div className="dash-chart-card">
                <div className="chart-title"><h3>🏠 Statut post-hébergement</h3></div>
                {maBaadData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={maBaadData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" paddingAngle={2}>
                          {maBaadData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<MiniTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mini-legend">
                      {maBaadData.map((d, i) => (
                        <div key={i} className="mini-legend-item">
                          <span className="dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                          <span className="lbl">{d.name}</span>
                          <span className="val">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="no-data">Aucune donnée</div>}
              </div>

              {/* Lieu intervention */}
              <div className="dash-chart-card">
                <div className="chart-title"><h3>🗺️ Zones d'intervention</h3></div>
                {lieuData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={lieuData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="name" fontSize={11} stroke="#94a3b8" width={100} />
                      <Tooltip content={<MiniTooltip />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {lieuData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="no-data">Aucune donnée</div>}
              </div>
            </div>

            {/* ── Bottom Section ── */}
            <div className="dashboard-bottom">
              {/* Recent Activities */}
              <div className="content-card">
                <div className="card-header">
                  <h3>📋 Activités récentes</h3>
                  <span className="card-count">{activities.length > 0 ? `${activities.length} dernières` : ''}</span>
                </div>
                <div className="activities-list">
                  {activities.length > 0 ? activities.map((act, i) => {
                    const info = actionLabels[act.action] || { text: act.action, icon: '📌', cls: 'info' };
                    const userName = act.user ? `${act.user.prenom || ''} ${act.user.nom || ''}`.trim() : 'Système';
                    const resLabel = resourceLabels[act.resource] || act.resource;
                    return (
                      <div key={i} className="activity-item">
                        <div className={`activity-icon ${info.cls}`}>{info.icon}</div>
                        <div className="activity-details">
                          <div className="activity-title">{info.text} — {resLabel}</div>
                          <div className="activity-meta">{userName} · {timeAgo(act.timestamp)}</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <>
                      <div className="activity-item">
                        <div className="activity-icon new">➕</div>
                        <div className="activity-details">
                          <div className="activity-title">Nouveau bénéficiaire ajouté</div>
                          <div className="activity-meta">Système · Récemment</div>
                        </div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-icon info">📊</div>
                        <div className="activity-details">
                          <div className="activity-title">Base de données à jour</div>
                          <div className="activity-meta">{stats?.total || 0} bénéficiaires enregistrés</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Announcements + Recent Beneficiaries */}
              <div className="content-card">
                <div className="card-header">
                  <h3>📢 Annonces</h3>
                  <Link to="/professional/announcements" className="link-more">Voir tout →</Link>
                </div>
                <div className="announcements-list">
                  {announcements.length > 0 ? announcements.map((ann, i) => (
                    <div key={i} className={`announcement-item ${ann.type || 'info'}`}>
                      <div className="announcement-badge">
                        {ann.type === 'urgent' ? 'Urgent' : ann.type === 'tache' ? 'Tâche' : ann.type === 'evenement' ? 'Événement' : 'Info'}
                      </div>
                      <div className="announcement-title">{ann.titre}</div>
                      <div className="announcement-date">{timeAgo(ann.createdAt)}</div>
                    </div>
                  )) : (
                    <div className="empty-announcements">
                      <span className="empty-icon">📭</span>
                      <p>Aucune annonce active</p>
                    </div>
                  )}
                </div>

                {/* Recent beneficiaries mini-table */}
                {recentBens.length > 0 && (
                  <div className="recent-bens-section">
                    <div className="card-header" style={{ marginTop: '1rem' }}>
                      <h3>👥 Derniers inscrits</h3>
                      <Link to="/professional/beneficiaries" className="link-more">Voir tout →</Link>
                    </div>
                    <div className="recent-bens-list">
                      {recentBens.map((b, i) => (
                        <div key={i} className="recent-ben-item">
                          <div className="ben-avatar">{b.nom?.[0] || '?'}</div>
                          <div className="ben-info">
                            <span className="ben-name">{b.prenom} {b.nom}</span>
                            <span className="ben-meta">#{b.numeroOrdre} · {b.dateEntree ? new Date(b.dateEntree).toLocaleDateString('fr-FR') : '—'}</span>
                          </div>
                          <span className={`ben-badge ${b.statut}`}>
                            {b.statut === 'heberge' ? 'Hébergé' : b.statut === 'sorti' ? 'Sorti' : b.statut}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="quick-actions-bar">
              <Link to="/professional/beneficiaries" className="quick-action-btn">
                <span className="qa-icon">👥</span> Bénéficiaires
              </Link>
              <Link to="/professional/analytics" className="quick-action-btn">
                <span className="qa-icon">📈</span> Analytique
              </Link>
              <Link to="/professional/attendance" className="quick-action-btn">
                <span className="qa-icon">⏰</span> Pointage
              </Link>
              <Link to="/professional/food-stock" className="quick-action-btn">
                <span className="qa-icon">🏪</span> Stock
              </Link>
              <Link to="/professional/reports" className="quick-action-btn">
                <span className="qa-icon">📋</span> Rapports
              </Link>
              <Link to="/professional/exit-tracking" className="quick-action-btn">
                <span className="qa-icon">🚶</span> Sorties
              </Link>
            </div>
          </>
        )}
      </main>

      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      <ChatFloatingButton />
    </div>
  )
}

export default ProfessionalDashboard
