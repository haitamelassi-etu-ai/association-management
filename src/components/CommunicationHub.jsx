import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import ProfessionalLayout from '../professional/ProfessionalLayout';
import './CommunicationHub.css';

const CommunicationHub = () => {
  const [communications, setCommunications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComm, setSelectedComm] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [replyText, setReplyText] = useState('');
  const [formData, setFormData] = useState({
    type: 'interne', sujet: '', contenu: '', destinataires: 'tous',
    priorite: 'normale', status: 'brouillon'
  });

  const getToken = () => {
    const pu = localStorage.getItem('professionalUser');
    if (pu) return JSON.parse(pu).token;
    return localStorage.getItem('token');
  };

  const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadData(); }, [filterType, filterStatus, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (search) params.append('search', search);

      const [commRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/communications?${params}`, { headers }),
        fetch(`${API_URL}/communications/stats`, { headers })
      ]);
      const [cData, sData] = await Promise.all([commRes.json(), statsRes.json()]);
      if (cData.success) setCommunications(cData.data);
      if (sData.success) setStats(sData.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/communications`, {
        method: 'POST', headers, body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) { setShowModal(false); resetForm(); loadData(); }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSend = async (id) => {
    try {
      const res = await fetch(`${API_URL}/communications/${id}/send`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/communications/${id}/reply`, {
        method: 'POST', headers, body: JSON.stringify({ contenu: replyText })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText('');
        setSelectedComm(data.data);
        loadData();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette communication ?')) return;
    try {
      await fetch(`${API_URL}/communications/${id}`, { method: 'DELETE', headers });
      if (selectedComm?._id === id) { setShowDetailModal(false); setSelectedComm(null); }
      loadData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await fetch(`${API_URL}/communications/${id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelectedComm(data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setFormData({ type: 'interne', sujet: '', contenu: '', destinataires: 'tous', priorite: 'normale', status: 'brouillon' });
  };

  const typeLabels = { newsletter: '📰 Newsletter', email: '📧 Email', sms: '📱 SMS', interne: '💬 Interne', broadcast: '📢 Broadcast' };
  const typeIcons = { newsletter: '📰', email: '📧', sms: '📱', interne: '💬', broadcast: '📢' };
  const statusLabels = { brouillon: '📝 Brouillon', planifie: '📅 Planifié', envoye: '✅ Envoyé', erreur: '❌ Erreur' };
  const prioriteLabels = { basse: '🔵 Basse', normale: '🟢 Normale', haute: '🟠 Haute', urgente: '🔴 Urgente' };
  const destLabels = { tous: 'Tous', staff: 'Staff', admin: 'Admins', benevoles: 'Bénévoles', beneficiaires: 'Bénéficiaires', personnalise: 'Personnalisé' };

  const filteredComms = communications.filter(c => {
    if (activeTab === 'drafts') return c.status === 'brouillon';
    if (activeTab === 'sent') return c.status === 'envoye';
    return true;
  });

  return (
    <ProfessionalLayout>
      <div className="communication-hub">
        <div className="page-header">
          <h1>📨 Hub de Communication</h1>
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nouvelle Communication</button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-icon">📨</div><div className="stat-info"><span className="stat-value">{stats.total || 0}</span><span className="stat-label">Total</span></div></div>
          <div className="stat-card amber"><div className="stat-icon">📝</div><div className="stat-info"><span className="stat-value">{stats.brouillons || 0}</span><span className="stat-label">Brouillons</span></div></div>
          <div className="stat-card green"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{stats.envoyes || 0}</span><span className="stat-label">Envoyés</span></div></div>
          <div className="stat-card purple"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{stats.planifies || 0}</span><span className="stat-label">Planifiés</span></div></div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>📥 Tous</button>
          <button className={`tab ${activeTab === 'drafts' ? 'active' : ''}`} onClick={() => setActiveTab('drafts')}>📝 Brouillons</button>
          <button className={`tab ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>✅ Envoyés</button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
            <option value="">Tous les types</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? <div className="loading-state">Chargement...</div> : (
          <div className="comm-list">
            {filteredComms.length === 0 ? <div className="empty-state">Aucune communication</div> :
              filteredComms.map(c => (
                <div key={c._id} className={`comm-card priorite-${c.priorite}`} onClick={() => openDetail(c._id)}>
                  <div className="comm-icon">{typeIcons[c.type]}</div>
                  <div className="comm-content">
                    <div className="comm-header-row">
                      <h4>{c.sujet}</h4>
                      <span className={`status-tag ${c.status}`}>{statusLabels[c.status]}</span>
                    </div>
                    <p className="comm-preview">{c.contenu?.substring(0, 120)}{c.contenu?.length > 120 ? '...' : ''}</p>
                    <div className="comm-meta">
                      <span>👤 {c.creePar?.prenom} {c.creePar?.nom}</span>
                      <span>📌 {destLabels[c.destinataires]}</span>
                      <span>🕐 {new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                      {c.reponses?.length > 0 && <span>💬 {c.reponses.length} réponses</span>}
                    </div>
                  </div>
                  <div className="comm-actions" onClick={e => e.stopPropagation()}>
                    {c.status === 'brouillon' && (
                      <button className="btn-sm btn-send" onClick={() => handleSend(c._id)}>📤 Envoyer</button>
                    )}
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(c._id)}>🗑️</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedComm && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{typeIcons[selectedComm.type]} {selectedComm.sujet}</h2>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
              <div className="detail-content">
                <div className="detail-meta">
                  <span>{statusLabels[selectedComm.status]}</span>
                  <span>{prioriteLabels[selectedComm.priorite]}</span>
                  <span>📌 {destLabels[selectedComm.destinataires]}</span>
                  <span>🕐 {new Date(selectedComm.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="detail-body">{selectedComm.contenu}</div>

                {/* Replies */}
                {selectedComm.reponses?.length > 0 && (
                  <div className="replies-section">
                    <h4>💬 Réponses ({selectedComm.reponses.length})</h4>
                    {selectedComm.reponses.map((r, i) => (
                      <div key={i} className="reply-item">
                        <div className="reply-header">
                          <strong>{r.auteur?.prenom} {r.auteur?.nom}</strong>
                          <small>{new Date(r.date).toLocaleString('fr-FR')}</small>
                        </div>
                        <p>{r.contenu}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply box */}
                <div className="reply-box">
                  <textarea placeholder="Écrire une réponse..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} />
                  <button className="btn-primary" onClick={() => handleReply(selectedComm._id)}>Répondre</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Communication Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Nouvelle Communication</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group"><label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Priorité</label>
                    <select value={formData.priorite} onChange={e => setFormData({...formData, priorite: e.target.value})}>
                      {Object.entries(prioriteLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Sujet *</label><input required value={formData.sujet} onChange={e => setFormData({...formData, sujet: e.target.value})} /></div>
                <div className="form-group"><label>Destinataires</label>
                  <select value={formData.destinataires} onChange={e => setFormData({...formData, destinataires: e.target.value})}>
                    {Object.entries(destLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Contenu *</label><textarea required value={formData.contenu} onChange={e => setFormData({...formData, contenu: e.target.value})} rows={6} /></div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn-primary">💾 Sauvegarder comme brouillon</button>
                  <button type="button" className="btn-send-now" onClick={async (e) => {
                    e.preventDefault();
                    setFormData(f => ({...f, status: 'envoye'}));
                    // Submit with status envoye
                    try {
                      const body = {...formData, status: 'envoye', dateEnvoi: new Date()};
                      const res = await fetch(`${API_URL}/communications`, {
                        method: 'POST', headers, body: JSON.stringify(body)
                      });
                      const data = await res.json();
                      if (data.success) { setShowModal(false); resetForm(); loadData(); }
                    } catch (err) { console.error(err); }
                  }}>📤 Envoyer maintenant</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
};

export default CommunicationHub;
