import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './DocumentManager.css'

function DocumentManager() {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const categories = [
    { id: 'all', label: 'Tous', icon: '📁' },
    { id: 'administrative', label: 'Administratif', icon: '📋' },
    { id: 'medical', label: 'Médical', icon: '🏥' },
    { id: 'financial', label: 'Financier', icon: '💰' },
    { id: 'reports', label: 'Rapports', icon: '📊' },
    { id: 'contracts', label: 'Contrats', icon: '📝' },
    { id: 'other', label: 'Autre', icon: '📄' }
  ]

  useEffect(() => {
    fetchDocuments()
  }, [filterCategory])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('professionalToken')
      const url = filterCategory === 'all' 
        ? `${API_URL}/api/documents`
        : `${API_URL}/api/documents?category=${filterCategory}`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setDocuments(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    const formData = new FormData()
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    formData.append('category', filterCategory !== 'all' ? filterCategory : 'other')

    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await response.json()
      if (data.success) {
        fetchDocuments()
        setShowUploadModal(false)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Erreur lors du téléchargement')
    }
    setUploading(false)
  }

  const handleDelete = async (docId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document?')) return
    
    try {
      const token = localStorage.getItem('professionalToken')
      await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setDocuments(prev => prev.filter(d => d._id !== docId))
      if (selectedDoc?._id === docId) setSelectedDoc(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('professionalToken')
      const response = await fetch(`${API_URL}/api/documents/${doc._id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const getFileIcon = (type) => {
    const icons = {
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',
      'xls': '📗',
      'xlsx': '📗',
      'ppt': '📙',
      'pptx': '📙',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'zip': '📦',
      'rar': '📦',
      'txt': '📄'
    }
    const ext = type?.split('/').pop()?.toLowerCase() || ''
    return icons[ext] || '📄'
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const filteredDocuments = documents.filter(doc => 
    doc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="document-manager">
      {/* Sidebar */}
      <div className="doc-sidebar">
        <h3>📁 Documents</h3>
        
        <button 
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳ Envoi...' : '➕ Nouveau document'}
        </button>
        <input 
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
        />

        <nav className="category-nav">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${filterCategory === cat.id ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
              <span className="cat-count">
                {cat.id === 'all' 
                  ? documents.length 
                  : documents.filter(d => d.category === cat.id).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="storage-info">
          <span className="storage-label">Espace utilisé</span>
          <div className="storage-bar">
            <div className="storage-used" style={{ width: '35%' }} />
          </div>
          <span className="storage-text">350 MB / 1 GB</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="doc-main">
        {/* Toolbar */}
        <div className="doc-toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher des documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              ▦
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Documents */}
        {loading ? (
          <div className="loading-state">
            <span className="spinner">⏳</span>
            <p>Chargement des documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <h3>Aucun document</h3>
            <p>Téléchargez votre premier document</p>
            <button onClick={() => fileInputRef.current?.click()}>
              ➕ Ajouter un document
            </button>
          </div>
        ) : (
          <div className={`documents-${viewMode}`}>
            {filteredDocuments.map(doc => (
              <div 
                key={doc._id}
                className={`document-item ${selectedDoc?._id === doc._id ? 'selected' : ''}`}
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="doc-icon">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="doc-info">
                  <span className="doc-name">{doc.name}</span>
                  <span className="doc-meta">
                    {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="doc-actions">
                  <button 
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                    title="Télécharger"
                  >
                    📥
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      {selectedDoc && (
        <div className="doc-preview">
          <div className="preview-header">
            <h4>Détails</h4>
            <button className="close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
          </div>
          
          <div className="preview-icon">
            {getFileIcon(selectedDoc.mimeType)}
          </div>
          
          <h3 className="preview-name">{selectedDoc.name}</h3>
          
          <div className="preview-details">
            <div className="detail-row">
              <span className="detail-label">Type</span>
              <span className="detail-value">{selectedDoc.mimeType || 'Inconnu'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Taille</span>
              <span className="detail-value">{formatFileSize(selectedDoc.size)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Catégorie</span>
              <span className="detail-value">
                {categories.find(c => c.id === selectedDoc.category)?.label || 'Autre'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Créé le</span>
              <span className="detail-value">
                {new Date(selectedDoc.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Créé par</span>
              <span className="detail-value">{selectedDoc.createdBy?.name || 'Inconnu'}</span>
            </div>
            {selectedDoc.versions?.length > 1 && (
              <div className="detail-row">
                <span className="detail-label">Version</span>
                <span className="detail-value">{selectedDoc.versions.length}</span>
              </div>
            )}
          </div>

          <div className="preview-actions">
            <button className="preview-btn primary" onClick={() => handleDownload(selectedDoc)}>
              📥 Télécharger
            </button>
            <button className="preview-btn" onClick={() => handleDelete(selectedDoc._id)}>
              🗑️ Supprimer
            </button>
          </div>

          {/* Version History */}
          {selectedDoc.versions?.length > 0 && (
            <div className="version-history">
              <h5>📚 Historique des versions</h5>
              {selectedDoc.versions.slice(-5).reverse().map((version, i) => (
                <div key={i} className="version-item">
                  <span className="version-number">v{selectedDoc.versions.length - i}</span>
                  <span className="version-date">
                    {new Date(version.uploadedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DocumentManager
