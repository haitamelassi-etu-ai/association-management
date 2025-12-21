import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/api';
import './FoodStockManagement.css';
import ProfessionalLayout from '../professional/ProfessionalLayout';

const FoodStockManagement = () => {
  const navigate = useNavigate();
  const [stockItems, setStockItems] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [alerts, setAlerts] = useState({ expiration: [], stock: [] });
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [filters, setFilters] = useState({
    statut: '',
    categorie: '',
    search: ''
  });
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // État pour les formulaires
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'fruits-legumes',
    quantite: 0,
    unite: 'kg',
    prix: 0,
    dateAchat: new Date().toISOString().split('T')[0],
    dateExpiration: '',
    seuilCritique: 0,
    fournisseur: '',
    emplacement: '',
    notes: ''
  });
  const [consumeData, setConsumeData] = useState({ quantite: 0, raison: '' });
  const [planData, setPlanData] = useState(null);

  const categories = [
    { value: 'fruits-legumes', label: '🍎 Fruits & Légumes', icon: '🥗' },
    { value: 'viandes-poissons', label: '🥩 Viandes & Poissons', icon: '🍖' },
    { value: 'produits-laitiers', label: '🥛 Produits Laitiers', icon: '🧀' },
    { value: 'cereales-pains', label: '🍞 Céréales & Pains', icon: '🌾' },
    { value: 'conserves', label: '🥫 Conserves', icon: '📦' },
    { value: 'boissons', label: '🥤 Boissons', icon: '🧃' },
    { value: 'autres', label: '📦 Autres', icon: '🏪' }
  ];

  const unites = ['kg', 'g', 'L', 'ml', 'unités', 'boîtes', 'sachets'];

  // Récupérer le token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('professionalToken') || localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found! User must login first.');
      navigate('/login');
      return {};
    }
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Charger les données
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.categorie) params.append('categorie', filters.categorie);
      if (filters.search) params.append('search', filters.search);

      const [itemsRes, statsRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/food-stock?${params}`, getAuthHeaders()),
        axios.get(`${API_URL}/food-stock/stats/overview`, getAuthHeaders()),
        axios.get(`${API_URL}/food-stock/alerts/all`, getAuthHeaders())
      ]);

      setStockItems(itemsRes.data.items || []);
      setStatistics(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un article
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/food-stock`, formData, getAuthHeaders());
      setShowAddModal(false);
      resetForm();
      fetchData();
      alert('Article ajouté avec succès!');
    } catch (error) {
      console.error('Erreur ajout:', error);
      alert('Erreur lors de l\'ajout');
    }
  };

  // Modifier un article
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/food-stock/${currentItem._id}`, formData, getAuthHeaders());
      setShowEditModal(false);
      resetForm();
      fetchData();
      alert('Article modifié avec succès!');
    } catch (error) {
      console.error('Erreur modification:', error);
      alert('Erreur lors de la modification');
    }
  };

  // Consommer un article
  const handleConsume = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/food-stock/${currentItem._id}/consommer`,
        consumeData,
        getAuthHeaders()
      );
      setShowConsumeModal(false);
      setConsumeData({ quantite: 0, raison: '' });
      fetchData();
      alert('Consommation enregistrée!');
    } catch (error) {
      console.error('Erreur consommation:', error);
      alert(error.response?.data?.message || 'Erreur lors de la consommation');
    }
  };

  // Supprimer un article
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article?')) return;
    
    try {
      await axios.delete(`${API_URL}/food-stock/${id}`, getAuthHeaders());
      fetchData();
      alert('Article supprimé!');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Afficher le plan de consommation
  const showConsumptionPlan = async (item) => {
    try {
      const response = await axios.get(
        `${API_URL}/food-stock/${item._id}/plan`,
        getAuthHeaders()
      );
      setPlanData(response.data);
      setCurrentItem(item);
      setShowPlanModal(true);
    } catch (error) {
      console.error('Erreur plan:', error);
      alert('Erreur lors du calcul du plan');
    }
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setFormData({
      nom: item.nom,
      categorie: item.categorie,
      quantite: item.quantite,
      unite: item.unite,
      prix: item.prix,
      dateAchat: new Date(item.dateAchat).toISOString().split('T')[0],
      dateExpiration: new Date(item.dateExpiration).toISOString().split('T')[0],
      seuilCritique: item.seuilCritique,
      fournisseur: item.fournisseur || '',
      emplacement: item.emplacement || '',
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  const openConsumeModal = (item) => {
    setCurrentItem(item);
    setConsumeData({ quantite: 0, raison: '' });
    setShowConsumeModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'fruits-legumes',
      quantite: 0,
      unite: 'kg',
      prix: 0,
      dateAchat: new Date().toISOString().split('T')[0],
      dateExpiration: '',
      seuilCritique: 0,
      fournisseur: '',
      emplacement: '',
      notes: ''
    });
    setCurrentItem(null);
  };

  const getStatusBadge = (statut) => {
    const badges = {
      disponible: { class: 'badge-success', text: '✓ Disponible' },
      faible: { class: 'badge-warning', text: '⚠ Faible' },
      critique: { class: 'badge-danger', text: '⚠ Critique' },
      expire: { class: 'badge-expired', text: '✗ Expiré' }
    };
    return badges[statut] || badges.disponible;
  };

  const getDaysRemaining = (dateExpiration) => {
    const days = Math.ceil((new Date(dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <ProfessionalLayout noPadding>
        <div className="loading-spinner">Chargement...</div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout noPadding>
    <div className="food-stock-container">
      <div className="food-stock-header">
        <h1>🏪 Gestion du Stock Alimentaire</h1>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          ➕ Ajouter un article
        </button>
      </div>

      {/* Statistiques */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{statistics.total}</h3>
              <p>Articles Total</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{statistics.valeurTotale.toFixed(2)} DH</h3>
              <p>Valeur Totale</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>
                {statistics.statuts.find(s => s._id === 'disponible')?.count || 0}
              </h3>
              <p>Disponibles</p>
            </div>
          </div>
          <div className="stat-card alert">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <h3>{alerts.expiration.length + alerts.stock.length}</h3>
              <p>Alertes</p>
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(alerts.expiration.length > 0 || alerts.stock.length > 0) && (
        <div className="alerts-section">
          {alerts.expiration.length > 0 && (
            <div className="alert-box expiration">
              <h3>⏰ Expiration Proche ({alerts.expiration.length})</h3>
              <ul>
                {alerts.expiration.map(item => (
                  <li key={item._id}>
                    <strong>{item.nom}</strong> expire dans{' '}
                    <span className="days">{getDaysRemaining(item.dateExpiration)} jours</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {alerts.stock.length > 0 && (
            <div className="alert-box stock">
              <h3>📉 Stock Critique ({alerts.stock.length})</h3>
              <ul>
                {alerts.stock.map(item => (
                  <li key={item._id}>
                    <strong>{item.nom}</strong>:{' '}
                    <span className="quantity">{item.quantite} {item.unite}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="filters-bar">
        <select
          value={filters.statut}
          onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          className="filter-select"
        >
          <option value="">Tous les statuts</option>
          <option value="disponible">Disponible</option>
          <option value="faible">Faible</option>
          <option value="critique">Critique</option>
          <option value="expire">Expiré</option>
        </select>

        <select
          value={filters.categorie}
          onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
          className="filter-select"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-search"
        />
      </div>

      {/* Table des articles */}
      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Prix Unit.</th>
              <th>Valeur</th>
              <th>Date Exp.</th>
              <th>Jours Restants</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map(item => {
              const daysRemaining = getDaysRemaining(item.dateExpiration);
              const badge = getStatusBadge(item.statut);
              const catInfo = categories.find(c => c.value === item.categorie);
              
              return (
                <tr key={item._id}>
                  <td>
                    <strong>{catInfo?.icon} {item.nom}</strong>
                    {item.emplacement && <div className="sub-text">{item.emplacement}</div>}
                  </td>
                  <td>{catInfo?.label}</td>
                  <td>
                    <strong>{item.quantite}</strong> {item.unite}
                  </td>
                  <td>{item.prix} DH</td>
                  <td className="value">{(item.quantite * item.prix).toFixed(2)} DH</td>
                  <td>{new Date(item.dateExpiration).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className={`days-badge ${daysRemaining < 3 ? 'urgent' : daysRemaining < 7 ? 'warning' : ''}`}>
                      {daysRemaining > 0 ? `${daysRemaining} j` : 'Expiré'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${badge.class}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-action consume"
                        onClick={() => openConsumeModal(item)}
                        title="Consommer"
                      >
                        🍽️
                      </button>
                      <button 
                        className="btn-action plan"
                        onClick={() => showConsumptionPlan(item)}
                        title="Plan de consommation"
                      >
                        📊
                      </button>
                      <button 
                        className="btn-action edit"
                        onClick={() => openEditModal(item)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDelete(item._id)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {stockItems.length === 0 && (
          <div className="empty-state">
            <p>Aucun article trouvé</p>
          </div>
        )}
      </div>

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Ajouter un Article</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} className="stock-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    required
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Unité *</label>
                  <select
                    required
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  >
                    {unites.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Prix Unitaire (DH) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Seuil Critique *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.seuilCritique}
                    onChange={(e) => setFormData({ ...formData, seuilCritique: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Achat *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateAchat}
                    onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Expiration *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateExpiration}
                    onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emplacement</label>
                  <input
                    type="text"
                    value={formData.emplacement}
                    onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Modifier l'Article</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit} className="stock-form">
              {/* Same form as add modal */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    required
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Unité *</label>
                  <select
                    required
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  >
                    {unites.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Prix Unitaire (DH) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Seuil Critique *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.seuilCritique}
                    onChange={(e) => setFormData({ ...formData, seuilCritique: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Achat *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateAchat}
                    onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Expiration *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateExpiration}
                    onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emplacement</label>
                  <input
                    type="text"
                    value={formData.emplacement}
                    onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consommation */}
      {showConsumeModal && currentItem && (
        <div className="modal-overlay" onClick={() => setShowConsumeModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🍽️ Consommer: {currentItem.nom}</h2>
              <button className="modal-close" onClick={() => setShowConsumeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConsume} className="consume-form">
              <p className="info">Disponible: <strong>{currentItem.quantite} {currentItem.unite}</strong></p>
              
              <div className="form-group">
                <label>Quantité à consommer *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={currentItem.quantite}
                  step="0.01"
                  value={consumeData.quantite}
                  onChange={(e) => setConsumeData({ ...consumeData, quantite: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>Raison</label>
                <textarea
                  value={consumeData.raison}
                  onChange={(e) => setConsumeData({ ...consumeData, raison: e.target.value })}
                  rows="3"
                  placeholder="Ex: Distribution repas, préparation..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowConsumeModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plan de Consommation */}
      {showPlanModal && planData && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Plan de Consommation</h2>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>
            <div className="plan-content">
              <h3>{planData.nom}</h3>
              
              <div className="plan-stats">
                <div className="plan-stat">
                  <span className="label">Quantité Actuelle:</span>
                  <span className="value">{planData.quantiteActuelle} {currentItem.unite}</span>
                </div>
                <div className="plan-stat">
                  <span className="label">Jours Restants:</span>
                  <span className={`value ${planData.joursRestants < 3 ? 'urgent' : ''}`}>
                    {planData.joursRestants} jours
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="label">Consommation Recommandée:</span>
                  <span className="value highlight">
                    {planData.consommationQuotidienne} {currentItem.unite}/jour
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="label">Date d'Expiration:</span>
                  <span className="value">
                    {new Date(planData.dateExpiration).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="plan-recommendation">
                <p>💡 <strong>Recommandation:</strong></p>
                <p>{planData.recommandation}</p>
              </div>

              <div className="modal-actions">
                <button className="btn-submit" onClick={() => setShowPlanModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProfessionalLayout>
  );
};

export default FoodStockManagement;
