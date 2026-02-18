import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { beneficiariesAPI } from '../services/api'
import { ProfessionalSidebar } from './SharedSidebar'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './ProfessionalDashboard.css'
import './Beneficiaries.css'

const SITUATION_LABELS = {
  celibataire: 'Célibataire',
  marie: 'Marié(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf/Veuve',
  autre: 'Autre'
}

const STATUT_CONFIG = {
  heberge: { label: 'Hébergé', class: 'badge-heberge', icon: '🏠' },
  sorti: { label: 'Sorti', class: 'badge-sorti', icon: '🚪' },
  en_suivi: { label: 'En suivi', class: 'badge-suivi', icon: '📋' },
  transfere: { label: 'Transféré', class: 'badge-transfere', icon: '🔄' }
}

const SITUATION_TYPE_LABELS = {
  mutasharrid: 'متشرد',
  mutasharrid_mutasawwil: 'متشرد + متسول',
  tasawwul: 'التسول',
  tasharrud: 'تشرد',
  autre: 'أخرى'
}

const MA_BAAD_LABELS = {
  nazil_bilmarkaz: { label: 'نزيل بالمركز', icon: '🏠', class: 'badge-nazil' },
  mughAdara: { label: 'مغادرة', icon: '🚪', class: 'badge-mughAdara' },
  idmaj_usari: { label: 'ادماج اسري', icon: '👨‍👩‍👧‍👦', class: 'badge-idmaj' },
  firAr: { label: 'فرار', icon: '🏃', class: 'badge-firAr' },
  tard: { label: 'طرد', icon: '⛔', class: 'badge-tard' },
  wafat: { label: 'وفاة', icon: '🕯️', class: 'badge-wafat' }
}

const BESOINS_LABELS = {
  alimentaire: { label: 'Alimentaire', icon: '🍽️' },
  hygiene: { label: 'Hygiène', icon: '🧼' },
  medical: { label: 'Médical', icon: '💊' },
  vestimentaire: { label: 'Vestimentaire', icon: '👕' },
  psychologique: { label: 'Psychologique', icon: '🧠' },
  juridique: { label: 'Juridique', icon: '⚖️' },
  formation: { label: 'Formation', icon: '📚' }
}

