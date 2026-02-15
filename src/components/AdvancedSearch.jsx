import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AdvancedSearch.css'

function AdvancedSearch({ 
  onSearch, 
  onSaveView, 
  savedViews = [],
  onLoadView,
  resource,
  filterConfig = []
}) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [viewName, setViewName] = useState('')

  // Default filter configs for different resources
  const defaultFilterConfigs = {
    beneficiaries: [
      { key: 'status', label: 'Statut', type: 'select', options: [
        { value: 'actif', label: 'Actif' },
        { value: 'inactif', label: 'Inactif' },
        { value: 'sorti', label: 'Sorti' }
      ]},
      { key: 'typeResidence', label: 'Type résidence', type: 'select', options: [
        { value: 'heberge', label: 'Hébergé' },
        { value: 'externe', label: 'Externe' }
      ]},
      { key: 'dateFrom', label: 'Date début', type: 'date' },
      { key: 'dateTo', label: 'Date fin', type: 'date' },
      { key: 'ageMin', label: 'Âge min', type: 'number' },
      { key: 'ageMax', label: 'Âge max', type: 'number' }
    ],
    attendance: [
      { key: 'status', label: 'Statut', type: 'select', options: [
        { value: 'present', label: 'Présent' },
        { value: 'absent', label: 'Absent' },
        { value: 'late', label: 'En retard' }
      ]},
      { key: 'date', label: 'Date', type: 'date' }
    ],
    users: [
      { key: 'role', label: 'Rôle', type: 'select', options: [
        { value: 'admin', label: 'Admin' },
        { value: 'responsable', label: 'Responsable' },
        { value: 'staff', label: 'Staff' },
        { value: 'volunteer', label: 'Bénévole' }
      ]},
      { key: 'status', label: 'Statut', type: 'select', options: [
        { value: 'active', label: 'Actif' },
        { value: 'inactive', label: 'Inactif' }
      ]}
    ]
  }

  const activeConfig = filterConfig.length > 0 ? filterConfig : (defaultFilterConfigs[resource] || [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch()
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, filters])

  const handleSearch = () => {
    onSearch({ query: searchQuery, filters })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  const handleSaveView = () => {
    if (viewName.trim()) {
      onSaveView({
        name: viewName,
        filters,
        query: searchQuery
      })
      setViewName('')
      setShowSaveModal(false)
    }
  }

  const handleLoadView = (view) => {
    setFilters(view.filters || {})
    setSearchQuery(view.query || '')
    if (onLoadView) onLoadView(view)
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== undefined).length

  return (
    <div className="advanced-search">
      <div className="search-main">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={t('common.search') || 'Rechercher...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {(searchQuery || activeFilterCount > 0) && (
            <button className="clear-btn" onClick={clearFilters} title="Effacer">
              ✕
            </button>
          )}
        </div>
        
        <button 
          className={`filter-toggle ${isExpanded ? 'active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>⚙️</span>
          Filtres
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>

        {savedViews.length > 0 && (
          <div className="saved-views-dropdown">
            <select 
              onChange={(e) => {
                const view = savedViews.find(v => v._id === e.target.value)
                if (view) handleLoadView(view)
              }}
              defaultValue=""
            >
              <option value="" disabled>📁 Vues enregistrées</option>
              {savedViews.map(view => (
                <option key={view._id} value={view._id}>
                  {view.isDefault ? '⭐ ' : ''}{view.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="filters-panel">
          <div className="filters-grid">
            {activeConfig.map(config => (
              <div key={config.key} className="filter-item">
                <label>{config.label}</label>
                {config.type === 'select' ? (
                  <select
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                  >
                    <option value="">Tous</option>
                    {config.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : config.type === 'date' ? (
                  <input
                    type="date"
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                  />
                ) : config.type === 'number' ? (
                  <input
                    type="number"
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                    placeholder={config.label}
                  />
                ) : (
                  <input
                    type="text"
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                    placeholder={config.label}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="filters-actions">
            <button className="btn-secondary" onClick={clearFilters}>
              🗑️ Effacer les filtres
            </button>
            <button className="btn-primary" onClick={() => setShowSaveModal(true)}>
              💾 Sauvegarder la vue
            </button>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>💾 Sauvegarder la vue</h3>
            <input
              type="text"
              placeholder="Nom de la vue..."
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSaveModal(false)}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSaveView}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedSearch
