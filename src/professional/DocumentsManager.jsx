import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/api';
import './DocumentsManager.css';

const DOCUMENT_TYPES = [
  { value: 'cin', label: '🪪 CIN' },
  { value: 'certificat_medical', label: '🏥 Certificat Médical' },
  { value: 'photo', label: '📸 Photo' },
  { value: 'attestation', label: '📄 Attestation' },
  { value: 'autre', label: '📎 Autre' }
];

function DocumentsManager({ beneficiaryId, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('autre');
  const [description, setDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useState(() => {
    fetchDocuments();
  }, [beneficiaryId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      const response = await axios.get(`${API_URL}/documents/beneficiary/${beneficiaryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setDocuments(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch documents error:', error);
      alert('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Fichier trop volumineux. Taille maximum: 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    try {
      setUploading(true);
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('type', documentType);
      formData.append('description', description);

      const response = await axios.post(
        `${API_URL}/documents/beneficiary/${beneficiaryId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alert('✅ Document ajouté avec succès');
        setSelectedFile(null);
        setDescription('');
        setDocumentType('autre');
        setShowUploadForm(false);
        fetchDocuments();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document?')) {
      return;
    }

    try {
      const professionalUser = localStorage.getItem('professionalUser');
      if (!professionalUser) return;
      
      const userData = JSON.parse(professionalUser);
      const token = userData.token;

      const response = await axios.delete(
        `${API_URL}/documents/beneficiary/${beneficiaryId}/document/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('✅ Document supprimé');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDownload = (filename) => {
    const professionalUser = localStorage.getItem('professionalUser');
    if (!professionalUser) return;
    
    const userData = JSON.parse(professionalUser);
    const token = userData.token;

    const url = `${API_URL}/documents/download/${filename}?token=${token}`;
    window.open(url, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentIcon = (type) => {
    const icons = {
      cin: '🪪',
      certificat_medical: '🏥',
      photo: '📸',
      attestation: '📄',
      autre: '📎'
    };
    return icons[type] || '📎';
  };

  return (
    <div className="documents-manager-overlay">
      <div className="documents-manager">
        <div className="documents-header">
          <h2>📁 Gestion des Documents</h2>
          <button onClick={onClose} className="btn-close-modal">✕</button>
        </div>

        <div className="documents-actions">
          <button 
            onClick={() => setShowUploadForm(!showUploadForm)} 
            className="btn-add-document"
          >
            {showUploadForm ? '✕ Annuler' : '➕ Ajouter un Document'}
          </button>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label>Type de Document</label>
              <select 
                value={documentType} 
                onChange={(e) => setDocumentType(e.target.value)}
                className="form-select"
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fichier (Max 5MB)</label>
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                className="form-file-input"
                required
              />
              {selectedFile && (
                <div className="file-preview">
                  📄 {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Description (optionnelle)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                rows="2"
                placeholder="Notes ou description du document..."
              />
            </div>

            <button 
              type="submit" 
              className="btn-upload"
              disabled={uploading || !selectedFile}
            >
              {uploading ? '⏳ Upload en cours...' : '📤 Téléverser'}
            </button>
          </form>
        )}

        <div className="documents-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <p>Aucun document pour ce bénéficiaire</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc._id} className="document-card">
                <div className="document-icon">
                  {getDocumentIcon(doc.type)}
                </div>
                <div className="document-info">
                  <h4>{doc.nom}</h4>
                  <p className="document-type">
                    {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label || doc.type}
                  </p>
                  {doc.description && (
                    <p className="document-description">{doc.description}</p>
                  )}
                  <div className="document-meta">
                    <span>📅 {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}</span>
                    <span>📊 {formatFileSize(doc.size)}</span>
                  </div>
                </div>
                <div className="document-actions">
                  <button 
                    onClick={() => handleDownload(doc.filename)}
                    className="btn-action download"
                    title="Télécharger"
                  >
                    ⬇️
                  </button>
                  <button 
                    onClick={() => handleDelete(doc._id)}
                    className="btn-action delete"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentsManager;