function Beneficiaries() {
  const [user, setUser] = useState(null)
  const [beneficiaries, setBeneficiaries] = useState([])
  const [stats, setStats] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState('heberge')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editBeneficiary, setEditBeneficiary] = useState(null)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  const [showSuiviModal, setShowSuiviModal] = useState(false)
  const [detailTab, setDetailTab] = useState('info')
  const [distributions, setDistributions] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const searchTimer = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('professionalUser')
    if (!userData) {
      navigate('/professional/login')
      return
    }
    setUser(JSON.parse(userData))
    fetchBeneficiaries()
    fetchStats()
  }, [navigate])

  const fetchBeneficiaries = async () => {
    try {
      const response = await beneficiariesAPI.getAll()
      setBeneficiaries(response.data?.data || [])
    } catch (error) {
      console.error('Erreur chargement bénéficiaires:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await beneficiariesAPI.getStats()
      setStats(response.data?.data || null)
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('professionalUser')
    localStorage.removeItem('professionalToken')
    navigate('/professional/login')
  }

  // Debounced search
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
    setSearchTerm(value)
  }, [])

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchSearch = !searchTerm || 
      `${b.nom} ${b.prenom} ${b.telephone || ''} ${b.cin || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatut = filterStatut === 'all' || b.statut === filterStatut
    return matchSearch && matchStatut
  })

  // ─── ADD BENEFICIARY ───
  const handleAddBeneficiary = async (e) => {
    e.preventDefault()
    const form = e.target
    const newBeneficiary = {
      nom: form.nom.value,
      prenom: form.prenom.value,
      sexe: form.sexe.value,
      dateNaissance: form.dateNaissance.value || undefined,
      cin: form.cin?.value || '',
      telephone: form.telephone.value,
      adresseOrigine: form.adresseOrigine?.value || '',
      nationalite: form.nationalite?.value || 'Marocaine',
      lieuNaissance: form.lieuNaissance?.value || '',
      etatSante: form.etatSante?.value || '',
      entiteOrientatrice: form.entiteOrientatrice?.value || '',
      lieuIntervention: form.lieuIntervention?.value || '',
      situationFamiliale: form.situationFamiliale.value,
      nombreEnfants: parseInt(form.nombreEnfants.value) || 0,
      situationType: form.situationType.value,
      maBaadAlIwaa: form.maBaadAlIwaa?.value || 'nazil_bilmarkaz',
      professionAvant: form.professionAvant?.value || '',
      niveauEducation: form.niveauEducation?.value || 'aucun',
      motifEntree: form.motifEntree?.value || '',
      roomNumber: form.roomNumber?.value || '',
      bedNumber: form.bedNumber?.value || '',
      groupeSanguin: form.groupeSanguin?.value || '',
      allergies: form.allergies?.value || '',
      maladiesChroniques: form.maladiesChroniques?.value || '',
      notes: form.notes?.value || '',
      besoins: {
        alimentaire: form.besoinAlimentaire?.checked || false,
        hygiene: form.besoinHygiene?.checked || false,
        medical: form.besoinMedical?.checked || false,
        vestimentaire: form.besoinVestimentaire?.checked || false,
        psychologique: form.besoinPsychologique?.checked || false,
        juridique: form.besoinJuridique?.checked || false,
        formation: form.besoinFormation?.checked || false
      }
    }
    
    try {
      await beneficiariesAPI.create(newBeneficiary)
      setShowAddModal(false)
      fetchBeneficiaries()
      fetchStats()
    } catch (error) {
      console.error('Erreur ajout:', error)
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── EDIT BENEFICIARY ───
  const handleEditBeneficiary = async (e) => {
    e.preventDefault()
    const form = e.target
    const updateData = {
      nom: form.nom.value,
      prenom: form.prenom.value,
      sexe: form.sexe.value,
      dateNaissance: form.dateNaissance.value || undefined,
      cin: form.cin?.value || '',
      telephone: form.telephone.value,
      adresseOrigine: form.adresseOrigine?.value || '',
      nationalite: form.nationalite?.value || 'Marocaine',
      lieuNaissance: form.lieuNaissance?.value || '',
      etatSante: form.etatSante?.value || '',
      entiteOrientatrice: form.entiteOrientatrice?.value || '',
      lieuIntervention: form.lieuIntervention?.value || '',
      situationFamiliale: form.situationFamiliale.value,
      nombreEnfants: parseInt(form.nombreEnfants.value) || 0,
      situationType: form.situationType.value,
      maBaadAlIwaa: form.maBaadAlIwaa?.value || '',
      professionAvant: form.professionAvant?.value || '',
      niveauEducation: form.niveauEducation?.value || 'aucun',
      statut: form.statut.value,
      motifEntree: form.motifEntree?.value || '',
      roomNumber: form.roomNumber?.value || '',
      bedNumber: form.bedNumber?.value || '',
      groupeSanguin: form.groupeSanguin?.value || '',
      allergies: form.allergies?.value || '',
      maladiesChroniques: form.maladiesChroniques?.value || '',
      traitementEnCours: form.traitementEnCours?.value || '',
      notes: form.notes?.value || '',
      besoins: {
        alimentaire: form.besoinAlimentaire?.checked || false,
        hygiene: form.besoinHygiene?.checked || false,
        medical: form.besoinMedical?.checked || false,
        vestimentaire: form.besoinVestimentaire?.checked || false,
        psychologique: form.besoinPsychologique?.checked || false,
        juridique: form.besoinJuridique?.checked || false,
        formation: form.besoinFormation?.checked || false
      }
    }

    if (form.statut.value === 'sorti' && form.dateSortie?.value) {
      updateData.dateSortie = form.dateSortie.value
      updateData.typeDepart = form.typeDepart?.value || null
    }
    
    try {
      await beneficiariesAPI.update(editBeneficiary._id, updateData)
      setShowEditModal(false)
      setEditBeneficiary(null)
      fetchBeneficiaries()
      fetchStats()
    } catch (error) {
      console.error('Erreur modification:', error)
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── VIEW DETAILS ───
  const handleViewDetails = async (beneficiary) => {
    try {
      const response = await beneficiariesAPI.getById(beneficiary._id)
      setSelectedBeneficiary(response.data?.data || beneficiary)
      setDistributions(response.data?.distributions || [])
      setDetailTab('info')
    } catch (error) {
      setSelectedBeneficiary(beneficiary)
      setDistributions([])
    }
  }

  // ─── IMPORT EXCEL ───
  const handleImportExcel = async (e) => {
    e.preventDefault()
    const fileInput = e.target.file
    if (!fileInput.files[0]) return
    
    setIsImporting(true)
    setImportResult(null)
    
    const formData = new FormData()
    formData.append('file', fileInput.files[0])
    
    try {
      const response = await beneficiariesAPI.importExcel(formData)
      setImportResult(response.data?.data || { imported: 0, errors: [] })
      fetchBeneficiaries()
      fetchStats()
    } catch (error) {
      setImportResult({ imported: 0, errors: [error.response?.data?.message || error.message], skipped: 0 })
    } finally {
      setIsImporting(false)
    }
  }

  // ─── DOWNLOAD TEMPLATE ───
  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const { saveAs } = await import('file-saver')

      const wb = new ExcelJS.Workbook()
      wb.creator = 'ADDEL ALWAREF'
      const ws = wb.addWorksheet('المستفيدين', { views: [{ rightToLeft: true }] })

      // Header row - matching screenshot style
      const headers = [
        'ر.ت', 'الاسم الكامل', 'تاريخ الازدياد', 'مكان الازدياد', 'العنوان',
        'الحالة الصحية', 'الجهة الموجهة', 'مكان التدخل', 'الحالة الاجتماعية',
        'ما بعد الايواء', 'تاريخ الايواء', 'تاريخ المغادرة', 'رقم البطاقة الوطنية'
      ]
      const headerRow = ws.addRow(headers)
      headerRow.height = 28
      headerRow.eachCell((cell, colNum) => {
        const isTeal = colNum % 2 === 0
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTeal ? 'FF008B8B' : 'FF2F4F4F' } }
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11, name: 'Arial' }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      })

      // Sample data rows matching real data
      const sampleData = [
        [1, 'عزيز مقبول', '13/01/1969', 'البيضاء', 'السعادة 303 ر 20 ر 68 ح/م', 'جيدة', 'السلطات المحلية', 'الى المحمدي', 'متشرد', 'نزيل بالمركز', '2020.03.31', '', 'BJ102114'],
        [2, 'عبد القادر ارجادي', '27/07/1960', 'البيضاء', 'كريان الرحلة زنقة 29 رقم 15 عين السبع', 'جيدة', 'السلطات المحلية', 'الى المحمدي', 'متشرد', 'مغادرة', '2020.03.31', '2022.06.01', 'JB82900'],
        [3, 'سام الادريسي', '1976', 'سطات', 'شارع الطاهر العلوي رقم', 'جيدة', 'السلطات المحلية', 'الصخور السوداء', 'متشرد + متسول', 'ادماج اسري', '2020.03.31', '2022.05.15', ''],
        [4, 'رشيد الحنجري', '10/11/1975', 'الجديدة', 'درب الحرية الزنقة 17 الرقم 29 عين السبع', 'إعاقة جسدية', 'السلطات المحلية', 'عين السبع', 'متشرد + متسول', 'فرار', '2020.03.31', '2020.06.027', '']
      ]

      sampleData.forEach((rowData, idx) => {
        const row = ws.addRow(rowData)
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.font = { size: 10, name: 'Arial' }
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } }
          }
        })
      })

      // Column widths matching screenshot
      ws.columns = [
        { width: 6 },   // ر.ت
        { width: 22 },  // الاسم الكامل
        { width: 16 },  // تاريخ الازدياد
        { width: 14 },  // مكان الازدياد
        { width: 40 },  // العنوان
        { width: 16 },  // الحالة الصحية
        { width: 20 },  // الجهة الموجهة
        { width: 20 },  // مكان التدخل
        { width: 20 },  // الحالة الاجتماعية
        { width: 18 },  // ما بعد الايواء
        { width: 14 },  // تاريخ الايواء
        { width: 14 },  // تاريخ المغادرة
        { width: 22 }   // رقم البطاقة الوطنية
      ]

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, 'modele_import_beneficiaires.xlsx')
    } catch (error) {
      alert('Erreur téléchargement: ' + error.message)
    }
  }

  // ─── ADD DISTRIBUTION ───
  const handleAddDistribution = async (e) => {
    e.preventDefault()
    const form = e.target
    const distData = {
      type: form.distType.value,
      items: [{
        nom: form.itemNom.value,
        quantite: parseInt(form.itemQuantite.value) || 1,
        unite: form.itemUnite?.value || 'unités'
      }],
      notes: form.distNotes?.value || ''
    }
    
    try {
      await beneficiariesAPI.addDistribution(selectedBeneficiary._id, distData)
      setShowDistributionModal(false)
      // Refresh distributions
      const response = await beneficiariesAPI.getDistributions(selectedBeneficiary._id)
      setDistributions(response.data?.data || [])
      fetchStats()
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── ADD SUIVI ───
  const handleAddSuivi = async (e) => {
    e.preventDefault()
    const form = e.target
    const data = {
      type: form.suiviType.value,
      description: form.suiviDescription.value
    }
    
    try {
      await beneficiariesAPI.addSuivi(selectedBeneficiary._id, data)
      setShowSuiviModal(false)
      // Refresh details
      handleViewDetails(selectedBeneficiary)
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── PHOTO UPLOAD ───
  const handlePhotoUpload = async (beneficiaryId, file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('La photo ne doit pas dépasser 2 Mo')
      return
    }
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const response = await beneficiariesAPI.uploadPhoto(beneficiaryId, formData)
      // Update local state
      const newPhoto = response.data?.data?.photo
      if (selectedBeneficiary?._id === beneficiaryId) {
        setSelectedBeneficiary(prev => ({ ...prev, photo: newPhoto }))
      }
      setBeneficiaries(prev => prev.map(b => b._id === beneficiaryId ? { ...b, photo: newPhoto } : b))
    } catch (error) {
      alert('Erreur upload photo: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeletePhoto = async (beneficiaryId) => {
    if (!window.confirm('Supprimer la photo de profil ?')) return
    try {
      await beneficiariesAPI.deletePhoto(beneficiaryId)
      if (selectedBeneficiary?._id === beneficiaryId) {
        setSelectedBeneficiary(prev => ({ ...prev, photo: null }))
      }
      setBeneficiaries(prev => prev.map(b => b._id === beneficiaryId ? { ...b, photo: null } : b))
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── FICHE PDF INDIVIDUELLE ───
  const handleExportBeneficiaryPDF = async (ben) => {
    try {
      // Build full HTML fiche with inline styles (Arabic-safe)
      const logoUrl = window.location.origin + '/images/logo.png'

      const row = (label, value) => `
        <tr>
          <td style="padding:5px 10px;font-weight:600;color:#475569;white-space:nowrap;width:35%;border-bottom:1px solid #f1f5f9;font-size:12px;">${label}</td>
          <td style="padding:5px 10px;color:#1e293b;border-bottom:1px solid #f1f5f9;font-size:12px;">${value || 'N/A'}</td>
        </tr>`

      const twoCol = (l1, v1, l2, v2) => `
        <tr>
          <td style="padding:5px 10px;font-weight:600;color:#475569;white-space:nowrap;width:18%;border-bottom:1px solid #f1f5f9;font-size:12px;">${l1}</td>
          <td style="padding:5px 10px;color:#1e293b;width:32%;border-bottom:1px solid #f1f5f9;font-size:12px;">${v1 || 'N/A'}</td>
          <td style="padding:5px 10px;font-weight:600;color:#475569;white-space:nowrap;width:18%;border-bottom:1px solid #f1f5f9;font-size:12px;">${l2}</td>
          <td style="padding:5px 10px;color:#1e293b;width:32%;border-bottom:1px solid #f1f5f9;font-size:12px;">${v2 || 'N/A'}</td>
        </tr>`

      const sectionTitle = (title) => `
        <tr><td colspan="4" style="padding:12px 10px 6px;font-size:14px;font-weight:700;color:#2563eb;border-bottom:2px solid #2563eb;background:#f0f5ff;">
          ${title}
        </td></tr>`

      const besoinsActifs = Object.entries(BESOINS_LABELS)
        .filter(([k]) => ben.besoins?.[k])
        .map(([, v]) => `<span style="display:inline-block;padding:3px 10px;margin:2px;background:#dbeafe;color:#1e40af;border-radius:12px;font-size:11px;">${v.icon} ${v.label}</span>`)
        .join('')

      const suiviHtml = (ben.suiviSocial?.length > 0) ? ben.suiviSocial.slice(-10).map(s => `
        <div style="margin:6px 0;padding:8px 12px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;">
          <div style="font-weight:600;color:#2563eb;font-size:11px;">${new Date(s.date).toLocaleDateString('fr-FR')} — ${s.type || 'entretien'}</div>
          <div style="color:#334155;font-size:11px;margin-top:3px;">${s.description || ''}</div>
        </div>`).join('') : '<p style="color:#94a3b8;font-size:12px;text-align:center;">Aucun suivi enregistré</p>'

      const htmlContent = `
        <div id="pdf-fiche" style="width:794px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#1e293b;padding:0;">
          <!-- HEADER -->
          <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:18px 30px;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:15px;">
              <img src="${logoUrl}" style="width:60px;height:60px;border-radius:12px;background:#fff;object-fit:contain;" crossorigin="anonymous" />
              <div>
                <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">ADDEL ALWAREF</div>
                <div style="color:#bfdbfe;font-size:13px;font-weight:500;">Fiche Individuelle du Bénéficiaire</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="color:#bfdbfe;font-size:11px;">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
            </div>
          </div>

          <!-- BODY -->
          <div style="padding:10px 30px 20px;">
            <table style="width:100%;border-collapse:collapse;">
              ${sectionTitle('📋 Informations personnelles / المعلومات الشخصية')}
              ${twoCol('Nom / الإسم', ben.nom, 'Prénom / اللقب', ben.prenom)}
              ${twoCol('Sexe', ben.sexe === 'femme' ? 'Femme' : 'Homme', 'Date de naissance', ben.dateNaissance ? new Date(ben.dateNaissance).toLocaleDateString('fr-FR') : 'N/A')}
              ${twoCol('Lieu de naissance / مكان الازدياد', ben.lieuNaissance, 'CIN / رقم البطاقة الوطنية', ben.cin)}
              ${twoCol('Téléphone', ben.telephone, 'Nationalité', ben.nationalite || 'Marocaine')}
              ${row('Adresse / العنوان', ben.adresseOrigine)}

              ${sectionTitle('🏠 Situation sociale / الحالة الاجتماعية')}
              ${twoCol('Situation familiale', SITUATION_LABELS[ben.situationFamiliale] || 'N/A', 'Nombre d\'enfants', ben.nombreEnfants || 0)}
              ${twoCol('الحالة الاجتماعية', SITUATION_TYPE_LABELS[ben.situationType] || 'N/A', 'Niveau d\'éducation', ben.niveauEducation?.replace('_', ' ') || 'N/A')}
              ${twoCol('Profession avant', ben.professionAvant, 'الحالة الصحية', ben.etatSante)}
              ${twoCol('الجهة الموجهة', ben.entiteOrientatrice, 'مكان التدخل', ben.lieuIntervention)}
              ${row('ما بعد الايواء', MA_BAAD_LABELS[ben.maBaadAlIwaa]?.label ? `${MA_BAAD_LABELS[ben.maBaadAlIwaa]?.icon || ''} ${MA_BAAD_LABELS[ben.maBaadAlIwaa]?.label}` : 'N/A')}

              ${sectionTitle('🛏️ Hébergement / الإيواء')}
              ${twoCol('Statut', STATUT_CONFIG[ben.statut]?.label || 'N/A', 'Motif d\'entrée', ben.motifEntree)}
              ${twoCol('تاريخ الايواء', ben.dateEntree ? new Date(ben.dateEntree).toLocaleDateString('fr-FR') : 'N/A', 'تاريخ المغادرة', ben.dateSortie ? new Date(ben.dateSortie).toLocaleDateString('fr-FR') : '-')}
              ${twoCol('Chambre', ben.roomNumber || '-', 'Lit', ben.bedNumber || '-')}
              ${ben.typeDepart ? row('Type de départ', ben.typeDepart) : ''}

              ${sectionTitle('🏥 Santé / الصحة')}
              ${twoCol('Groupe sanguin', ben.groupeSanguin || 'Non renseigné', 'Allergies', ben.allergies || 'Aucune')}
              ${twoCol('Maladies chroniques', ben.maladiesChroniques || 'Aucune', 'Traitement en cours', ben.traitementEnCours || 'Aucun')}

              ${sectionTitle('📦 Besoins identifiés / الاحتياجات')}
              <tr><td colspan="4" style="padding:8px 10px;">
                ${besoinsActifs || '<span style="color:#94a3b8;font-size:12px;">Aucun besoin identifié</span>'}
              </td></tr>

              ${ben.notes ? `
                ${sectionTitle('📝 Notes')}
                <tr><td colspan="4" style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.6;">
                  ${ben.notes}
                </td></tr>
              ` : ''}

              ${ben.suiviSocial?.length > 0 ? `
                ${sectionTitle('📋 Suivi social / المتابعة الاجتماعية')}
                <tr><td colspan="4" style="padding:8px 10px;">
                  ${suiviHtml}
                </td></tr>
              ` : ''}
            </table>
          </div>

          <!-- FOOTER -->
          <div style="background:#f8fafc;padding:10px 30px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
            <span>جمعية عدل الوارف ADDEL ALWAREF — Fiche individuelle — ${ben.prenom} ${ben.nom}</span>
            <span>${new Date().toLocaleString('fr-FR')}</span>
          </div>
        </div>`

      // Create off-screen container, render to canvas, then PDF
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.innerHTML = htmlContent
      document.body.appendChild(container)

      const ficheEl = container.querySelector('#pdf-fiche')

      // Wait for images to load
      const imgs = ficheEl.querySelectorAll('img')
      await Promise.all([...imgs].map(img => new Promise(resolve => {
        if (img.complete) return resolve()
        img.onload = resolve
        img.onerror = resolve
      })))

      const canvas = await html2canvas(ficheEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`fiche_${ben.prenom}_${ben.nom}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF error:', error)
      alert('Erreur génération PDF: ' + error.message)
    }
  }

  // ─── DELETE ───
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bénéficiaire ? Cette action est irréversible.')) return
    try {
      await beneficiariesAPI.delete(id)
      fetchBeneficiaries()
      fetchStats()
      if (selectedBeneficiary?._id === id) setSelectedBeneficiary(null)
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message))
    }
  }

  // ─── EXCEL EXPORT ───
  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const { saveAs } = await import('file-saver')
      
      const wb = new ExcelJS.Workbook()
      wb.creator = 'ADDEL ALWAREF'
      const ws = wb.addWorksheet('المستفيدين', { views: [{ rightToLeft: true }] })

      // Header row - matching real data columns exactly
      const headers = [
        'ر.ت', 'الاسم الكامل', 'تاريخ الازدياد', 'مكان الازدياد', 'العنوان',
        'الحالة الصحية', 'الجهة الموجهة', 'مكان التدخل', 'الحالة الاجتماعية',
        'ما بعد الايواء', 'تاريخ الايواء', 'تاريخ المغادرة', 'رقم البطاقة الوطنية'
      ]
      const headerRow = ws.addRow(headers)
      headerRow.height = 28
      headerRow.eachCell((cell, colNum) => {
        // Alternate teal/dark blue like the screenshot
        const isTeal = colNum % 2 === 0
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTeal ? 'FF008B8B' : 'FF2F4F4F' } }
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11, name: 'Arial' }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      })

      const dataToExport = filterStatut === 'all' ? beneficiaries : filteredBeneficiaries
      dataToExport.forEach((b, idx) => {
        const row = ws.addRow([
          b.numeroOrdre || (idx + 1),
          `${b.prenom || ''} ${b.nom || ''}`.trim(),
          b.dateNaissance ? new Date(b.dateNaissance).toLocaleDateString('fr-FR') : '',
          b.lieuNaissance || '',
          b.adresseOrigine || '',
          b.etatSante || '',
          b.entiteOrientatrice || '',
          b.lieuIntervention || '',
          SITUATION_TYPE_LABELS[b.situationType] || '',
          MA_BAAD_LABELS[b.maBaadAlIwaa]?.label || '',
          b.dateEntree ? new Date(b.dateEntree).toLocaleDateString('fr-FR') : '',
          b.dateSortie ? new Date(b.dateSortie).toLocaleDateString('fr-FR') : '',
          b.cin || ''
        ])
        row.eachCell((cell, colNum) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.font = { size: 10, name: 'Arial' }
          // Alternate row colors
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } }
          }
        })
      })

      // Set column widths to match screenshot proportions
      ws.columns = [
        { width: 6 },   // ر.ت
        { width: 22 },  // الاسم الكامل
        { width: 16 },  // تاريخ الازدياد
        { width: 14 },  // مكان الازدياد
        { width: 40 },  // العنوان
        { width: 16 },  // الحالة الصحية
        { width: 20 },  // الجهة الموجهة
        { width: 20 },  // مكان التدخل
        { width: 20 },  // الحالة الاجتماعية
        { width: 18 },  // ما بعد الايواء
        { width: 14 },  // تاريخ الايواء
        { width: 14 },  // تاريخ المغادرة
        { width: 22 }   // رقم البطاقة الوطنية
      ]

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `beneficiaires_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      alert('Erreur export: ' + error.message)
    }
  }

  // ─── PRINT ───
  const handlePrint = () => {
    const dataToExport = filterStatut === 'all' ? beneficiaries : filteredBeneficiaries
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Liste des Bénéficiaires - ADDEL ALWAREF</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
        .header h1 { color: #2563eb; margin: 5px 0; }
        .header p { color: #666; }
        .stats-row { display: flex; gap: 15px; margin-bottom: 20px; justify-content: center; }
        .stat-box { padding: 10px 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-box .number { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-box .label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px; }
        th { background: #2563eb; color: white; padding: 6px 4px; text-align: center; }
        td { padding: 5px 4px; border-bottom: 1px solid #e5e7eb; text-align: center; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .badge-nazil { background: #dcfce7; color: #16a34a; }
        .badge-mughAdara { background: #e0e7ff; color: #6366f1; }
        .badge-idmaj { background: #dbeafe; color: #2563eb; }
        .badge-firAr { background: #fef3c7; color: #b45309; }
        .badge-tard { background: #fee2e2; color: #dc2626; }
        .badge-wafat { background: #f3f4f6; color: #374151; }
        .situation-mutasharrid { background: #fef9c3; color: #854d0e; }
        .situation-mutasharrid_mutasawwil { background: #fed7aa; color: #c2410c; }
        .situation-tasawwul { background: #e0e7ff; color: #4338ca; }
        .situation-tasharrud { background: #dcfce7; color: #15803d; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { margin: 5px; } table { font-size: 9px; } }
      </style></head><body>
      <div class="header">
        <h1>جمعية عدل الوارف</h1>
        <h2>ADDEL ALWAREF</h2>
        <p>التاريخ: ${new Date().toLocaleDateString('fr-FR')} | المجموع: ${dataToExport.length} مستفيد</p>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="number">${stats?.heberge || 0}</div><div class="label">نزيل بالمركز</div></div>
        <div class="stat-box"><div class="number">${stats?.enSuivi || 0}</div><div class="label">في المتابعة</div></div>
        <div class="stat-box"><div class="number">${stats?.sorti || 0}</div><div class="label">مغادرة</div></div>
        <div class="stat-box"><div class="number">${stats?.nouveauxCeMois || 0}</div><div class="label">جدد هذا الشهر</div></div>
      </div>
      <table>
        <thead><tr>
          <th>ر.ت</th><th>الاسم الكامل</th><th>تاريخ الازدياد</th><th>مكان الازدياد</th>
          <th>العنوان</th><th>الحالة الصحية</th><th>الجهة الموجهة</th><th>مكان التدخل</th>
          <th>الحالة الاجتماعية</th><th>ما بعد الايواء</th><th>تاريخ الايواء</th>
          <th>تاريخ المغادرة</th><th>رقم البطاقة الوطنية</th>
        </tr></thead>
        <tbody>
          ${dataToExport.map((b, i) => `<tr>
            <td>${i + 1}</td>
            <td>${b.prenom || ''} ${b.nom || ''}</td>
            <td>${b.dateNaissance ? new Date(b.dateNaissance).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${b.lieuNaissance || '-'}</td>
            <td>${b.adresseOrigine || '-'}</td>
            <td>${b.etatSante || '-'}</td>
            <td>${b.entiteOrientatrice || '-'}</td>
            <td>${b.lieuIntervention || '-'}</td>
            <td><span class="badge situation-${b.situationType || 'autre'}">${SITUATION_TYPE_LABELS[b.situationType] || '-'}</span></td>
            <td><span class="badge badge-${b.maBaadAlIwaa || ''}">${MA_BAAD_LABELS[b.maBaadAlIwaa]?.label || '-'}</span></td>
            <td>${b.dateEntree ? new Date(b.dateEntree).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${b.dateSortie ? new Date(b.dateSortie).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${b.cin || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">جمعية عدل الوارف ADDEL ALWAREF - ${new Date().toLocaleString('fr-FR')}</div>
      </body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  if (!user) return null

  const statCounts = {
    all: beneficiaries.length,
    heberge: beneficiaries.filter(b => b.statut === 'heberge').length,
    en_suivi: beneficiaries.filter(b => b.statut === 'en_suivi').length,
    sorti: beneficiaries.filter(b => b.statut === 'sorti').length,
    transfere: beneficiaries.filter(b => b.statut === 'transfere').length
  }

  return (
    <div className="professional-dashboard">
      <ProfessionalSidebar user={user} onLogout={handleLogout} />

      <main className="dashboard-main">
        {/* Header */}
        <header className="page-header">
          <div>
            <h1>👥 Gestion des Bénéficiaires</h1>
            <p>Gestion sociale complète des bénéficiaires de l'association</p>
          </div>
          <div className="header-actions">
            <button onClick={handleDownloadTemplate} className="btn-outline" title="Télécharger modèle vide">📄 Modèle</button>
            <button onClick={handlePrint} className="btn-outline" title="Imprimer">🖨️ Imprimer</button>
            <button onClick={handleExportExcel} className="btn-outline" title="Exporter Excel">📊 Excel</button>
            <button onClick={() => setShowImportModal(true)} className="btn-outline" title="Importer Excel">📥 Importer</button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">➕ Nouveau</button>
          </div>
        </header>

        {/* Stats Cards */}
        {stats && (
          <div className="ben-stats-row">
            <div className="ben-stat-card stat-total">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="ben-stat-card stat-heberge">
              <div className="stat-icon">🏠</div>
              <div className="stat-info">
                <div className="stat-number">{stats.heberge}</div>
                <div className="stat-label">Hébergés</div>
              </div>
            </div>
            <div className="ben-stat-card stat-suivi">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <div className="stat-number">{stats.enSuivi}</div>
                <div className="stat-label">En suivi</div>
              </div>
            </div>
            <div className="ben-stat-card stat-new">
              <div className="stat-icon">🆕</div>
              <div className="stat-info">
                <div className="stat-number">{stats.nouveauxCeMois}</div>
                <div className="stat-label">Nouveaux ce mois</div>
              </div>
            </div>
            <div className="ben-stat-card stat-dist">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <div className="stat-number">{stats.distributionsCeMois || 0}</div>
                <div className="stat-label">Distributions</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, CIN ou téléphone..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-buttons">
            {['all', 'heberge', 'en_suivi', 'sorti', 'transfere'].map(s => (
              <button
                key={s}
                className={`filter-btn ${filterStatut === s ? 'active' : ''}`}
                onClick={() => setFilterStatut(s)}
              >
                {s === 'all' ? 'Tous' : STATUT_CONFIG[s]?.label} ({statCounts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="content-card">
          {isLoading ? (
            <div className="loading-state"><div className="spinner"></div><p>Chargement...</p></div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ر.ت</th>
                    <th>الاسم الكامل</th>
                    <th>تاريخ الازدياد</th>
                    <th>مكان الازدياد</th>
                    <th>العنوان</th>
                    <th>الحالة الصحية</th>
                    <th>الجهة الموجهة</th>
                    <th>مكان التدخل</th>
                    <th>الحالة الاجتماعية</th>
                    <th>ما بعد الايواء</th>
                    <th>تاريخ الايواء</th>
                    <th>تاريخ المغادرة</th>
                    <th>رقم البطاقة الوطنية</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeneficiaries.map((b, idx) => (
                    <tr key={b._id}>
                      <td>{b.numeroOrdre || (idx + 1)}</td>
                      <td>
                        <div className="beneficiary-name">
                          <div className={`beneficiary-avatar ${b.sexe === 'femme' ? 'avatar-femme' : ''} ${b.photo ? 'has-photo' : ''}`}>
                            {b.photo ? (
                              <img src={b.photo} alt={`${b.prenom}`} className="avatar-photo" />
                            ) : (
                              b.sexe === 'femme' ? '👩' : '👨'
                            )}
                          </div>
                          <div>
                            <div className="name-primary">{b.prenom} {b.nom}</div>
                          </div>
                        </div>
                      </td>
                      <td>{b.dateNaissance ? new Date(b.dateNaissance).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>{b.lieuNaissance || '-'}</td>
                      <td>{b.adresseOrigine || '-'}</td>
                      <td>{b.etatSante || '-'}</td>
                      <td>{b.entiteOrientatrice || '-'}</td>
                      <td>{b.lieuIntervention || '-'}</td>
                      <td>
                        <span className={`badge badge-situation-${b.situationType || 'autre'}`}>
                          {SITUATION_TYPE_LABELS[b.situationType] || '-'}
                        </span>
                      </td>
                      <td>
                        {b.maBaadAlIwaa ? (
                          <span className={`badge ${MA_BAAD_LABELS[b.maBaadAlIwaa]?.class || ''}`}>
                            {MA_BAAD_LABELS[b.maBaadAlIwaa]?.icon} {MA_BAAD_LABELS[b.maBaadAlIwaa]?.label}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{b.dateEntree ? new Date(b.dateEntree).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>{b.dateSortie ? new Date(b.dateSortie).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>{b.cin || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => handleViewDetails(b)} title="Détails">👁️</button>
                          <button className="btn-icon" onClick={() => handleExportBeneficiaryPDF(b)} title="Fiche PDF">📄</button>
                          <button className="btn-icon" onClick={() => { setEditBeneficiary(b); setShowEditModal(true) }} title="Modifier">✏️</button>
                          <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(b._id)} title="Supprimer">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBeneficiaries.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <h3>Aucun bénéficiaire trouvé</h3>
                  <p>Essayez de modifier vos critères de recherche</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ═══ ADD MODAL ═══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nouveau bénéficiaire</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddBeneficiary}>
              <div className="form-grid">
                {/* Section: Info personnelles */}
                <div className="form-section-title full-width">📋 Informations personnelles</div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="nom" required />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="prenom" required />
                </div>
                <div className="form-group">
                  <label>Sexe *</label>
                  <select name="sexe" required>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input type="date" name="dateNaissance" />
                </div>
                <div className="form-group">
                  <label>CIN</label>
                  <input type="text" name="cin" />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" name="telephone" />
                </div>
                <div className="form-group">
                  <label>العنوان / Adresse</label>
                  <input type="text" name="adresseOrigine" />
                </div>
                <div className="form-group">
                  <label>مكان الازدياد / Lieu de naissance</label>
                  <input type="text" name="lieuNaissance" />
                </div>
                <div className="form-group">
                  <label>Nationalité</label>
                  <input type="text" name="nationalite" defaultValue="Marocaine" />
                </div>

                {/* Section: الحالة الاجتماعية */}
                <div className="form-section-title full-width">🏠 الحالة الاجتماعية و ما بعد الايواء</div>
                <div className="form-group">
                  <label>الحالة الاجتماعية *</label>
                  <select name="situationType" required>
                    {Object.entries(SITUATION_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ما بعد الايواء</label>
                  <select name="maBaadAlIwaa">
                    {Object.entries(MA_BAAD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>الحالة الصحية</label>
                  <input type="text" name="etatSante" placeholder="سليم، مرض مزمن..." />
                </div>
                <div className="form-group">
                  <label>الجهة الموجهة</label>
                  <input type="text" name="entiteOrientatrice" placeholder="الشرطة، جمعية..." />
                </div>
                <div className="form-group">
                  <label>مكان التدخل</label>
                  <input type="text" name="lieuIntervention" placeholder="وسط المدينة..." />
                </div>
                <div className="form-group">
                  <label>Situation familiale</label>
                  <select name="situationFamiliale">
                    {Object.entries(SITUATION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre d'enfants</label>
                  <input type="number" name="nombreEnfants" defaultValue="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Niveau d'éducation</label>
                  <select name="niveauEducation">
                    <option value="aucun">Aucun</option>
                    <option value="primaire">Primaire</option>
                    <option value="secondaire">Secondaire</option>
                    <option value="universitaire">Universitaire</option>
                    <option value="formation_professionnelle">Formation professionnelle</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Profession avant</label>
                  <input type="text" name="professionAvant" />
                </div>
                <div className="form-group">
                  <label>Motif d'entrée</label>
                  <input type="text" name="motifEntree" />
                </div>

                {/* Section: Hébergement */}
                <div className="form-section-title full-width">🛏️ Hébergement</div>
                <div className="form-group">
                  <label>Chambre</label>
                  <input type="text" name="roomNumber" />
                </div>
                <div className="form-group">
                  <label>Lit</label>
                  <input type="text" name="bedNumber" />
                </div>

                {/* Section: Santé */}
                <div className="form-section-title full-width">🏥 Santé</div>
                <div className="form-group">
                  <label>Groupe sanguin</label>
                  <select name="groupeSanguin">
                    <option value="">Non renseigné</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Allergies</label>
                  <input type="text" name="allergies" />
                </div>
                <div className="form-group full-width">
                  <label>Maladies chroniques</label>
                  <input type="text" name="maladiesChroniques" />
                </div>

                {/* Section: Besoins */}
                <div className="form-section-title full-width">📦 Besoins</div>
                <div className="form-group full-width">
                  <div className="besoins-checkboxes">
                    {Object.entries(BESOINS_LABELS).map(([k, v]) => (
                      <label key={k} className="checkbox-label">
                        <input type="checkbox" name={`besoin${k.charAt(0).toUpperCase() + k.slice(1)}`} />
                        <span>{v.icon} {v.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" rows="3"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {showEditModal && editBeneficiary && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditBeneficiary(null) }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Modifier {editBeneficiary.prenom} {editBeneficiary.nom}</h2>
              <button className="btn-close" onClick={() => { setShowEditModal(false); setEditBeneficiary(null) }}>✕</button>
            </div>
            <form onSubmit={handleEditBeneficiary}>
              <div className="form-grid">
                <div className="form-section-title full-width">📋 Informations personnelles</div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="nom" defaultValue={editBeneficiary.nom} required />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="prenom" defaultValue={editBeneficiary.prenom} required />
                </div>
                <div className="form-group">
                  <label>Sexe *</label>
                  <select name="sexe" defaultValue={editBeneficiary.sexe || 'homme'} required>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input type="date" name="dateNaissance" defaultValue={editBeneficiary.dateNaissance ? new Date(editBeneficiary.dateNaissance).toISOString().split('T')[0] : ''} />
                </div>
                <div className="form-group">
                  <label>CIN</label>
                  <input type="text" name="cin" defaultValue={editBeneficiary.cin || ''} />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" name="telephone" defaultValue={editBeneficiary.telephone || ''} />
                </div>
                <div className="form-group">
                  <label>العنوان / Adresse</label>
                  <input type="text" name="adresseOrigine" defaultValue={editBeneficiary.adresseOrigine || ''} />
                </div>
                <div className="form-group">
                  <label>مكان الازدياد / Lieu de naissance</label>
                  <input type="text" name="lieuNaissance" defaultValue={editBeneficiary.lieuNaissance || ''} />
                </div>
                <div className="form-group">
                  <label>Nationalité</label>
                  <input type="text" name="nationalite" defaultValue={editBeneficiary.nationalite || 'Marocaine'} />
                </div>

                <div className="form-section-title full-width">🏠 الحالة الاجتماعية و ما بعد الايواء</div>
                <div className="form-group">
                  <label>الحالة الاجتماعية *</label>
                  <select name="situationType" defaultValue={editBeneficiary.situationType || 'mutasharrid'} required>
                    {Object.entries(SITUATION_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ما بعد الايواء</label>
                  <select name="maBaadAlIwaa" defaultValue={editBeneficiary.maBaadAlIwaa || ''}>
                    <option value="">--</option>
                    {Object.entries(MA_BAAD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>الحالة الصحية</label>
                  <input type="text" name="etatSante" defaultValue={editBeneficiary.etatSante || ''} />
                </div>
                <div className="form-group">
                  <label>الجهة الموجهة</label>
                  <input type="text" name="entiteOrientatrice" defaultValue={editBeneficiary.entiteOrientatrice || ''} />
                </div>
                <div className="form-group">
                  <label>مكان التدخل</label>
                  <input type="text" name="lieuIntervention" defaultValue={editBeneficiary.lieuIntervention || ''} />
                </div>
                <div className="form-group">
                  <label>Situation familiale</label>
                  <select name="situationFamiliale" defaultValue={editBeneficiary.situationFamiliale}>
                    {Object.entries(SITUATION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre d'enfants</label>
                  <input type="number" name="nombreEnfants" defaultValue={editBeneficiary.nombreEnfants || 0} min="0" />
                </div>
                <div className="form-group">
                  <label>Niveau d'éducation</label>
                  <select name="niveauEducation" defaultValue={editBeneficiary.niveauEducation || 'aucun'}>
                    <option value="aucun">Aucun</option>
                    <option value="primaire">Primaire</option>
                    <option value="secondaire">Secondaire</option>
                    <option value="universitaire">Universitaire</option>
                    <option value="formation_professionnelle">Formation professionnelle</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Profession avant</label>
                  <input type="text" name="professionAvant" defaultValue={editBeneficiary.professionAvant || ''} />
                </div>
                <div className="form-group">
                  <label>Motif d'entrée</label>
                  <input type="text" name="motifEntree" defaultValue={editBeneficiary.motifEntree || ''} />
                </div>

                <div className="form-section-title full-width">📌 Statut & Hébergement</div>
                <div className="form-group">
                  <label>Statut *</label>
                  <select name="statut" defaultValue={editBeneficiary.statut} required>
                    {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date de sortie</label>
                  <input type="date" name="dateSortie" defaultValue={editBeneficiary.dateSortie ? new Date(editBeneficiary.dateSortie).toISOString().split('T')[0] : ''} />
                </div>
                <div className="form-group">
                  <label>Type de départ</label>
                  <select name="typeDepart" defaultValue={editBeneficiary.typeDepart || ''}>
                    <option value="">--</option>
                    <option value="réinsertion">Réinsertion</option>
                    <option value="abandon">Abandon</option>
                    <option value="transfert">Transfert</option>
                    <option value="décès">Décès</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Chambre</label>
                  <input type="text" name="roomNumber" defaultValue={editBeneficiary.roomNumber || ''} />
                </div>
                <div className="form-group">
                  <label>Lit</label>
                  <input type="text" name="bedNumber" defaultValue={editBeneficiary.bedNumber || ''} />
                </div>

                <div className="form-section-title full-width">🏥 Santé</div>
                <div className="form-group">
                  <label>Groupe sanguin</label>
                  <select name="groupeSanguin" defaultValue={editBeneficiary.groupeSanguin || ''}>
                    <option value="">Non renseigné</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Allergies</label>
                  <input type="text" name="allergies" defaultValue={editBeneficiary.allergies || ''} />
                </div>
                <div className="form-group">
                  <label>Maladies chroniques</label>
                  <input type="text" name="maladiesChroniques" defaultValue={editBeneficiary.maladiesChroniques || ''} />
                </div>
                <div className="form-group">
                  <label>Traitement en cours</label>
                  <input type="text" name="traitementEnCours" defaultValue={editBeneficiary.traitementEnCours || ''} />
                </div>

                <div className="form-section-title full-width">📦 Besoins</div>
                <div className="form-group full-width">
                  <div className="besoins-checkboxes">
                    {Object.entries(BESOINS_LABELS).map(([k, v]) => (
                      <label key={k} className="checkbox-label">
                        <input type="checkbox" name={`besoin${k.charAt(0).toUpperCase() + k.slice(1)}`}
                          defaultChecked={editBeneficiary.besoins?.[k] || false} />
                        <span>{v.icon} {v.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" rows="3" defaultValue={editBeneficiary.notes || ''}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setEditBeneficiary(null) }}>Annuler</button>
                <button type="submit" className="btn-primary">💾 Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DETAILS MODAL ═══ */}
      {selectedBeneficiary && (
        <div className="modal-overlay" onClick={() => setSelectedBeneficiary(null)}>
          <div className="modal-content xlarge" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="detail-header-info">
                <div className={`detail-avatar ${selectedBeneficiary.sexe === 'femme' ? 'avatar-femme' : ''} ${selectedBeneficiary.photo ? 'has-photo' : ''}`}>
                  {selectedBeneficiary.photo ? (
                    <img src={selectedBeneficiary.photo} alt={`${selectedBeneficiary.prenom}`} className="detail-avatar-photo" />
                  ) : (
                    selectedBeneficiary.sexe === 'femme' ? '👩' : '👨'
                  )}
                  <label className="photo-upload-overlay" title="Changer la photo">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePhotoUpload(selectedBeneficiary._id, e.target.files[0])}
                    />
                    📷
                  </label>
                </div>
                <div>
                  <h2>{selectedBeneficiary.prenom} {selectedBeneficiary.nom}</h2>
                  <span className={`badge ${STATUT_CONFIG[selectedBeneficiary.statut]?.class || ''}`}>
                    {STATUT_CONFIG[selectedBeneficiary.statut]?.icon} {STATUT_CONFIG[selectedBeneficiary.statut]?.label}
                  </span>
                  {selectedBeneficiary.photo && (
                    <button className="btn-icon btn-icon-sm btn-remove-photo" onClick={() => handleDeletePhoto(selectedBeneficiary._id)} title="Supprimer la photo">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedBeneficiary(null)}>✕</button>
            </div>

            {/* Detail Tabs */}
            <div className="detail-tabs">
              <button className={`detail-tab ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>
                📋 Informations
              </button>
              <button className={`detail-tab ${detailTab === 'besoins' ? 'active' : ''}`} onClick={() => setDetailTab('besoins')}>
                📦 Besoins & Santé
              </button>
              <button className={`detail-tab ${detailTab === 'distributions' ? 'active' : ''}`} onClick={() => setDetailTab('distributions')}>
                🚚 Distributions ({distributions.length})
              </button>
              <button className={`detail-tab ${detailTab === 'suivi' ? 'active' : ''}`} onClick={() => setDetailTab('suivi')}>
                📝 Suivi social ({selectedBeneficiary.suiviSocial?.length || 0})
              </button>
            </div>

            <div className="details-content">
              {/* Tab: Info */}
              {detailTab === 'info' && (
                <>
                  <div className="details-section">
                    <h3>👤 Informations personnelles</h3>
                    <div className="details-grid">
                      <div className="detail-item"><label>الاسم الكامل</label><p>{selectedBeneficiary.prenom} {selectedBeneficiary.nom}</p></div>
                      <div className="detail-item"><label>Sexe</label><p>{selectedBeneficiary.sexe === 'femme' ? 'Femme' : 'Homme'}</p></div>
                      <div className="detail-item"><label>تاريخ الازدياد</label><p>{selectedBeneficiary.dateNaissance ? new Date(selectedBeneficiary.dateNaissance).toLocaleDateString('fr-FR') : 'N/A'}</p></div>
                      <div className="detail-item"><label>مكان الازدياد</label><p>{selectedBeneficiary.lieuNaissance || 'N/A'}</p></div>
                      <div className="detail-item"><label>رقم البطاقة الوطنية</label><p>{selectedBeneficiary.cin || 'N/A'}</p></div>
                      <div className="detail-item"><label>Téléphone</label><p>{selectedBeneficiary.telephone || 'N/A'}</p></div>
                      <div className="detail-item"><label>العنوان</label><p>{selectedBeneficiary.adresseOrigine || 'N/A'}</p></div>
                      <div className="detail-item"><label>Nationalité</label><p>{selectedBeneficiary.nationalite || 'Marocaine'}</p></div>
                    </div>
                  </div>
                  <div className="details-section">
                    <h3>🏠 الحالة الاجتماعية و ما بعد الايواء</h3>
                    <div className="details-grid">
                      <div className="detail-item"><label>الحالة الاجتماعية</label><p>{SITUATION_TYPE_LABELS[selectedBeneficiary.situationType] || 'N/A'}</p></div>
                      <div className="detail-item">
                        <label>ما بعد الايواء</label>
                        <p>
                          {selectedBeneficiary.maBaadAlIwaa ? (
                            <span className={`badge ${MA_BAAD_LABELS[selectedBeneficiary.maBaadAlIwaa]?.class || ''}`}>
                              {MA_BAAD_LABELS[selectedBeneficiary.maBaadAlIwaa]?.icon} {MA_BAAD_LABELS[selectedBeneficiary.maBaadAlIwaa]?.label}
                            </span>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <div className="detail-item"><label>الحالة الصحية</label><p>{selectedBeneficiary.etatSante || 'N/A'}</p></div>
                      <div className="detail-item"><label>الجهة الموجهة</label><p>{selectedBeneficiary.entiteOrientatrice || 'N/A'}</p></div>
                      <div className="detail-item"><label>مكان التدخل</label><p>{selectedBeneficiary.lieuIntervention || 'N/A'}</p></div>
                      <div className="detail-item"><label>Situation familiale</label><p>{SITUATION_LABELS[selectedBeneficiary.situationFamiliale] || 'N/A'}</p></div>
                      <div className="detail-item"><label>Nombre d'enfants</label><p>{selectedBeneficiary.nombreEnfants || 0}</p></div>
                      <div className="detail-item"><label>Niveau d'éducation</label><p>{selectedBeneficiary.niveauEducation?.replace('_', ' ') || 'N/A'}</p></div>
                      <div className="detail-item"><label>Profession avant</label><p>{selectedBeneficiary.professionAvant || 'N/A'}</p></div>
                      <div className="detail-item"><label>Motif d'entrée</label><p>{selectedBeneficiary.motifEntree || 'N/A'}</p></div>
                    </div>
                  </div>
                  <div className="details-section">
                    <h3>🛏️ Hébergement</h3>
                    <div className="details-grid">
                      <div className="detail-item"><label>تاريخ الايواء</label><p>{new Date(selectedBeneficiary.dateEntree).toLocaleDateString('fr-FR')}</p></div>
                      {selectedBeneficiary.dateSortie && <div className="detail-item"><label>تاريخ المغادرة</label><p>{new Date(selectedBeneficiary.dateSortie).toLocaleDateString('fr-FR')}</p></div>}
                      <div className="detail-item"><label>Chambre / Lit</label><p>{selectedBeneficiary.roomNumber || '-'} / {selectedBeneficiary.bedNumber || '-'}</p></div>
                      {selectedBeneficiary.typeDepart && <div className="detail-item"><label>Type de départ</label><p>{selectedBeneficiary.typeDepart}</p></div>}
                    </div>
                  </div>
                  {selectedBeneficiary.notes && (
                    <div className="details-section">
                      <h3>📝 Notes</h3>
                      <p className="notes-text">{selectedBeneficiary.notes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Tab: Besoins & Santé */}
              {detailTab === 'besoins' && (
                <>
                  <div className="details-section">
                    <h3>📦 Besoins identifiés</h3>
                    <div className="besoins-grid">
                      {Object.entries(BESOINS_LABELS).map(([k, v]) => (
                        <div key={k} className={`besoin-card ${selectedBeneficiary.besoins?.[k] ? 'active' : ''}`}>
                          <span className="besoin-card-icon">{v.icon}</span>
                          <span className="besoin-card-label">{v.label}</span>
                          <span className={`besoin-status ${selectedBeneficiary.besoins?.[k] ? 'oui' : 'non'}`}>
                            {selectedBeneficiary.besoins?.[k] ? '✅ Oui' : '❌ Non'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="details-section">
                    <h3>🏥 Informations médicales</h3>
                    <div className="details-grid">
                      <div className="detail-item"><label>Groupe sanguin</label><p>{selectedBeneficiary.groupeSanguin || 'Non renseigné'}</p></div>
                      <div className="detail-item"><label>Allergies</label><p>{selectedBeneficiary.allergies || 'Aucune'}</p></div>
                      <div className="detail-item"><label>Maladies chroniques</label><p>{selectedBeneficiary.maladiesChroniques || 'Aucune'}</p></div>
                      <div className="detail-item"><label>Traitement en cours</label><p>{selectedBeneficiary.traitementEnCours || 'Aucun'}</p></div>
                    </div>
                  </div>
                </>
              )}

              {/* Tab: Distributions */}
              {detailTab === 'distributions' && (
                <div className="details-section">
                  <div className="section-header-flex">
                    <h3>🚚 Historique des distributions</h3>
                    <button className="btn-primary btn-sm" onClick={() => setShowDistributionModal(true)}>
                      ➕ Nouvelle distribution
                    </button>
                  </div>
                  {distributions.length > 0 ? (
                    <div className="distributions-timeline">
                      {distributions.map((d, i) => (
                        <div key={d._id || i} className="dist-timeline-item">
                          <div className="dist-timeline-dot"></div>
                          <div className="dist-timeline-content">
                            <div className="dist-timeline-header">
                              <span className={`dist-type-badge dist-type-${d.type}`}>
                                {d.type === 'alimentaire' ? '🍽️' : d.type === 'hygiene' ? '🧼' : d.type === 'vestimentaire' ? '👕' : d.type === 'medical' ? '💊' : '📦'}
                                {' '}{d.type}
                              </span>
                              <span className="dist-date">{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="dist-items">
                              {d.items?.map((item, j) => (
                                <span key={j} className="dist-item-tag">
                                  {item.nom} × {item.quantite} {item.unite || ''}
                                </span>
                              ))}
                            </div>
                            {d.notes && <p className="dist-notes">{d.notes}</p>}
                            <div className="dist-by">Par: {d.distributedBy?.prenom} {d.distributedBy?.nom}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <p>Aucune distribution enregistrée</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Suivi Social */}
              {detailTab === 'suivi' && (
                <div className="details-section">
                  <div className="section-header-flex">
                    <h3>📝 Suivi social</h3>
                    <button className="btn-primary btn-sm" onClick={() => setShowSuiviModal(true)}>
                      ➕ Ajouter un suivi
                    </button>
                  </div>
                  {selectedBeneficiary.suiviSocial?.length > 0 ? (
                    <div className="suivi-timeline">
                      {[...selectedBeneficiary.suiviSocial].reverse().map((s, i) => (
                        <div key={i} className="suivi-item">
                          <div className="suivi-date">{new Date(s.date).toLocaleDateString('fr-FR')}</div>
                          <div className="suivi-type-badge">{s.type || 'entretien'}</div>
                          <div className="suivi-desc">{s.description}</div>
                          {s.responsable && <div className="suivi-by">Par: {s.responsable?.prenom} {s.responsable?.nom}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <p>Aucun suivi enregistré</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedBeneficiary(null)}>Fermer</button>
              <button className="btn-outline" onClick={() => handleExportBeneficiaryPDF(selectedBeneficiary)}>
                📄 Fiche PDF
              </button>
              <button className="btn-primary" onClick={() => { setEditBeneficiary(selectedBeneficiary); setShowEditModal(true); setSelectedBeneficiary(null) }}>
                ✏️ Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT MODAL ═══ */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportResult(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Importer des bénéficiaires</h2>
              <button className="btn-close" onClick={() => { setShowImportModal(false); setImportResult(null) }}>✕</button>
            </div>
            <div className="import-content">
              <div className="import-info">
                <h4>📋 الأعمدة المطلوبة</h4>
                <p>يجب أن يحتوي ملف Excel على الأعمدة التالية: <strong>ر.ت، الاسم الكامل، تاريخ الازدياد، مكان الازدياد، العنوان، الحالة الصحية، الجهة الموجهة، مكان التدخل، الحالة الاجتماعية، ما بعد الايواء، تاريخ الايواء، تاريخ المغادرة، رقم البطاقة الوطنية</strong></p>
                <button className="btn-outline btn-sm" onClick={handleDownloadTemplate}>
                  📥 Télécharger le modèle Excel
                </button>
              </div>
              
              <form onSubmit={handleImportExcel}>
                <div className="form-group">
                  <label>Fichier Excel (.xlsx, .xls)</label>
                  <input type="file" name="file" accept=".xlsx,.xls" required className="file-input" />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => { setShowImportModal(false); setImportResult(null) }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={isImporting}>
                    {isImporting ? '⏳ Import en cours...' : '📥 Importer'}
                  </button>
                </div>
              </form>

              {importResult && (
                <div className={`import-result ${importResult.errors?.length > 0 ? 'has-errors' : 'success'}`}>
                  <h4>{importResult.imported > 0 ? '✅' : '⚠️'} Résultat de l'import</h4>
                  <p><strong>{importResult.imported}</strong> bénéficiaire(s) importé(s)</p>
                  {importResult.skipped > 0 && <p><strong>{importResult.skipped}</strong> ligne(s) ignorée(s)</p>}
                  {importResult.errors?.length > 0 && (
                    <div className="import-errors">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="import-error-line">⚠️ {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DISTRIBUTION MODAL ═══ */}
      {showDistributionModal && selectedBeneficiary && (
        <div className="modal-overlay" onClick={() => setShowDistributionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Nouvelle distribution</h2>
              <button className="btn-close" onClick={() => setShowDistributionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDistribution}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Bénéficiaire</label>
                  <input type="text" value={`${selectedBeneficiary.prenom} ${selectedBeneficiary.nom}`} disabled />
                </div>
                <div className="form-group">
                  <label>Type de distribution *</label>
                  <select name="distType" required>
                    <option value="alimentaire">🍽️ Alimentaire</option>
                    <option value="hygiene">🧼 Hygiène</option>
                    <option value="vestimentaire">👕 Vestimentaire</option>
                    <option value="medical">💊 Médical</option>
                    <option value="autre">📦 Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Article *</label>
                  <input type="text" name="itemNom" required placeholder="Nom de l'article" />
                </div>
                <div className="form-group">
                  <label>Quantité *</label>
                  <input type="number" name="itemQuantite" min="1" defaultValue="1" required />
                </div>
                <div className="form-group">
                  <label>Unité</label>
                  <select name="itemUnite">
                    <option value="unités">Unités</option>
                    <option value="kg">Kg</option>
                    <option value="L">L</option>
                    <option value="boîtes">Boîtes</option>
                    <option value="sachets">Sachets</option>
                    <option value="pièces">Pièces</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="distNotes" rows="2"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDistributionModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">📦 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ SUIVI MODAL ═══ */}
      {showSuiviModal && selectedBeneficiary && (
        <div className="modal-overlay" onClick={() => setShowSuiviModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 Nouveau suivi social</h2>
              <button className="btn-close" onClick={() => setShowSuiviModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSuivi}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Bénéficiaire</label>
                  <input type="text" value={`${selectedBeneficiary.prenom} ${selectedBeneficiary.nom}`} disabled />
                </div>
                <div className="form-group">
                  <label>Type de suivi *</label>
                  <select name="suiviType" required>
                    <option value="entretien">🗣️ Entretien</option>
                    <option value="visite">🏠 Visite</option>
                    <option value="orientation">🧭 Orientation</option>
                    <option value="evaluation">📊 Évaluation</option>
                    <option value="autre">📋 Autre</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea name="suiviDescription" rows="4" required placeholder="Décrivez le suivi..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSuiviModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">📝 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Beneficiaries
