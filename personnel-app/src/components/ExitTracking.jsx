import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ExitTracking.css';
import { API_URL } from '../utils/api';

const ExitTracking = () => {
  const [exitLogs, setExitLogs] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [currentlyOut, setCurrentlyOut] = useState([]);
  const [lateReturns, setLateReturns] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    beneficiaryId: '',
    startDate: '',
    endDate: ''
  });
  const [exitData, setExitData] = useState({
    beneficiary: '',
    destination: '',
    purpose: 'family',
    expectedReturnTime: '',
    accompaniedBy: {
      name: '',
      relationship: '',
      phone: ''
    },
    emergencyContact: '',
    medicalAlert: false,
    medicalAlertDetails: '',
    exitNotes: ''
  });
  const [returnData, setReturnData] = useState({
    returnNotes: ''
  });

  const getAuthToken = () => {
    const professionalUser = localStorage.getItem('professionalUser');
    if (professionalUser) {
      const userData = JSON.parse(professionalUser);
      return userData.token;
    }
    return localStorage.getItem('token');
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Connexion rétablie');
      // Sync offline queue
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Hors ligne');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline queue from localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }
  }, []);

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    console.log('🔄 Synchronisation des données offline...');
    const token = getAuthToken();
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const failedItems = [];

    for (const item of offlineQueue) {
      try {
        if (item.type === 'exit') {
          await axios.post(`${API_URL}/exit-logs`, item.data, config);
        } else if (item.type === 'return') {
          await axios.patch(`${API_URL}/exit-logs/${item.logId}/return`, item.data, config);
        }
        console.log('✅ Synchronisé:', item.type);
      } catch (error) {
        console.error('❌ Échec de synchronisation:', error);
        failedItems.push(item);
      }
    }

    // Update queue with failed items only
    setOfflineQueue(failedItems);
    localStorage.setItem('offlineQueue', JSON.stringify(failedItems));

    if (failedItems.length === 0) {
      alert('✅ Toutes les données ont été synchronisées!');
      fetchData();
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch all data in parallel
      const [
        beneficiariesRes,
        currentlyOutRes,
        lateRes,
        statsRes,
        logsRes
      ] = await Promise.all([
        axios.get(`${API_URL}/beneficiaries`, config),
        axios.get(`${API_URL}/exit-logs/currently-out`, config),
        axios.get(`${API_URL}/exit-logs/late`, config),
        axios.get(`${API_URL}/exit-logs/stats`, config),
        axios.get(`${API_URL}/exit-logs`, { ...config, params: filters })
      ]);

      // Extract data from response - API returns {success, count, data: [...]}
      const beneficiariesData = beneficiariesRes.data?.data || beneficiariesRes.data;
      const currentlyOutData = currentlyOutRes.data?.data || currentlyOutRes.data;
      const lateReturnsData = lateRes.data?.data || lateRes.data;
      const logsData = logsRes.data?.exitLogs || logsRes.data?.data || logsRes.data;

      setBeneficiaries(Array.isArray(beneficiariesData) ? beneficiariesData : []);
      setCurrentlyOut(Array.isArray(currentlyOutData) ? currentlyOutData : []);
      setLateReturns(Array.isArray(lateReturnsData) ? lateReturnsData : []);
      setStatistics(statsRes.data || {});
      setExitLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleExitSubmit = async (e) => {
    e.preventDefault();
    
    const token = getAuthToken();
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Format the expected return time
    const expectedReturnDate = new Date(exitData.expectedReturnTime);

    const requestData = {
      beneficiaryId: exitData.beneficiary,
      exitTime: new Date(),
      expectedReturnTime: expectedReturnDate,
      destination: exitData.destination,
      purpose: exitData.purpose,
      accompaniedBy: exitData.accompaniedBy,
      exitNotes: exitData.exitNotes,
      emergencyContact: exitData.emergencyContact,
      medicalAlert: exitData.medicalAlert,
      medicalAlertDetails: exitData.medicalAlertDetails
    };

    if (!isOnline) {
      // Save to offline queue
      const newQueue = [...offlineQueue, {
        type: 'exit',
        data: requestData,
        timestamp: new Date().toISOString()
      }];
      setOfflineQueue(newQueue);
      localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
      
      alert('📡 Hors ligne: La sortie sera enregistrée lors de la reconnexion');
      setShowExitModal(false);
      resetExitForm();
      return;
    }

    try {
      await axios.post(`${API_URL}/exit-logs`, requestData, config);

      setShowExitModal(false);
      resetExitForm();
      fetchData();
    } catch (error) {
      console.error('Error registering exit:', error);
      
      // If network error, save to offline queue
      if (!error.response) {
        const newQueue = [...offlineQueue, {
          type: 'exit',
          data: requestData,
          timestamp: new Date().toISOString()
        }];
        setOfflineQueue(newQueue);
        localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
        
        alert('📡 Erreur réseau: La sortie sera enregistrée lors de la reconnexion');
        setShowExitModal(false);
        resetExitForm();
      } else {
        alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement de la sortie');
      }
    }
  };

  const handleRecordReturn = async (logId) => {
    const token = getAuthToken();
    const config = { headers: { Authorization: `Bearer ${token}` } };

    if (!isOnline) {
      // Save to offline queue
      const newQueue = [...offlineQueue, {
        type: 'return',
        logId: logId,
        data: returnData,
        timestamp: new Date().toISOString()
      }];
      setOfflineQueue(newQueue);
      localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
      
      alert('📡 Hors ligne: Le retour sera enregistré lors de la reconnexion');
      setShowReturnModal(false);
      setSelectedLog(null);
      setReturnData({ returnNotes: '' });
      return;
    }

    try {
      await axios.patch(`${API_URL}/exit-logs/${logId}/return`, returnData, config);

      setShowReturnModal(false);
      setSelectedLog(null);
      setReturnData({ returnNotes: '' });
      fetchData();
    } catch (error) {
      console.error('Error recording return:', error);
      
      // If network error, save to offline queue
      if (!error.response) {
        const newQueue = [...offlineQueue, {
          type: 'return',
          logId: logId,
          data: returnData,
          timestamp: new Date().toISOString()
        }];
        setOfflineQueue(newQueue);
        localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
        
        alert('📡 Erreur réseau: Le retour sera enregistré lors de la reconnexion');
        setShowReturnModal(false);
        setSelectedLog(null);
        setReturnData({ returnNotes: '' });
      } else {
        alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement du retour');
      }
    }
  };

  const resetExitForm = () => {
    setExitData({
      beneficiary: '',
      destination: '',
      purpose: 'family',
      expectedReturnTime: '',
      accompaniedBy: {
        name: '',
        relationship: '',
        phone: ''
      },
      emergencyContact: '',
      medicalAlert: false,
      medicalAlertDetails: '',
      exitNotes: ''
    });
  };

  const openReturnModal = (log) => {
    setSelectedLog(log);
    setShowReturnModal(true);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const purposeTranslations = {
    work: 'Travail',
    medical: 'Médical',
    family: 'Famille',
    personal: 'Personnel',
    shopping: 'Courses',
    administrative: 'Administratif',
    other: 'Autre'
  };

  if (loading) {
    return (
      <div className="exit-tracking-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exit-tracking-container">
      {/* Offline/Online Indicator */}
      {!isOnline && (
        <div className="offline-banner">
          <span className="offline-icon">📡</span>
          <span>Mode Hors Ligne - Les modifications seront synchronisées automatiquement</span>
          {offlineQueue.length > 0 && (
            <span className="queue-count">({offlineQueue.length} en attente)</span>
          )}
        </div>
      )}
      
      {isOnline && offlineQueue.length > 0 && (
        <div className="sync-banner">
          <span className="sync-icon">🔄</span>
          <span>Synchronisation en cours... ({offlineQueue.length} éléments)</span>
        </div>
      )}

      <div className="exit-tracking-header">
        <div className="header-content">
          <h1>⏰ Gestion du Pointage</h1>
          <p className="subtitle">
            Suivi des sorties et retours des résidents
            {isOnline && <span className="online-status">🟢 En ligne</span>}
          </p>
        </div>
        <button className="btn-new-exit" onClick={() => setShowExitModal(true)}>
          <span className="btn-icon">➕</span>
          Nouvelle Sortie
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{statistics.totalExits || 0}</h3>
            <p>Sorties totales</p>
          </div>
        </div>
        <div className="stat-card stat-out">
          <div className="stat-icon">🚶</div>
          <div className="stat-content">
            <h3>{statistics.currentlyOut || 0}</h3>
            <p>Actuellement sortis</p>
          </div>
        </div>
        <div className="stat-card stat-late">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{statistics.lateReturns || 0}</h3>
            <p>Retours en retard</p>
          </div>
        </div>
        <div className="stat-card stat-duration">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>{formatDuration(statistics.avgDuration)}</h3>
            <p>Durée moyenne</p>
          </div>
        </div>
      </div>

      {/* Late Returns Alert */}
      {lateReturns && lateReturns.length > 0 && (
        <div className="alert-section alert-danger">
          <div className="alert-header">
            <span className="alert-icon">🚨</span>
            <h3>Retours en retard ({lateReturns.length})</h3>
          </div>
          <div className="alert-list">
            {lateReturns.map(log => (
              <div key={log._id} className="alert-item">
                <div className="alert-item-info">
                  <strong>{log.beneficiary?.name || `${log.beneficiary?.prenom || ''} ${log.beneficiary?.nom || ''}`.trim() || 'N/A'}</strong>
                  <span className="alert-meta">
                    Attendu: {formatDateTime(log.expectedReturnTime)}
                  </span>
                  {log.medicalAlert && (
                    <span className="medical-alert-badge">⚕️ Alerte médicale</span>
                  )}
                </div>
                <button 
                  className="btn-return-quick"
                  onClick={() => openReturnModal(log)}
                >
                  Enregistrer le retour
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently Out Section */}
      <div className="currently-out-section">
        <h2>🚶 Actuellement sortis ({currentlyOut?.length || 0})</h2>
        {!currentlyOut || currentlyOut.length === 0 ? (
          <div className="empty-state">
            <p>✅ Tous les résidents sont présents</p>
          </div>
        ) : (
          <div className="out-cards-grid">
            {currentlyOut.map(log => (
              <div key={log._id} className={`out-card ${log.medicalAlert ? 'medical-alert' : ''}`}>
                <div className="out-card-header">
                  <h3>{log.beneficiary?.name || `${log.beneficiary?.prenom || ''} ${log.beneficiary?.nom || ''}`.trim() || 'N/A'}</h3>
                  {log.medicalAlert && (
                    <span className="medical-badge">⚕️</span>
                  )}
                </div>
                <div className="out-card-body">
                  <div className="out-info-row">
                    <span className="label">Destination:</span>
                    <span className="value">{log.destination}</span>
                  </div>
                  <div className="out-info-row">
                    <span className="label">Motif:</span>
                    <span className="value purpose-badge">{purposeTranslations[log.purpose]}</span>
                  </div>
                  <div className="out-info-row">
                    <span className="label">Sorti à:</span>
                    <span className="value">{formatDateTime(log.exitTime)}</span>
                  </div>
                  <div className="out-info-row">
                    <span className="label">Retour prévu:</span>
                    <span className={`value ${log.isLate ? 'late-time' : ''}`}>
                      {formatDateTime(log.expectedReturnTime)}
                    </span>
                  </div>
                  {log.accompaniedBy?.name && (
                    <div className="out-info-row">
                      <span className="label">Accompagné par:</span>
                      <span className="value">{log.accompaniedBy.name}</span>
                    </div>
                  )}
                  {log.medicalAlert && (
                    <div className="medical-alert-details">
                      ⚕️ {log.medicalAlertDetails}
                    </div>
                  )}
                </div>
                <div className="out-card-footer">
                  <div className="time-out-badge">
                    Absent depuis: {formatDuration(log.timeOut)}
                  </div>
                  <button 
                    className="btn-return"
                    onClick={() => openReturnModal(log)}
                  >
                    Enregistrer le retour
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <h2>📋 Historique des sorties</h2>
        <div className="filters-grid">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="all">Tous les statuts</option>
            <option value="out">Sortis</option>
            <option value="returned">Retournés</option>
            <option value="late">En retard</option>
          </select>
          <select
            value={filters.beneficiaryId}
            onChange={(e) => setFilters({ ...filters, beneficiaryId: e.target.value })}
            className="filter-select"
          >
            <option value="">Tous les résidents</option>
            {beneficiaries && beneficiaries.map(ben => {
              const displayName = ben.name || `${ben.prenom || ''} ${ben.nom || ''}`.trim() || ben.nom || ben.prenom || 'Sans nom';
              return <option key={ben._id} value={ben._id}>{displayName}</option>;
            })}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="filter-input"
            placeholder="Date début"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="filter-input"
            placeholder="Date fin"
          />
          <button 
            className="btn-reset-filters"
            onClick={() => setFilters({ status: 'all', beneficiaryId: '', startDate: '', endDate: '' })}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Exit Logs Table */}
      <div className="logs-table-section">
        {!exitLogs || exitLogs.length === 0 ? (
          <div className="empty-state">
            <p>Aucune sortie enregistrée</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Résident</th>
                  <th>Destination</th>
                  <th>Motif</th>
                  <th>Heure de sortie</th>
                  <th>Retour prévu</th>
                  <th>Retour effectif</th>
                  <th>Durée</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exitLogs.map(log => (
                  <tr key={log._id} className={log.isLate ? 'row-late' : ''}>
                    <td>
                      <div className="beneficiary-cell">
                        {log.beneficiary?.name || `${log.beneficiary?.prenom || ''} ${log.beneficiary?.nom || ''}`.trim() || 'N/A'}
                        {log.medicalAlert && <span className="medical-icon">⚕️</span>}
                      </div>
                    </td>
                    <td>{log.destination}</td>
                    <td>
                      <span className="purpose-badge">{purposeTranslations[log.purpose]}</span>
                    </td>
                    <td>{formatDateTime(log.exitTime)}</td>
                    <td>{formatDateTime(log.expectedReturnTime)}</td>
                    <td>{formatDateTime(log.actualReturnTime)}</td>
                    <td>{formatDuration(log.duration)}</td>
                    <td>
                      <span className={`status-badge status-${log.status}`}>
                        {log.status === 'out' && '🚶 Sorti'}
                        {log.status === 'returned' && '✅ Retourné'}
                        {log.status === 'late' && '⚠️ En retard'}
                      </span>
                    </td>
                    <td>
                      {log.status === 'out' && (
                        <button 
                          className="btn-action btn-return-small"
                          onClick={() => openReturnModal(log)}
                        >
                          Retour
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
          <div className="modal-content exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Enregistrer une nouvelle sortie</h2>
              <button className="btn-close" onClick={() => setShowExitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleExitSubmit} className="exit-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Résident *</label>
                  <select
                    value={exitData.beneficiary}
                    onChange={(e) => setExitData({ ...exitData, beneficiary: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Sélectionner un résident</option>
                    {beneficiaries && beneficiaries.map(ben => {
                      const displayName = ben.name || `${ben.prenom || ''} ${ben.nom || ''}`.trim() || ben.nom || ben.prenom || 'Sans nom';
                      return <option key={ben._id} value={ben._id}>{displayName}</option>;
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destination *</label>
                  <input
                    type="text"
                    value={exitData.destination}
                    onChange={(e) => setExitData({ ...exitData, destination: e.target.value })}
                    required
                    className="form-input"
                    placeholder="Ex: Hôpital, Maison familiale..."
                  />
                </div>

                <div className="form-group">
                  <label>Motif *</label>
                  <select
                    value={exitData.purpose}
                    onChange={(e) => setExitData({ ...exitData, purpose: e.target.value })}
                    required
                    className="form-select"
                  >
                    {Object.entries(purposeTranslations).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Heure de retour prévue *</label>
                  <input
                    type="datetime-local"
                    value={exitData.expectedReturnTime}
                    onChange={(e) => setExitData({ ...exitData, expectedReturnTime: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Accompagné par (nom)</label>
                  <input
                    type="text"
                    value={exitData.accompaniedBy.name}
                    onChange={(e) => setExitData({ 
                      ...exitData, 
                      accompaniedBy: { ...exitData.accompaniedBy, name: e.target.value }
                    })}
                    className="form-input"
                    placeholder="Nom de l'accompagnant"
                  />
                </div>

                <div className="form-group">
                  <label>Relation</label>
                  <input
                    type="text"
                    value={exitData.accompaniedBy.relationship}
                    onChange={(e) => setExitData({ 
                      ...exitData, 
                      accompaniedBy: { ...exitData.accompaniedBy, relationship: e.target.value }
                    })}
                    className="form-input"
                    placeholder="Ex: Fils, Frère..."
                  />
                </div>

                <div className="form-group">
                  <label>Téléphone accompagnant</label>
                  <input
                    type="tel"
                    value={exitData.accompaniedBy.phone}
                    onChange={(e) => setExitData({ 
                      ...exitData, 
                      accompaniedBy: { ...exitData.accompaniedBy, phone: e.target.value }
                    })}
                    className="form-input"
                    placeholder="06XXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label>Contact d'urgence</label>
                  <input
                    type="tel"
                    value={exitData.emergencyContact}
                    onChange={(e) => setExitData({ ...exitData, emergencyContact: e.target.value })}
                    className="form-input"
                    placeholder="06XXXXXXXX"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exitData.medicalAlert}
                      onChange={(e) => setExitData({ ...exitData, medicalAlert: e.target.checked })}
                      className="form-checkbox"
                    />
                    <span>⚕️ Alerte médicale</span>
                  </label>
                </div>

                {exitData.medicalAlert && (
                  <div className="form-group full-width">
                    <label>Détails de l'alerte médicale</label>
                    <textarea
                      value={exitData.medicalAlertDetails}
                      onChange={(e) => setExitData({ ...exitData, medicalAlertDetails: e.target.value })}
                      className="form-textarea"
                      rows="2"
                      placeholder="Précisez les informations médicales importantes..."
                    />
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={exitData.exitNotes}
                    onChange={(e) => setExitData({ ...exitData, exitNotes: e.target.value })}
                    className="form-textarea"
                    rows="3"
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowExitModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Enregistrer la sortie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal-content return-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Enregistrer le retour</h2>
              <button className="btn-close" onClick={() => setShowReturnModal(false)}>✕</button>
            </div>
            <div className="return-summary">
              <h3>{selectedLog.beneficiary?.name || `${selectedLog.beneficiary?.prenom || ''} ${selectedLog.beneficiary?.nom || ''}`.trim() || 'N/A'}</h3>
              <div className="summary-info">
                <p><strong>Destination:</strong> {selectedLog.destination}</p>
                <p><strong>Sorti à:</strong> {formatDateTime(selectedLog.exitTime)}</p>
                <p><strong>Retour prévu:</strong> {formatDateTime(selectedLog.expectedReturnTime)}</p>
                {selectedLog.isLate && (
                  <p className="late-warning">⚠️ Retour en retard</p>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Notes de retour</label>
              <textarea
                value={returnData.returnNotes}
                onChange={(e) => setReturnData({ returnNotes: e.target.value })}
                className="form-textarea"
                rows="4"
                placeholder="Ajouter des notes sur le retour..."
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowReturnModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn-submit"
                onClick={() => handleRecordReturn(selectedLog._id)}
              >
                Confirmer le retour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitTracking;
