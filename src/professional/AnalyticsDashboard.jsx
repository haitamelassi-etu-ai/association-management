import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../utils/api';
import './AnalyticsDashboard.css';

const COLORS = ['#3498db', '#e74c3c', '#f39c12', '#2ecc71', '#9b59b6', '#1abc9c'];

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  useEffect(() => {
    // Check authentication
    const professionalUser = localStorage.getItem('professionalUser');
    if (!professionalUser) {
      navigate('/professional-login');
      return;
    }
    
    fetchAnalytics();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get token from professional user
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) {
        setError('Veuillez vous connecter');
        setLoading(false);
        return;
      }
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;
      
      const response = await axios.get(`${API_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button onClick={fetchAnalytics} className="btn-retry">Réessayer</button>
      </div>
    );
  }

  if (!analytics) return null;

  const { beneficiaries, staff } = analytics;

  // Prepare data for age distribution pie chart
  const ageData = beneficiaries.byAge.map(item => ({
    name: item._id,
    value: item.count
  }));

  // Prepare data for monthly trend
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = beneficiaries.monthlyStats.map(stat => {
    const [year, month] = stat.month.split('-');
    return {
      name: `${monthNames[parseInt(month) - 1]} ${year}`,
      Nouveaux: stat.count
    };
  });

  const statusData = [
    { name: 'Actifs', value: beneficiaries.active, color: '#2ecc71' },
    { name: 'Sortis', value: beneficiaries.exited, color: '#e74c3c' }
  ];

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1>📊 Tableau de Bord Analytique</h1>
        <button onClick={fetchAnalytics} className="btn-refresh">
          🔄 Actualiser
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card blue">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Total Bénéficiaires</h3>
            <div className="metric-value">{beneficiaries.total}</div>
            <div className="metric-footer">
              <span className="metric-change positive">
                ↑ {beneficiaries.growthRate}%
              </span>
              <span className="metric-label">ce mois</span>
            </div>
          </div>
        </div>

        <div className="metric-card green">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Actifs</h3>
            <div className="metric-value">{beneficiaries.active}</div>
            <div className="metric-footer">
              <span className="metric-label">Actuellement hébergés</span>
            </div>
          </div>
        </div>

        <div className="metric-card orange">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Nouveaux ce mois</h3>
            <div className="metric-value">{beneficiaries.newThisMonth}</div>
            <div className="metric-footer">
              <span className="metric-label">vs {beneficiaries.newLastMonth} mois dernier</span>
            </div>
          </div>
        </div>

        <div className="metric-card red">
          <div className="metric-icon">🚪</div>
          <div className="metric-content">
            <h3>Sortis</h3>
            <div className="metric-value">{beneficiaries.exited}</div>
            <div className="metric-footer">
              <span className="metric-label">Total départs</span>
            </div>
          </div>
        </div>

        <div className="metric-card purple">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>Taux de Réussite</h3>
            <div className="metric-value">{beneficiaries.successRate}%</div>
            <div className="metric-footer">
              <span className="metric-label">Réinsertions réussies</span>
            </div>
          </div>
        </div>

        <div className="metric-card teal">
          <div className="metric-icon">👔</div>
          <div className="metric-content">
            <h3>Personnel Actif</h3>
            <div className="metric-value">{staff.active}/{staff.total}</div>
            <div className="metric-footer">
              <span className="metric-label">{staff.todayAttendance} présents aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Monthly Trend */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>📈 Évolution Mensuelle des Nouveaux Bénéficiaires</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Nouveaux" 
                  stroke="#3498db" 
                  strokeWidth={3}
                  dot={{ fill: '#3498db', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🎂 Répartition par Âge</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Statut des Bénéficiaires</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="value" fill="#3498db">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-label">Capacité d'accueil:</span>
          <span className="stat-value">{((beneficiaries.active / 50) * 100).toFixed(0)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Moyenne nouveaux/mois:</span>
          <span className="stat-value">
            {(beneficiaries.monthlyStats.reduce((sum, m) => sum + m.count, 0) / beneficiaries.monthlyStats.length).toFixed(1)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Croissance:</span>
          <span className={`stat-value ${beneficiaries.growthRate >= 0 ? 'positive' : 'negative'}`}>
            {beneficiaries.growthRate >= 0 ? '+' : ''}{beneficiaries.growthRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
