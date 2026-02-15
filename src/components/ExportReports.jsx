import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './ExportReports.css'

function ExportReports({ data, type, title }) {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState({
    format: 'pdf',
    includeCharts: true,
    includeHeaders: true,
    dateRange: 'all',
    orientation: 'portrait'
  })

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      
      const doc = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: 'a4'
      })

      // Header
      doc.setFontSize(20)
      doc.setTextColor(52, 73, 94)
      doc.text(title || 'Rapport', 14, 20)
      
      doc.setFontSize(10)
      doc.setTextColor(127, 140, 141)
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)
      doc.text(`Association Adel Elouerif`, 14, 34)

      // Table
      if (data && data.length > 0) {
        const headers = options.includeHeaders ? Object.keys(data[0]) : []
        const rows = data.map(item => Object.values(item))

        doc.autoTable({
          head: options.includeHeaders ? [headers] : [],
          body: rows,
          startY: 45,
          headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250]
          },
          styles: {
            fontSize: 9,
            cellPadding: 4
          }
        })
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Page ${i} sur ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }

      doc.save(`${title || 'rapport'}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Erreur lors de l\'export PDF')
    }
    setExporting(false)
  }

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data || [])

      // Style headers
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '3498DB' } }
          }
        }
      }

      // Auto-width columns
      const colWidths = []
      if (data && data.length > 0) {
        Object.keys(data[0]).forEach((key, i) => {
          const maxLen = Math.max(
            key.length,
            ...data.map(row => String(row[key] || '').length)
          )
          colWidths.push({ wch: Math.min(maxLen + 2, 50) })
        })
      }
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Données')
      
      // Add metadata sheet
      const metaWs = XLSX.utils.aoa_to_sheet([
        ['Rapport:', title || 'Rapport'],
        ['Date:', new Date().toLocaleDateString('fr-FR')],
        ['Organisation:', 'Association Adel Elouerif'],
        ['Total enregistrements:', data?.length || 0]
      ])
      XLSX.utils.book_append_sheet(wb, metaWs, 'Métadonnées')

      XLSX.writeFile(wb, `${title || 'rapport'}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Excel export error:', error)
      alert('Erreur lors de l\'export Excel')
    }
    setExporting(false)
  }

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true)
    try {
      if (!data || data.length === 0) {
        throw new Error('Pas de données à exporter')
      }

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(h => {
            const val = row[h]
            // Escape quotes and wrap in quotes if contains comma
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`
            }
            return val
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title || 'rapport'}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export error:', error)
      alert('Erreur lors de l\'export CSV')
    }
    setExporting(false)
  }

  const handleExport = () => {
    switch (options.format) {
      case 'pdf':
        exportToPDF()
        break
      case 'excel':
        exportToExcel()
        break
      case 'csv':
        exportToCSV()
        break
    }
    setShowOptions(false)
  }

  return (
    <div className="export-reports">
      <button 
        className="export-trigger-btn"
        onClick={() => setShowOptions(!showOptions)}
        disabled={exporting}
      >
        {exporting ? '⏳ Export...' : '📥 Exporter'}
      </button>

      {showOptions && (
        <div className="export-dropdown">
          <div className="export-header">
            <h4>Options d'export</h4>
          </div>

          <div className="export-options">
            {/* Format */}
            <div className="option-group">
              <label>Format</label>
              <div className="format-buttons">
                <button 
                  className={`format-btn ${options.format === 'pdf' ? 'active' : ''}`}
                  onClick={() => setOptions(prev => ({ ...prev, format: 'pdf' }))}
                >
                  <span className="format-icon">📄</span>
                  <span>PDF</span>
                </button>
                <button 
                  className={`format-btn ${options.format === 'excel' ? 'active' : ''}`}
                  onClick={() => setOptions(prev => ({ ...prev, format: 'excel' }))}
                >
                  <span className="format-icon">📊</span>
                  <span>Excel</span>
                </button>
                <button 
                  className={`format-btn ${options.format === 'csv' ? 'active' : ''}`}
                  onClick={() => setOptions(prev => ({ ...prev, format: 'csv' }))}
                >
                  <span className="format-icon">📋</span>
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* PDF Options */}
            {options.format === 'pdf' && (
              <>
                <div className="option-group">
                  <label>Orientation</label>
                  <select 
                    value={options.orientation}
                    onChange={e => setOptions(prev => ({ ...prev, orientation: e.target.value }))}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Paysage</option>
                  </select>
                </div>

                <div className="option-checkbox">
                  <input 
                    type="checkbox"
                    id="includeCharts"
                    checked={options.includeCharts}
                    onChange={e => setOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  />
                  <label htmlFor="includeCharts">Inclure les graphiques</label>
                </div>
              </>
            )}

            <div className="option-checkbox">
              <input 
                type="checkbox"
                id="includeHeaders"
                checked={options.includeHeaders}
                onChange={e => setOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
              />
              <label htmlFor="includeHeaders">Inclure les en-têtes</label>
            </div>
          </div>

          <div className="export-actions">
            <button 
              className="cancel-btn"
              onClick={() => setShowOptions(false)}
            >
              Annuler
            </button>
            <button 
              className="confirm-btn"
              onClick={handleExport}
              disabled={!data || data.length === 0}
            >
              📥 Exporter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick export buttons component
export function QuickExportButtons({ data, title }) {
  const [exporting, setExporting] = useState(null)

  const quickExportPDF = async () => {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      
      const doc = new jsPDF('p', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text(title || 'Rapport', 14, 20)
      doc.setFontSize(10)
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)

      if (data?.length > 0) {
        doc.autoTable({
          head: [Object.keys(data[0])],
          body: data.map(item => Object.values(item)),
          startY: 35,
          headStyles: { fillColor: [52, 152, 219] }
        })
      }

      doc.save(`${title || 'rapport'}.pdf`)
    } catch (e) {
      console.error(e)
    }
    setExporting(null)
  }

  const quickExportExcel = async () => {
    setExporting('excel')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data || [])
      XLSX.utils.book_append_sheet(wb, ws, 'Données')
      XLSX.writeFile(wb, `${title || 'rapport'}.xlsx`)
    } catch (e) {
      console.error(e)
    }
    setExporting(null)
  }

  return (
    <div className="quick-export-buttons">
      <button 
        className="quick-btn pdf"
        onClick={quickExportPDF}
        disabled={exporting === 'pdf'}
        title="Exporter en PDF"
      >
        {exporting === 'pdf' ? '⏳' : '📄'} PDF
      </button>
      <button 
        className="quick-btn excel"
        onClick={quickExportExcel}
        disabled={exporting === 'excel'}
        title="Exporter en Excel"
      >
        {exporting === 'excel' ? '⏳' : '📊'} Excel
      </button>
    </div>
  )
}

export default ExportReports
