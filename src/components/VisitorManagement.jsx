import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import ProfessionalLayout from '../professional/ProfessionalLayout';
import './VisitorManagement.css';

const VisitorManagement = () => {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState({});
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', cin: '', telephone: '',
    relation: 'autre', beneficiaire: '', motif: '', badge: '', notes: ''
  });

  const getToken = () => {
    const pu = localStorage.getItem('professionalUser');
    if (pu) return JSON.parse(pu).token;
    return localStorage.getItem('token');
  };

  const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadData(); }, [filterStatus, filterDate, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('date', filterDate);
      if (search) params.append('search', search);

      const [visitorsRes, statsRes, benRes] = await Promise.all([
        fetch(`${API_URL}/visitors?${params}`, { headers }),
        fetch(`${API_URL}/visitors/stats`, { headers }),
        fetch(`${API_URL}/beneficiaries`, { headers })
      ]);

      const [vData, sData, bData] = await Promise.all([
        visitorsRes.json(), statsRes.json(), benRes.json()
      ]);

      if (vData.success) setVisitors(vData.data);
      if (sData.success) setStats(sData.data);
      if (bData.success) setBeneficiaries(bData.data || bData.beneficiaries || []);
    } catch (err) {
      console.error('Error loading visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...formData };
      if (!body.beneficiaire) delete body.beneficiaire;
      const res = await fetch(`${API_URL}/visitors`, {
        method: 'POST', headers, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error('Error adding visitor:', err);
    }
  };

  const handleSignOut = async (id) => {
    try {
      const res = await fetch(`${API_URL}/visitors/${id}/signout`, {
        method: 'PUT', headers
      });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet enregistrement ?')) return;
    try {
      await fetch(`${API_URL}/visitors/${id}`, { method: 'DELETE', headers });
      loadData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const resetForm = () => {
    setFormData({ nom: '', prenom: '', cin: '', telephone: '', relation: 'autre', beneficiaire: '', motif: '', badge: '', notes: '' });
  };

  const relationLabels = {
    famille: 'Famille', ami: 'Ami(e)', professionnel: 'Professionnel',
    benevole: 'Bénévole', officiel: 'Officiel', autre: 'Autre'
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  return (
    <ProfessionalLayout>
      <div className="visitor-management">
        <div className="page-header">
          <h1>🚪 Gestion des Visiteurs</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Enregistrer un Visiteur
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">👤</div>
            <div className="stat-info">
              <span className="stat-value">{stats.currentlyPresent || 0}</span>
              <span className="stat-label">Présents maintenant</span>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalToday || 0}</span>
              <span className="stat-label">Visites aujourd'hui</span>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalMonth || 0}</span>
              <span className="stat-label">Ce mois</span>
            </div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalAll || 0}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            type="text" placeholder="🔍 Rechercher par nom, prénom, CIN..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <input
            type="date" value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="date-input"
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="status-select">
            <option value="">Tous les statuts</option>
            <option value="present">Présents</option>
            <option value="sorti">Sortis</option>
          </select>
          <button className="btn-secondary" onClick={() => { setSearch(''); setFilterStatus(''); setFilterDate(''); }}>
            Réinitialiser
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading-state">Chargement...</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>CIN</th>
                  <th>Relation</th>
                  <th>Bénéficiaire</th>
                  <th>Motif</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 ? (
                  <tr><td colSpan="9" className="empty-state">Aucun visiteur trouvé</td></tr>
                ) : visitors.map(v => (
                  <tr key={v._id}>
                    <td><strong>{v.prenom} {v.nom}</strong><br/><small>{v.telephone}</small></td>
                    <td>{v.cin || '-'}</td>
                    <td><span className={`badge badge-${v.relation}`}>{relationLabels[v.relation]}</span></td>
                    <td>{v.beneficiaire ? `${v.beneficiaire.prenom} ${v.beneficiaire.nom}` : '-'}</td>
                    <td>{v.motif || '-'}</td>
                    <td>{formatTime(v.signIn)}<br/><small>{formatDate(v.signIn)}</small></td>
                    <td>{v.signOut ? formatTime(v.signOut) : '-'}</td>
                    <td>
                      <span className={`status-badge ${v.status}`}>
                        {v.status === 'present' ? '🟢 Présent' : '🔴 Sorti'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {v.status === 'present' && (
                        <button className="btn-sm btn-success" onClick={() => handleSignOut(v._id)} title="Sortie">
                          🚪 Sortie
                        </button>
                      )}
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(v._id)} title="Supprimer">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Enregistrer un Visiteur</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>CIN</label>
                    <input value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Relation</label>
                    <select value={formData.relation} onChange={e => setFormData({...formData, relation: e.target.value})}>
                      {Object.entries(relationLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bénéficiaire visité</label>
                    <select value={formData.beneficiaire} onChange={e => setFormData({...formData, beneficiaire: e.target.value})}>
                      <option value="">-- Aucun --</option>
                      {beneficiaries.map(b => (
                        <option key={b._id} value={b._id}>{b.prenom} {b.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Motif de la visite</label>
                  <input value={formData.motif} onChange={e => setFormData({...formData, motif: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Numéro de badge</label>
                  <input value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
};

export default VisitorManagement;
