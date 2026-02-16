import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { API_URL } from '../utils/api';
import './FoodStockManagement.css';
import ProfessionalLayout from '../professional/ProfessionalLayout';

const FoodStockManagement = () => {
  const navigate = useNavigate();
  const [stockItems, setStockItems] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [alerts, setAlerts] = useState({ expiration: [], stock: [] });
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [filters, setFilters] = useState({
    statut: '',
    categorie: '',
    search: ''
  });
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // État pour les formulaires
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'fruits-legumes',
    quantite: 0,
    unite: 'kg',
    prix: 0,
    dateAchat: new Date().toISOString().split('T')[0],
    dateExpiration: '',
    seuilCritique: 0,
    fournisseur: '',
    emplacement: '',
    notes: ''
  });
  const [consumeData, setConsumeData] = useState({ quantite: 0, raison: '' });
  const [planData, setPlanData] = useState(null);
  
  // Ajustement stock
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({ quantite: 0, type: 'add', raison: '' });

  const categories = [
    { value: 'fruits-legumes', label: '🍎 Fruits & Légumes', icon: '🥗' },
    { value: 'viandes-poissons', label: '🥩 Viandes & Poissons', icon: '🍖' },
    { value: 'produits-laitiers', label: '🥛 Produits Laitiers', icon: '🧀' },
    { value: 'cereales-pains', label: '🍞 Céréales & Pains', icon: '🌾' },
    { value: 'conserves', label: '🥫 Conserves', icon: '📦' },
    { value: 'boissons', label: '🥤 Boissons', icon: '🧃' },
    { value: 'autres', label: '📦 Autres', icon: '🏪' }
  ];

  const unites = ['kg', 'g', 'L', 'ml', 'unités', 'boîtes', 'sachets'];

  // ═══════════════════════════════════════
  // Export Excel professionnel (ExcelJS)
  // ═══════════════════════════════════════
  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ADDEL ALWAREF';
    wb.created = new Date();

    const ws = wb.addWorksheet('État du Stock Alimentaire', {
      properties: { tabColor: { argb: '2E7D32' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Shared styles ──
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FF999999' } },
      left: { style: 'thin', color: { argb: 'FF999999' } },
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
      right: { style: 'thin', color: { argb: 'FF999999' } }
    };

    // ── Header block ──
    // Row 1: Association name
    ws.mergeCells('A1:G1');
    const assocCell = ws.getCell('A1');
    assocCell.value = 'ADDEL ALWAREF';
    assocCell.font = { bold: true, size: 18, color: { argb: 'FF1B5E20' } };
    assocCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 35;

    // Row 2: Title
    ws.mergeCells('A2:G2');
    const titleCell = ws.getCell('A2');
    titleCell.value = 'État du Stock Alimentaire';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF2E7D32' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    ws.getRow(2).height = 28;

    // Row 3: Date
    ws.mergeCells('A3:G3');
    const dateCell = ws.getCell('A3');
    dateCell.value = `Date d'impression : ${dateStr}`;
    dateCell.font = { size: 11 };
    dateCell.alignment = { horizontal: 'center' };

    // Row 4: Responsable
    ws.mergeCells('A4:G4');
    ws.getCell('A4').value = 'Responsable : ___________________';
    ws.getCell('A4').font = { size: 11 };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    // Row 5: Signature
    ws.mergeCells('A5:G5');
    ws.getCell('A5').value = 'Signature  : ___________________';
    ws.getCell('A5').font = { size: 11 };
    ws.getCell('A5').alignment = { horizontal: 'center' };

    // Row 6: empty
    ws.addRow([]);

    // ── Table header (row 7) ──
    const headerRow = ws.addRow([
      'Nom du Produit',
      'Catégorie',
      'Quantité Disponible',
      'Unité',
      "Date d'Expiration",
      'Jours Restants',
      'Statut'
    ]);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    // ── Data rows ──
    let totalProduits = 0;
    let produitsCritiques = 0;
    let produitsExpirantBientot = 0;
    let produitsDisponibles = 0;

    stockItems.forEach((item) => {
      totalProduits++;

      const categoryObj = categories.find(c => c.value === item.categorie);
      const catLabel = categoryObj ? categoryObj.label : item.categorie;

      const expDate = item.dateExpiration ? new Date(item.dateExpiration) : null;
      const expStr = expDate ? expDate.toLocaleDateString('fr-FR') : 'N/A';

      let joursRestants = 'N/A';
      let statut = 'Disponible';

      if (expDate) {
        joursRestants = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (item.quantite === 0) {
        statut = '🔴 Critique';
        produitsCritiques++;
      } else if (typeof joursRestants === 'number' && joursRestants < 30) {
        statut = '🟠 Expire bientôt';
        produitsExpirantBientot++;
      } else {
        statut = '🟢 Disponible';
        produitsDisponibles++;
      }

      const row = ws.addRow([
        item.nom,
        catLabel,
        item.quantite,
        item.unite,
        expStr,
        joursRestants,
        statut
      ]);

      // Style each cell
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 10 };
      });

      // Conditional row coloring
      if (statut.includes('Critique')) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
          cell.font = { size: 10, bold: true, color: { argb: 'FFC62828' } };
        });
      } else if (statut.includes('Expire bientôt')) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
          cell.font = { size: 10, bold: true, color: { argb: 'FFE65100' } };
        });
      } else {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        });
      }

      // Left align product name
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // ── Empty row ──
    ws.addRow([]);

    // ── Summary section ──
    const summaryTitleRow = ws.addRow(['📋 Résumé Général']);
    ws.mergeCells(`A${summaryTitleRow.number}:G${summaryTitleRow.number}`);
    summaryTitleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1B5E20' } };
    summaryTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    summaryTitleRow.getCell(1).alignment = { horizontal: 'center' };
    summaryTitleRow.height = 25;

    const summaryData = [
      ['Total produits', totalProduits, '', '', '', '', ''],
      ['🟢 Produits disponibles', produitsDisponibles, '', '', '', '', ''],
      ['🔴 Produits critiques (quantité = 0)', produitsCritiques, '', '', '', '', ''],
      ['🟠 Produits expirant dans < 30 jours', produitsExpirantBientot, '', '', '', '', ''],
    ];

    summaryData.forEach((data) => {
      const row = ws.addRow(data);
      row.getCell(1).font = { size: 11, bold: true };
      row.getCell(2).font = { size: 11, bold: true, color: { argb: 'FF2E7D32' } };
      row.getCell(1).alignment = { horizontal: 'left' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(1).border = thinBorder;
      row.getCell(2).border = thinBorder;
    });

    // ── Column widths (auto-fit approximation) ──
    ws.columns = [
      { width: 30 },  // Nom
      { width: 26 },  // Catégorie
      { width: 22 },  // Quantité
      { width: 12 },  // Unité
      { width: 20 },  // Date Exp
      { width: 18 },  // Jours Restants
      { width: 22 },  // Statut
    ];

    // ── Generate and download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Stock_Alimentaire_${dateStr.replace(/\//g, '-')}.xlsx`);
  };

  // ═══════════════════════════════════════
  // Imprimer / PDF
  // ═══════════════════════════════════════
  const printStock = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let totalProduits = 0;
    let produitsCritiques = 0;
    let produitsExpirantBientot = 0;

    const tableRows = stockItems.map((item) => {
      totalProduits++;
      const categoryObj = categories.find(c => c.value === item.categorie);
      const catLabel = categoryObj ? categoryObj.label : item.categorie;
      const expDate = item.dateExpiration ? new Date(item.dateExpiration) : null;
      const expStr = expDate ? expDate.toLocaleDateString('fr-FR') : 'N/A';
      let joursRestants = 'N/A';
      let statut = 'Disponible';
      let rowClass = '';

      if (expDate) {
        joursRestants = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (item.quantite === 0) {
        statut = 'Critique';
        rowClass = 'critique';
        produitsCritiques++;
      } else if (typeof joursRestants === 'number' && joursRestants < 30) {
        statut = 'Expire bientôt';
        rowClass = 'expire-soon';
        produitsExpirantBientot++;
      }

      return `<tr class="${rowClass}">
        <td>${item.nom}</td>
        <td>${catLabel}</td>
        <td>${item.quantite}</td>
        <td>${item.unite}</td>
        <td>${expStr}</td>
        <td>${joursRestants}</td>
        <td><strong>${statut}</strong></td>
      </tr>`;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>État du Stock Alimentaire</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2E7D32; padding-bottom: 15px; }
          .header h1 { font-size: 22px; color: #1B5E20; margin-bottom: 5px; }
          .header h2 { font-size: 16px; color: #2E7D32; margin-bottom: 10px; }
          .header p { font-size: 12px; color: #666; margin: 3px 0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; }
          .signatures span { display: inline-block; min-width: 200px; border-bottom: 1px solid #999; padding-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
          th { background: #2E7D32; color: white; padding: 8px 6px; text-align: center; font-size: 11px; }
          td { padding: 6px; text-align: center; border: 1px solid #ddd; }
          td:first-child { text-align: left; font-weight: 500; }
          tr:nth-child(even) { background: #f9f9f9; }
          tr.critique { background: #FFCDD2 !important; color: #C62828; font-weight: bold; }
          tr.expire-soon { background: #FFE0B2 !important; color: #E65100; font-weight: bold; }
          .summary { margin-top: 25px; padding: 15px; background: #E8F5E9; border-radius: 8px; border: 1px solid #A5D6A7; }
          .summary h3 { color: #1B5E20; margin-bottom: 10px; font-size: 14px; }
          .summary-grid { display: flex; gap: 30px; flex-wrap: wrap; }
          .summary-item { display: flex; gap: 8px; font-size: 12px; }
          .summary-item .label { font-weight: 600; }
          .summary-item .value { color: #2E7D32; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/images/logo.png" alt="Logo" style="width:80px;height:80px;margin-bottom:8px;" />
          <h1>ADDEL ALWAREF</h1>
          <h2>État du Stock Alimentaire</h2>
          <p>Date d'impression : ${dateStr}</p>
          <div class="signatures">
            <div>Responsable : <span>&nbsp;</span></div>
            <div>Signature : <span>&nbsp;</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nom du Produit</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Unité</th>
              <th>Date d'Expiration</th>
              <th>Jours Restants</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <h3>📋 Résumé Général</h3>
          <div class="summary-grid">
            <div class="summary-item"><span class="label">Total produits :</span> <span class="value">${totalProduits}</span></div>
            <div class="summary-item"><span class="label">🔴 Critiques :</span> <span class="value">${produitsCritiques}</span></div>
            <div class="summary-item"><span class="label">🟠 Expire bientôt :</span> <span class="value">${produitsExpirantBientot}</span></div>
          </div>
        </div>

        <div class="footer">
          ADDEL ALWAREF — Document généré le ${dateStr}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Récupérer le token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('professionalToken') || localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found! User must login first.');
      navigate('/login');
      return {};
    }
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Charger les données avec debounce pour la recherche
  const debounceRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchData(true);
      return;
    }
    // Debounce : attendre 400ms après le dernier changement
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.categorie) params.append('categorie', filters.categorie);
      if (filters.search) params.append('search', filters.search);

      const [itemsRes, statsRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/food-stock?${params}`, getAuthHeaders()),
        axios.get(`${API_URL}/food-stock/stats/overview`, getAuthHeaders()),
        axios.get(`${API_URL}/food-stock/alerts/all`, getAuthHeaders())
      ]);

      setStockItems(itemsRes.data.items || []);
      setStatistics(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un article
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/food-stock`, formData, getAuthHeaders());
      setShowAddModal(false);
      resetForm();
      fetchData();
      alert('Article ajouté avec succès!');
    } catch (error) {
      console.error('Erreur ajout:', error);
      alert('Erreur lors de l\'ajout');
    }
  };

  // Modifier un article
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/food-stock/${currentItem._id}`, formData, getAuthHeaders());
      setShowEditModal(false);
      resetForm();
      fetchData();
      alert('Article modifié avec succès!');
    } catch (error) {
      console.error('Erreur modification:', error);
      alert('Erreur lors de la modification');
    }
  };

  // Consommer un article
  const handleConsume = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/food-stock/${currentItem._id}/consommer`,
        consumeData,
        getAuthHeaders()
      );
      setShowConsumeModal(false);
      setConsumeData({ quantite: 0, raison: '' });
      fetchData();
      alert('Consommation enregistrée!');
    } catch (error) {
      console.error('Erreur consommation:', error);
      alert(error.response?.data?.message || 'Erreur lors de la consommation');
    }
  };

  // Supprimer un article
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article?')) return;
    
    try {
      await axios.delete(`${API_URL}/food-stock/${id}`, getAuthHeaders());
      fetchData();
      alert('Article supprimé!');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Afficher le plan de consommation
  const showConsumptionPlan = async (item) => {
    try {
      const response = await axios.get(
        `${API_URL}/food-stock/${item._id}/plan`,
        getAuthHeaders()
      );
      setPlanData(response.data);
      setCurrentItem(item);
      setShowPlanModal(true);
    } catch (error) {
      console.error('Erreur plan:', error);
      alert('Erreur lors du calcul du plan');
    }
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setFormData({
      nom: item.nom,
      categorie: item.categorie,
      quantite: item.quantite,
      unite: item.unite,
      prix: item.prix,
      dateAchat: new Date(item.dateAchat).toISOString().split('T')[0],
      dateExpiration: new Date(item.dateExpiration).toISOString().split('T')[0],
      seuilCritique: item.seuilCritique,
      fournisseur: item.fournisseur || '',
      emplacement: item.emplacement || '',
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  const openConsumeModal = (item) => {
    setCurrentItem(item);
    setConsumeData({ quantite: 0, raison: '' });
    setShowConsumeModal(true);
  };

  const openAdjustModal = (item) => {
    setCurrentItem(item);
    setAdjustData({ quantite: 0, type: 'add', raison: '' });
    setShowAdjustModal(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (adjustData.quantite <= 0) {
      alert('La quantité doit être supérieure à 0');
      return;
    }
    try {
      await axios.post(
        `${API_URL}/food-stock/${currentItem._id}/adjust`,
        adjustData,
        getAuthHeaders()
      );
      setShowAdjustModal(false);
      setAdjustData({ quantite: 0, type: 'add', raison: '' });
      fetchData();
      alert(adjustData.type === 'add' ? 'Stock ajouté avec succès!' : 'Stock retiré avec succès!');
    } catch (error) {
      console.error('Erreur ajustement:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'ajustement');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'fruits-legumes',
      quantite: 0,
      unite: 'kg',
      prix: 0,
      dateAchat: new Date().toISOString().split('T')[0],
      dateExpiration: '',
      seuilCritique: 0,
      fournisseur: '',
      emplacement: '',
      notes: ''
    });
    setCurrentItem(null);
  };

  const getStatusBadge = (statut) => {
    const badges = {
      disponible: { class: 'badge-success', text: '✓ Disponible' },
      faible: { class: 'badge-warning', text: '⚠ Faible' },
      critique: { class: 'badge-danger', text: '⚠ Critique' },
      expire: { class: 'badge-expired', text: '✗ Expiré' }
    };
    return badges[statut] || badges.disponible;
  };

  const getDaysRemaining = (dateExpiration) => {
    const days = Math.ceil((new Date(dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <ProfessionalLayout noPadding>
        <div className="loading-spinner">Chargement...</div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout noPadding>
    <div className="food-stock-container">
      <div className="food-stock-header">
        <h1>🏪 Gestion du Stock Alimentaire</h1>
        <div className="header-actions">
          <button className="btn-print" onClick={printStock} title="Imprimer / PDF">
            🖨️ Imprimer / PDF
          </button>
          <button className="btn-export-excel" onClick={exportToExcel} title="Exporter en Excel">
            📊 Exporter en Excel
          </button>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            ➕ Ajouter un article
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{statistics.total}</h3>
              <p>Articles Total</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{statistics.valeurTotale.toFixed(2)} DH</h3>
              <p>Valeur Totale</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>
                {statistics.statuts.find(s => s._id === 'disponible')?.count || 0}
              </h3>
              <p>Disponibles</p>
            </div>
          </div>
          <div className="stat-card alert">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <h3>{alerts.expiration.length + alerts.stock.length}</h3>
              <p>Alertes</p>
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(alerts.expiration.length > 0 || alerts.stock.length > 0) && (
        <div className="alerts-section">
          {alerts.expiration.length > 0 && (
            <div className="alert-box expiration">
              <h3>⏰ Expiration Proche ({alerts.expiration.length})</h3>
              <ul>
                {alerts.expiration.map(item => (
                  <li key={item._id}>
                    <strong>{item.nom}</strong> expire dans{' '}
                    <span className="days">{getDaysRemaining(item.dateExpiration)} jours</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {alerts.stock.length > 0 && (
            <div className="alert-box stock">
              <h3>📉 Stock Critique ({alerts.stock.length})</h3>
              <ul>
                {alerts.stock.map(item => (
                  <li key={item._id}>
                    <strong>{item.nom}</strong>:{' '}
                    <span className="quantity">{item.quantite} {item.unite}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="filters-bar">
        <select
          value={filters.statut}
          onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          className="filter-select"
        >
          <option value="">Tous les statuts</option>
          <option value="disponible">Disponible</option>
          <option value="faible">Faible</option>
          <option value="critique">Critique</option>
          <option value="expire">Expiré</option>
        </select>

        <select
          value={filters.categorie}
          onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
          className="filter-select"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-search"
        />
      </div>

      {/* Table des articles */}
      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Prix Unit.</th>
              <th>Valeur</th>
              <th>Date Exp.</th>
              <th>Jours Restants</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map(item => {
              const daysRemaining = getDaysRemaining(item.dateExpiration);
              const badge = getStatusBadge(item.statut);
              const catInfo = categories.find(c => c.value === item.categorie);
              
              return (
                <tr key={item._id}>
                  <td data-label="Nom">
                    <strong>{catInfo?.icon} {item.nom}</strong>
                    {item.emplacement && <div className="sub-text">{item.emplacement}</div>}
                  </td>
                  <td data-label="Catégorie">{catInfo?.label}</td>
                  <td data-label="Quantité">
                    <strong>{item.quantite}</strong> {item.unite}
                  </td>
                  <td data-label="Prix Unit.">{item.prix} DH</td>
                  <td data-label="Valeur" className="value">{(item.quantite * item.prix).toFixed(2)} DH</td>
                  <td data-label="Date Exp.">{new Date(item.dateExpiration).toLocaleDateString('fr-FR')}</td>
                  <td data-label="Jours">
                    <span className={`days-badge ${daysRemaining < 3 ? 'urgent' : daysRemaining < 7 ? 'warning' : ''}`}>
                      {daysRemaining > 0 ? `${daysRemaining} j` : 'Expiré'}
                    </span>
                  </td>
                  <td data-label="Statut">
                    <span className={`status-badge ${badge.class}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button 
                        className="btn-action adjust"
                        onClick={() => openAdjustModal(item)}
                        title="Ajuster le stock"
                      >
                        📦
                      </button>
                      <button 
                        className="btn-action consume"
                        onClick={() => openConsumeModal(item)}
                        title="Consommer"
                      >
                        🍽️
                      </button>
                      <button 
                        className="btn-action plan"
                        onClick={() => showConsumptionPlan(item)}
                        title="Plan de consommation"
                      >
                        📊
                      </button>
                      <button 
                        className="btn-action edit"
                        onClick={() => openEditModal(item)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDelete(item._id)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {stockItems.length === 0 && (
          <div className="empty-state">
            <p>Aucun article trouvé</p>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {statistics && (
        <div className="stock-summary">
          <h3>📋 Résumé Général</h3>
          <div className="summary-cards">
            <div className="summary-card total">
              <span className="summary-value">{statistics.total || 0}</span>
              <span className="summary-label">Total Produits</span>
            </div>
            <div className="summary-card critique">
              <span className="summary-value">
                {(statistics.statuts || []).find(s => s._id === 'critique')?.count || 0}
              </span>
              <span className="summary-label">🔴 Critiques</span>
            </div>
            <div className="summary-card expire">
              <span className="summary-value">
                {(statistics.statuts || []).find(s => s._id === 'faible')?.count || 0}
              </span>
              <span className="summary-label">🟠 Expire &lt; 30j</span>
            </div>
            <div className="summary-card ok">
              <span className="summary-value">
                {(statistics.statuts || []).find(s => s._id === 'disponible')?.count || 0}
              </span>
              <span className="summary-label">🟢 Disponibles</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Ajouter un Article</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} className="stock-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    required
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Unité *</label>
                  <select
                    required
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  >
                    {unites.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Prix Unitaire (DH) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Seuil Critique *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.seuilCritique}
                    onChange={(e) => setFormData({ ...formData, seuilCritique: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Achat *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateAchat}
                    onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Expiration *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateExpiration}
                    onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emplacement</label>
                  <input
                    type="text"
                    value={formData.emplacement}
                    onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Modifier l'Article</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit} className="stock-form">
              {/* Same form as add modal */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    required
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Unité *</label>
                  <select
                    required
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  >
                    {unites.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Prix Unitaire (DH) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Seuil Critique *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.seuilCritique}
                    onChange={(e) => setFormData({ ...formData, seuilCritique: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Achat *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateAchat}
                    onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date d'Expiration *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateExpiration}
                    onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emplacement</label>
                  <input
                    type="text"
                    value={formData.emplacement}
                    onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consommation */}
      {showConsumeModal && currentItem && (
        <div className="modal-overlay" onClick={() => setShowConsumeModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🍽️ Consommer: {currentItem.nom}</h2>
              <button className="modal-close" onClick={() => setShowConsumeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConsume} className="consume-form">
              <p className="info">Disponible: <strong>{currentItem.quantite} {currentItem.unite}</strong></p>
              
              <div className="form-group">
                <label>Quantité à consommer *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={currentItem.quantite}
                  step="0.01"
                  value={consumeData.quantite}
                  onChange={(e) => setConsumeData({ ...consumeData, quantite: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>Raison</label>
                <textarea
                  value={consumeData.raison}
                  onChange={(e) => setConsumeData({ ...consumeData, raison: e.target.value })}
                  rows="3"
                  placeholder="Ex: Distribution repas, préparation..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowConsumeModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plan de Consommation */}
      {showPlanModal && planData && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Plan de Consommation</h2>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>
            <div className="plan-content">
              <h3>{planData.nom}</h3>
              
              <div className="plan-stats">
                <div className="plan-stat">
                  <span className="label">Quantité Actuelle:</span>
                  <span className="value">{planData.quantiteActuelle} {currentItem.unite}</span>
                </div>
                <div className="plan-stat">
                  <span className="label">Jours Restants:</span>
                  <span className={`value ${planData.joursRestants < 3 ? 'urgent' : ''}`}>
                    {planData.joursRestants} jours
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="label">Consommation Recommandée:</span>
                  <span className="value highlight">
                    {planData.consommationQuotidienne} {currentItem.unite}/jour
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="label">Date d'Expiration:</span>
                  <span className="value">
                    {new Date(planData.dateExpiration).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="plan-recommendation">
                <p>💡 <strong>Recommandation:</strong></p>
                <p>{planData.recommandation}</p>
              </div>

              <div className="modal-actions">
                <button className="btn-submit" onClick={() => setShowPlanModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajuster Stock */}
      {showAdjustModal && currentItem && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Ajuster le Stock: {currentItem.nom}</h2>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdjust} className="adjust-form">
              <div className="current-stock-info">
                <span className="info-label">Stock actuel :</span>
                <span className="info-value">{currentItem.quantite} {currentItem.unite}</span>
              </div>

              <div className="adjust-type-selector">
                <button
                  type="button"
                  className={`type-btn add ${adjustData.type === 'add' ? 'active' : ''}`}
                  onClick={() => setAdjustData({ ...adjustData, type: 'add' })}
                >
                  ➕ Ajouter
                </button>
                <button
                  type="button"
                  className={`type-btn remove ${adjustData.type === 'remove' ? 'active' : ''}`}
                  onClick={() => setAdjustData({ ...adjustData, type: 'remove' })}
                >
                  ➖ Retirer
                </button>
              </div>

              <div className="form-group">
                <label>Quantité ({currentItem.unite}) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={adjustData.type === 'remove' ? currentItem.quantite : undefined}
                  step="0.01"
                  value={adjustData.quantite}
                  onChange={(e) => setAdjustData({ ...adjustData, quantite: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="adjust-preview">
                <span className="preview-label">Nouveau stock :</span>
                <span className={`preview-value ${adjustData.type === 'add' ? 'positive' : 'negative'}`}>
                  {adjustData.type === 'add'
                    ? (currentItem.quantite + (adjustData.quantite || 0)).toFixed(2)
                    : (currentItem.quantite - (adjustData.quantite || 0)).toFixed(2)
                  } {currentItem.unite}
                </span>
              </div>

              <div className="form-group">
                <label>Raison</label>
                <textarea
                  value={adjustData.raison}
                  onChange={(e) => setAdjustData({ ...adjustData, raison: e.target.value })}
                  rows="2"
                  placeholder={adjustData.type === 'add' ? 'Ex: Réception livraison, don...' : 'Ex: Perte, périmé, transfert...'}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdjustModal(false)}>
                  Annuler
                </button>
                <button type="submit" className={`btn-submit ${adjustData.type === 'add' ? 'btn-add-stock' : 'btn-remove-stock'}`}>
                  {adjustData.type === 'add' ? '➕ Ajouter au stock' : '➖ Retirer du stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </ProfessionalLayout>
  );
};

export default FoodStockManagement;
