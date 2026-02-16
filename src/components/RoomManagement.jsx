import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import ProfessionalLayout from '../professional/ProfessionalLayout';
import './RoomManagement.css';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({});
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEtage, setFilterEtage] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [formData, setFormData] = useState({
    numero: '', etage: 0, type: 'individuelle', capacite: 1,
    equipements: '', notes: ''
  });
  const [assignData, setAssignData] = useState({ beneficiaire: '' });

  const getToken = () => {
    const pu = localStorage.getItem('professionalUser');
    if (pu) return JSON.parse(pu).token;
    return localStorage.getItem('token');
  };

  const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadData(); }, [filterStatus, filterEtage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterEtage !== '') params.append('etage', filterEtage);

      const [roomsRes, statsRes, benRes] = await Promise.all([
        fetch(`${API_URL}/rooms?${params}`, { headers }),
        fetch(`${API_URL}/rooms/stats`, { headers }),
        fetch(`${API_URL}/beneficiaries`, { headers })
      ]);
      const [rData, sData, bData] = await Promise.all([roomsRes.json(), statsRes.json(), benRes.json()]);
      if (rData.success) setRooms(rData.data);
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
      const body = {
        ...formData, capacite: Number(formData.capacite), etage: Number(formData.etage),
        equipements: formData.equipements.split(',').map(s => s.trim()).filter(Boolean)
      };
      const url = selectedRoom ? `${API_URL}/rooms/${selectedRoom._id}` : `${API_URL}/rooms`;
      const method = selectedRoom ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setShowModal(false); resetForm(); loadData(); }
      else alert(data.message);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      const res = await fetch(`${API_URL}/rooms/${selectedRoom._id}/assign`, {
        method: 'POST', headers, body: JSON.stringify(assignData)
      });
      const data = await res.json();
      if (data.success) { setShowAssignModal(false); setAssignData({ beneficiaire: '' }); loadData(); }
      else alert(data.message);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleRemoveOccupant = async (roomId, beneficiaireId) => {
    if (!window.confirm('Retirer cet occupant ?')) return;
    try {
      await fetch(`${API_URL}/rooms/${roomId}/remove`, {
        method: 'POST', headers, body: JSON.stringify({ beneficiaire: beneficiaireId })
      });
      loadData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette chambre ?')) return;
    try {
      await fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE', headers });
      loadData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const editRoom = (r) => {
    setSelectedRoom(r);
    setFormData({
      numero: r.numero, etage: r.etage, type: r.type, capacite: r.capacite,
      equipements: (r.equipements || []).join(', '), notes: r.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedRoom(null);
    setFormData({ numero: '', etage: 0, type: 'individuelle', capacite: 1, equipements: '', notes: '' });
  };

  const typeLabels = { individuelle: 'Individuelle', double: 'Double', dortoir: 'Dortoir', suite: 'Suite', isolation: 'Isolation' };
  const statusLabels = { disponible: '🟢 Disponible', occupee: '🔴 Occupée', partielle: '🟡 Partielle', maintenance: '🔧 Maintenance', hors_service: '⛔ Hors service' };
  const statusColors = { disponible: '#27ae60', occupee: '#e74c3c', partielle: '#f39c12', maintenance: '#3498db', hors_service: '#7f8c8d' };

  const getOccupants = (room) => room.occupants?.filter(o => !o.dateSortie) || [];

  return (
    <ProfessionalLayout>
      <div className="room-management">
        <div className="page-header">
          <h1>🛏️ Gestion des Chambres</h1>
          <div className="header-actions">
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>▦</button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>☰</button>
            </div>
            <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Ajouter une Chambre</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-icon">🏠</div><div className="stat-info"><span className="stat-value">{stats.totalRooms || 0}</span><span className="stat-label">Chambres</span></div></div>
          <div className="stat-card green"><div className="stat-icon">🛏️</div><div className="stat-info"><span className="stat-value">{stats.totalCapacity || 0}</span><span className="stat-label">Capacité totale</span></div></div>
          <div className="stat-card purple"><div className="stat-icon">👥</div><div className="stat-info"><span className="stat-value">{stats.currentOccupants || 0}</span><span className="stat-label">Occupants actuels</span></div></div>
          <div className="stat-card amber"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-value">{stats.occupancyRate || 0}%</span><span className="stat-label">Taux d'occupation</span></div></div>
          <div className="stat-card teal"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{stats.availableBeds || 0}</span><span className="stat-label">Lits disponibles</span></div></div>
        </div>

        {/* Occupancy bar */}
        <div className="occupancy-bar-container">
          <div className="occupancy-label">Occupation: {stats.currentOccupants || 0}/{stats.totalCapacity || 0}</div>
          <div className="occupancy-bar">
            <div className="occupancy-fill" style={{width: `${stats.occupancyRate || 0}%`, background: (stats.occupancyRate || 0) > 90 ? '#e74c3c' : (stats.occupancyRate || 0) > 70 ? '#f39c12' : '#27ae60'}}></div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="">Tous les statuts</option>
            <option value="disponible">Disponible</option>
            <option value="occupee">Occupée</option>
            <option value="partielle">Partielle</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <select value={filterEtage} onChange={e => setFilterEtage(e.target.value)} className="filter-select">
            <option value="">Tous les étages</option>
            {[0,1,2,3,4].map(e => <option key={e} value={e}>Étage {e}</option>)}
          </select>
        </div>

        {loading ? <div className="loading-state">Chargement...</div> : (
          <div className={viewMode === 'grid' ? 'rooms-grid' : 'rooms-list'}>
            {rooms.length === 0 ? <div className="empty-state">Aucune chambre trouvée</div> :
              rooms.map(room => {
                const occupants = getOccupants(room);
                return (
                  <div key={room._id} className={`room-card ${room.status}`}>
                    <div className="room-header" style={{borderTop: `4px solid ${statusColors[room.status]}`}}>
                      <div className="room-number">
                        <h3>Chambre {room.numero}</h3>
                        <span className="room-type">{typeLabels[room.type]} · Étage {room.etage}</span>
                      </div>
                      <span className={`status-tag ${room.status}`}>{statusLabels[room.status]}</span>
                    </div>
                    <div className="room-body">
                      <div className="capacity-indicator">
                        <span>Occupation: {occupants.length}/{room.capacite}</span>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{width: `${(occupants.length/room.capacite)*100}%`}}></div>
                        </div>
                      </div>
                      {occupants.length > 0 && (
                        <div className="occupants-list">
                          {occupants.map(o => (
                            <div key={o._id} className="occupant">
                              <span>👤 {o.beneficiaire?.prenom} {o.beneficiaire?.nom}</span>
                              <button className="btn-xs" onClick={() => handleRemoveOccupant(room._id, o.beneficiaire?._id)}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {room.equipements?.length > 0 && (
                        <div className="equipements">
                          {room.equipements.map((eq, i) => <span key={i} className="eq-tag">{eq}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="room-actions">
                      {occupants.length < room.capacite && room.status !== 'hors_service' && room.status !== 'maintenance' && (
                        <button className="btn-sm btn-assign" onClick={() => { setSelectedRoom(room); setShowAssignModal(true); }}>+ Assigner</button>
                      )}
                      <button className="btn-sm btn-edit" onClick={() => editRoom(room)}>✏️</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(room._id)}>🗑️</button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Add/Edit Room Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedRoom ? 'Modifier' : 'Ajouter'} une Chambre</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group"><label>Numéro *</label><input required value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} placeholder="ex: 101" /></div>
                  <div className="form-group"><label>Étage</label><input type="number" min="0" value={formData.etage} onChange={e => setFormData({...formData, etage: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Capacité *</label><input required type="number" min="1" value={formData.capacite} onChange={e => setFormData({...formData, capacite: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Équipements (séparés par des virgules)</label><input value={formData.equipements} onChange={e => setFormData({...formData, equipements: e.target.value})} placeholder="Lit, douche, bureau, TV..." /></div>
                <div className="form-group"><label>Notes</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} /></div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn-primary">{selectedRoom ? 'Mettre à jour' : 'Ajouter'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal-content small" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Assigner à Chambre {selectedRoom?.numero}</h2>
                <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAssign} className="modal-form">
                <div className="form-group">
                  <label>Bénéficiaire *</label>
                  <select required value={assignData.beneficiaire} onChange={e => setAssignData({...assignData, beneficiaire: e.target.value})}>
                    <option value="">-- Sélectionner --</option>
                    {beneficiaries.filter(b => b.status === 'actif' || b.statut === 'actif').map(b => (
                      <option key={b._id} value={b._id}>{b.prenom} {b.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Annuler</button>
                  <button type="submit" className="btn-primary">Assigner</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
};

export default RoomManagement;
