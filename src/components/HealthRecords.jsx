import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import ProfessionalLayout from '../professional/ProfessionalLayout';
import './HealthRecords.css';

const HealthRecords = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBeneficiary, setFilterBeneficiary] = useState('');
  const [formData, setFormData] = useState({
    beneficiaire: '', type: 'consultation', date: new Date().toISOString().split('T')[0],
    medecin: '', diagnostic: '', traitement: '', notes: '', urgence: false,
    signesVitaux: { tension: '', temperature: '', poids: '', taille: '', pouls: '' },
    prochainRdv: ''
  });

  const getToken = () => {
    const pu = localStorage.getItem('professionalUser');
    if (pu) return JSON.parse(pu).token;
    return localStorage.getItem('token');
  };

  const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadData(); }, [filterType, filterBeneficiary, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterBeneficiary) params.append('beneficiaire', filterBeneficiary);
      if (search) params.append('search', search);

      const [recRes, stRes, benRes] = await Promise.all([
        fetch(`${API_URL}/health-records?${params}`, { headers }),
        fetch(`${API_URL}/health-records/stats`, { headers }),
        fetch(`${API_URL}/beneficiaries`, { headers })
      ]);
      const [rData, sData, bData] = await Promise.all([recRes.json(), stRes.json(), benRes.json()]);
      if (rData.success) setRecords(rData.data);
      if (sData.success) setStats(sData.data);
      if (bData.success) setBeneficiaries(bData.data || bData.beneficiaries || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...formData };
      // Clean signes vitaux
      const sv = body.signesVitaux;
      if (sv.temperature) sv.temperature = Number(sv.temperature);
      if (sv.poids) sv.poids = Number(sv.poids);
      if (sv.taille) sv.taille = Number(sv.taille);
      if (sv.pouls) sv.pouls = Number(sv.pouls);
      if (!body.prochainRdv) delete body.prochainRdv;

      const res = await fetch(`${API_URL}/health-records`, {
        method: 'POST', headers, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { setShowModal(false); resetForm(); loadData(); }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce dossier médical ?')) return;
    try {
      await fetch(`${API_URL}/health-records/${id}`, { method: 'DELETE', headers });
      loadData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      beneficiaire: '', type: 'consultation', date: new Date().toISOString().split('T')[0],
      medecin: '', diagnostic: '', traitement: '', notes: '', urgence: false,
      signesVitaux: { tension: '', temperature: '', poids: '', taille: '', pouls: '' },
      prochainRdv: ''
    });
  };

  const typeLabels = {
    consultation: '🩺 Consultation', urgence: '🚨 Urgence', suivi: '📋 Suivi',
    vaccination: '💉 Vaccination', analyse: '🧪 Analyse', hospitalisation: '🏥 Hospitalisation', autre: '📌 Autre'
  };
  const typeColors = {
    consultation: '#3498db', urgence: '#e74c3c', suivi: '#27ae60',
    vaccination: '#9b59b6', analyse: '#f39c12', hospitalisation: '#e67e22', autre: '#7f8c8d'
  };

  return (
    <ProfessionalLayout>
      <div className="health-records">
        <div className="page-header">
          <h1>🏥 Dossiers Médicaux</h1>
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nouveau Dossier</button>
        </div>

        {/* KPIs */}
        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-icon">📋</div><div className="stat-info"><span className="stat-value">{stats.totalRecords || 0}</span><span className="stat-label">Total dossiers</span></div></div>
          <div className="stat-card green"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{stats.monthlyRecords || 0}</span><span className="stat-label">Ce mois</span></div></div>
          <div className="stat-card red"><div className="stat-icon">🚨</div><div className="stat-info"><span className="stat-value">{stats.urgentCount || 0}</span><span className="stat-label">Urgences (mois)</span></div></div>
          <div className="stat-card purple"><div className="stat-icon">📆</div><div className="stat-info"><span className="stat-value">{(stats.upcomingRdv || []).length}</span><span className="stat-label">RDV à venir</span></div></div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>📋 Dossiers</button>
          <button className={`tab ${activeTab === 'rdv' ? 'active' : ''}`} onClick={() => setActiveTab('rdv')}>📆 RDV à venir</button>
          <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>📊 Statistiques</button>
        </div>

        {loading ? <div className="loading-state">Chargement...</div> : (
          <>
            {activeTab === 'records' && (
              <>
                <div className="filters-bar">
                  <input type="text" placeholder="🔍 Diagnostic, médecin, traitement..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
                    <option value="">Tous les types</option>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={filterBeneficiary} onChange={e => setFilterBeneficiary(e.target.value)} className="filter-select">
                    <option value="">Tous les bénéficiaires</option>
                    {beneficiaries.map(b => <option key={b._id} value={b._id}>{b.prenom} {b.nom}</option>)}
                  </select>
                </div>
                <div className="records-list">
                  {records.length === 0 ? <div className="empty-state">Aucun dossier trouvé</div> :
                    records.map(r => (
                      <div key={r._id} className={`record-card ${r.urgence ? 'urgent' : ''}`}>
                        <div className="record-left" style={{borderLeft: `4px solid ${typeColors[r.type]}`}}>
                          <div className="record-type">{typeLabels[r.type]}</div>
                          <div className="record-date">{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div className="record-center">
                          <h4>{r.beneficiaire?.prenom} {r.beneficiaire?.nom}</h4>
                          {r.diagnostic && <p className="diagnostic">📝 {r.diagnostic}</p>}
                          {r.medecin && <p className="medecin">👨‍⚕️ Dr. {r.medecin}</p>}
                          {r.traitement && <p className="traitement">💊 {r.traitement}</p>}
                        </div>
                        <div className="record-right">
                          {r.urgence && <span className="urgent-badge">🚨 URGENT</span>}
                          <div className="record-actions">
                            <button className="btn-sm btn-info" onClick={() => { setSelectedRecord(r); setShowDetailModal(true); }}>👁️</button>
                            <button className="btn-sm btn-danger" onClick={() => handleDelete(r._id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </>
            )}

            {activeTab === 'rdv' && (
              <div className="rdv-list">
                {(stats.upcomingRdv || []).length === 0 ? <div className="empty-state">Aucun RDV à venir</div> :
                  (stats.upcomingRdv || []).map(r => (
                    <div key={r._id} className="rdv-card">
                      <div className="rdv-date">
                        <span className="rdv-day">{new Date(r.prochainRdv).getDate()}</span>
                        <span className="rdv-month">{new Date(r.prochainRdv).toLocaleString('fr-FR', { month: 'short' })}</span>
                      </div>
                      <div className="rdv-info">
                        <h4>{r.beneficiaire?.prenom} {r.beneficiaire?.nom}</h4>
                        <p>{typeLabels[r.type]} {r.medecin ? `· Dr. ${r.medecin}` : ''}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="stats-detail">
                <h3>Répartition par type</h3>
                <div className="type-stats">
                  {(stats.typeStats || []).map(t => (
                    <div key={t._id} className="type-stat-item">
                      <span className="type-name">{typeLabels[t._id] || t._id}</span>
                      <div className="type-bar-container">
                        <div className="type-bar" style={{width: `${(t.count / (stats.totalRecords || 1)) * 100}%`, background: typeColors[t._id]}}></div>
                      </div>
                      <span className="type-count">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRecord && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Détails du Dossier</h2>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="detail-content">
                <div className="detail-row"><strong>Patient:</strong> {selectedRecord.beneficiaire?.prenom} {selectedRecord.beneficiaire?.nom}</div>
                <div className="detail-row"><strong>Type:</strong> {typeLabels[selectedRecord.type]}</div>
                <div className="detail-row"><strong>Date:</strong> {new Date(selectedRecord.date).toLocaleDateString('fr-FR')}</div>
                {selectedRecord.medecin && <div className="detail-row"><strong>Médecin:</strong> Dr. {selectedRecord.medecin}</div>}
                {selectedRecord.diagnostic && <div className="detail-row"><strong>Diagnostic:</strong> {selectedRecord.diagnostic}</div>}
                {selectedRecord.traitement && <div className="detail-row"><strong>Traitement:</strong> {selectedRecord.traitement}</div>}
                {selectedRecord.signesVitaux && (
                  <div className="vitals-grid">
                    <h4>Signes Vitaux</h4>
                    {selectedRecord.signesVitaux.tension && <div className="vital">🩸 Tension: {selectedRecord.signesVitaux.tension}</div>}
                    {selectedRecord.signesVitaux.temperature && <div className="vital">🌡️ Température: {selectedRecord.signesVitaux.temperature}°C</div>}
                    {selectedRecord.signesVitaux.poids && <div className="vital">⚖️ Poids: {selectedRecord.signesVitaux.poids} kg</div>}
                    {selectedRecord.signesVitaux.pouls && <div className="vital">❤️ Pouls: {selectedRecord.signesVitaux.pouls} bpm</div>}
                  </div>
                )}
                {selectedRecord.prochainRdv && <div className="detail-row"><strong>Prochain RDV:</strong> {new Date(selectedRecord.prochainRdv).toLocaleDateString('fr-FR')}</div>}
                {selectedRecord.notes && <div className="detail-row"><strong>Notes:</strong> {selectedRecord.notes}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Nouveau Dossier Médical</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group"><label>Bénéficiaire *</label>
                    <select required value={formData.beneficiaire} onChange={e => setFormData({...formData, beneficiaire: e.target.value})}>
                      <option value="">-- Sélectionner --</option>
                      {beneficiaries.map(b => <option key={b._id} value={b._id}>{b.prenom} {b.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Type *</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Date *</label><input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                  <div className="form-group"><label>Médecin</label><input value={formData.medecin} onChange={e => setFormData({...formData, medecin: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Diagnostic</label><textarea value={formData.diagnostic} onChange={e => setFormData({...formData, diagnostic: e.target.value})} rows={2} /></div>
                <div className="form-group"><label>Traitement</label><textarea value={formData.traitement} onChange={e => setFormData({...formData, traitement: e.target.value})} rows={2} /></div>
                <h4 style={{margin: '16px 0 8px', color: '#555'}}>Signes Vitaux</h4>
                <div className="form-row-3">
                  <div className="form-group"><label>Tension</label><input placeholder="12/8" value={formData.signesVitaux.tension} onChange={e => setFormData({...formData, signesVitaux: {...formData.signesVitaux, tension: e.target.value}})} /></div>
                  <div className="form-group"><label>Temp (°C)</label><input type="number" step="0.1" value={formData.signesVitaux.temperature} onChange={e => setFormData({...formData, signesVitaux: {...formData.signesVitaux, temperature: e.target.value}})} /></div>
                  <div className="form-group"><label>Poids (kg)</label><input type="number" step="0.1" value={formData.signesVitaux.poids} onChange={e => setFormData({...formData, signesVitaux: {...formData.signesVitaux, poids: e.target.value}})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Prochain RDV</label><input type="date" value={formData.prochainRdv} onChange={e => setFormData({...formData, prochainRdv: e.target.value})} /></div>
                  <div className="form-group urgency-check">
                    <label>
                      <input type="checkbox" checked={formData.urgence} onChange={e => setFormData({...formData, urgence: e.target.checked})} />
                      🚨 Cas urgent
                    </label>
                  </div>
                </div>
                <div className="form-group"><label>Notes</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} /></div>
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

export default HealthRecords;
