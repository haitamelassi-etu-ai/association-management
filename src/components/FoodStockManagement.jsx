import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../utils/api';
import './FoodStockManagement.css';
import ProfessionalLayout from '../professional/ProfessionalLayout';
import BarcodeScanner from './BarcodeScanner';

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
    notes: '',
    barcode: ''
  });
  const [consumeData, setConsumeData] = useState({ quantite: 0, raison: '' });
  const [planData, setPlanData] = useState(null);
  
  // Ajustement stock
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({ quantite: 0, type: 'add', raison: '' });

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  // Tabs & Analytics
  const [activeTab, setActiveTab] = useState('stock');
  const [chartData, setChartData] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState({ nom: '', historique: [] });

  // Sortie (exit) modal
  const [showSortieModal, setShowSortieModal] = useState(false);
  const [sortieData, setSortieData] = useState({ quantite: 0, typeSortie: 'don', destination: '', raison: '' });

  // Global stock history tab
  const [globalHistory, setGlobalHistory] = useState(null);
  const [globalHistoryLoading, setGlobalHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    action: 'sortie_consommation',
    typeSortie: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1
  });

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
  // Fiche Inventaire Papier
  // ═══════════════════════════════════════
  const printInventorySheet = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 30 empty rows for manual paper entry
    const emptyRows = Array.from({ length: 30 }, (_, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td class="name"></td>
        <td class="barcode"></td>
        <td></td>
        <td class="qty-cell"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="notes-cell"></td>
      </tr>`).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr" dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>Fiche de Saisie — Nouveaux Articles</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; }

          .header { text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 3px double #2E7D32; }
          .header h1 { font-size: 20px; color: #1B5E20; margin-bottom: 3px; }
          .header h2 { font-size: 15px; color: #2E7D32; margin-bottom: 8px; }

          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; margin-bottom: 15px; font-size: 12px; }
          .meta-item { display: flex; gap: 8px; align-items: baseline; }
          .meta-item .lbl { font-weight: 600; color: #555; white-space: nowrap; }
          .meta-item .line { flex: 1; border-bottom: 1px solid #999; min-width: 120px; height: 18px; }

          .instructions { background: #f0f7f0; border: 1px solid #c8e6c9; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px; font-size: 11px; color: #2E7D32; }
          .instructions strong { font-size: 12px; }
          .instructions ol { margin: 5px 0 0 18px; line-height: 1.6; }

          .categories-ref { margin-bottom: 12px; font-size: 10px; color: #555; }
          .categories-ref strong { color: #2E7D32; }
          .cat-list { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
          .cat-tag { background: #e8f5e9; border: 1px solid #a5d6a7; padding: 2px 8px; border-radius: 4px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #2E7D32; color: white; padding: 7px 4px; text-align: center; font-size: 10px; font-weight: 600; }
          td { padding: 5px 4px; border: 1px solid #bbb; text-align: center; font-size: 10px; height: 28px; }
          td.name { text-align: left; min-width: 110px; }
          td.barcode { font-family: 'Courier New', monospace; font-size: 9px; min-width: 85px; }
          td.num { width: 25px; color: #999; font-size: 9px; }
          td.qty-cell { min-width: 55px; }
          td.notes-cell { min-width: 80px; background: #fafafa; }

          tr:nth-child(even) { background: #f9f9f9; }

          .units-ref { margin-bottom: 12px; font-size: 10px; color: #555; }
          .units-ref strong { color: #2E7D32; }

          .signatures-section { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
          .sig-box { text-align: center; padding-top: 10px; }
          .sig-box .sig-label { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 30px; }
          .sig-box .sig-line { border-top: 1px solid #999; margin-top: 35px; padding-top: 4px; font-size: 10px; color: #999; }

          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #aaa; border-top: 1px solid #ddd; padding-top: 8px; }

          @media print {
            body { padding: 10px; }
            .instructions { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            td.notes-cell { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ADDEL ALWAREF</h1>
          <h2>📋 Fiche de Saisie — Nouveaux Articles</h2>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="lbl">Date :</span> <span>${dateStr}</span></div>
          <div class="meta-item"><span class="lbl">Responsable :</span> <span class="line"></span></div>
          <div class="meta-item"><span class="lbl">Dépôt / Lieu :</span> <span class="line"></span></div>
          <div class="meta-item"><span class="lbl">N° de fiche :</span> <span class="line"></span></div>
        </div>

        <div class="instructions">
          <strong>📌 Instructions :</strong>
          <ol>
            <li>Remplissez une ligne par article à ajouter au stock.</li>
            <li>Notez le <strong>nom</strong>, la <strong>quantité</strong>, l'<strong>unité</strong>, le <strong>prix unitaire</strong> et la <strong>date d'expiration</strong>.</li>
            <li>Si disponible, notez le <strong>code-barres</strong> inscrit sur l'emballage.</li>
            <li>Choisissez la catégorie parmi celles listées ci-dessous.</li>
            <li>Remettez cette fiche au responsable pour saisie dans le système.</li>
          </ol>
        </div>

        <div class="categories-ref">
          <strong>Catégories :</strong>
          <div class="cat-list">
            <span class="cat-tag">🍎 Fruits & Légumes</span>
            <span class="cat-tag">🥩 Viandes & Poissons</span>
            <span class="cat-tag">🥛 Produits Laitiers</span>
            <span class="cat-tag">🍞 Céréales & Pains</span>
            <span class="cat-tag">🥫 Conserves</span>
            <span class="cat-tag">🥤 Boissons</span>
            <span class="cat-tag">📦 Autres</span>
          </div>
        </div>

        <div class="units-ref">
          <strong>Unités :</strong> kg · g · L · ml · unités · boîtes · sachets
        </div>

        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Nom du Produit</th>
              <th>Code-barres</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Unité</th>
              <th>Prix Unit. (DH)</th>
              <th>Date Exp.</th>
              <th>Fournisseur</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            ${emptyRows}
          </tbody>
        </table>

        <div class="signatures-section">
          <div class="sig-box">
            <div class="sig-label">Rempli par</div>
            <div class="sig-line">Nom & Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Vérifié par</div>
            <div class="sig-line">Nom & Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">Saisi par</div>
            <div class="sig-line">Nom & Signature</div>
          </div>
        </div>

        <div class="footer">
          ADDEL ALWAREF — Fiche de saisie générée le ${dateStr}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
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

  // ═══════════════════════════════════════
  // Imprimer Statistiques & Graphiques
  // ═══════════════════════════════════════
  const printCharts = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Capture all SVG charts from the DOM
    const svgElements = document.querySelectorAll('.charts-container svg');
    const svgStrings = [];
    svgElements.forEach(svg => {
      const clone = svg.cloneNode(true);
      clone.setAttribute('width', '100%');
      clone.setAttribute('height', svg.getAttribute('height') || '300');
      svgStrings.push(clone.outerHTML);
    });

    // Build stats section
    const statsTotal = statistics?.total || 0;
    const statsValue = statistics?.valeurTotale?.toFixed(2) || '0.00';
    const statusBreakdown = (statistics?.statuts || []).map(s => {
      const labels = { disponible: '✓ Disponible', faible: '⚠ Faible', critique: '⚠ Critique', expire: '✗ Expiré' };
      return `<div class="stat-item"><span class="stat-label">${labels[s._id] || s._id}</span><span class="stat-val">${s.count}</span></div>`;
    }).join('');

    const catBreakdown = (chartData?.parCategorie || []).map(c => {
      const label = categoryLabels[c._id] || c._id;
      return `<tr><td>${label}</td><td>${c.count}</td><td>${c.valeur.toFixed(2)} DH</td></tr>`;
    }).join('');

    // Chart titles to pair with SVGs
    const chartTitles = [
      '🥧 Répartition par Catégorie',
      '🔴 Répartition par Statut',
      '💰 Valeur du Stock par Catégorie (DH)',
      '🏆 Top 10 Articles (Quantité)',
      '📈 Achats par Mois'
    ];

    const chartBlocks = svgStrings.map((svg, i) => `
      <div class="chart-block">
        <h3>${chartTitles[i] || 'Graphique ' + (i + 1)}</h3>
        <div class="chart-svg">${svg}</div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Statistiques & Graphiques — Stock Alimentaire</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #667eea; padding-bottom: 15px; }
          .header h1 { font-size: 22px; color: #4a148c; margin-bottom: 5px; }
          .header h2 { font-size: 16px; color: #667eea; margin-bottom: 10px; }
          .header p { font-size: 12px; color: #666; }
          .stats-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; }
          .stat-box .big { font-size: 28px; font-weight: 800; color: #667eea; }
          .stat-box .lbl { font-size: 12px; color: #718096; margin-top: 5px; }
          .breakdown { margin: 20px 0; }
          .breakdown h3 { font-size: 14px; color: #2d3748; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
          .stat-items { display: flex; gap: 15px; flex-wrap: wrap; }
          .stat-item { background: #f0f4ff; padding: 8px 16px; border-radius: 8px; display: flex; gap: 10px; font-size: 13px; }
          .stat-label { color: #4a5568; }
          .stat-val { font-weight: 700; color: #667eea; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
          th { background: #667eea; color: white; padding: 8px; text-align: center; }
          td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; }
          tr:nth-child(even) { background: #f7fafc; }
          .charts-print { margin-top: 25px; }
          .chart-block { page-break-inside: avoid; margin-bottom: 30px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
          .chart-block h3 { font-size: 14px; color: #2d3748; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
          .chart-svg { text-align: center; overflow: hidden; }
          .chart-svg svg { max-width: 100%; height: auto; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print {
            body { padding: 15px; }
            .chart-block { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/images/logo.png" alt="Logo" style="width:70px;height:70px;margin-bottom:8px;" />
          <h1>ADDEL ALWAREF</h1>
          <h2>📊 Statistiques & Graphiques — Stock Alimentaire</h2>
          <p>Date d'impression : ${dateStr}</p>
        </div>

        <div class="stats-section">
          <div class="stat-box"><div class="big">${statsTotal}</div><div class="lbl">Total Articles</div></div>
          <div class="stat-box"><div class="big">${statsValue} DH</div><div class="lbl">Valeur Totale</div></div>
          <div class="stat-box"><div class="big">${(statistics?.statuts || []).find(s => s._id === 'disponible')?.count || 0}</div><div class="lbl">Disponibles</div></div>
          <div class="stat-box"><div class="big">${(statistics?.statuts || []).find(s => s._id === 'critique')?.count || 0}</div><div class="lbl">Critiques</div></div>
        </div>

        <div class="breakdown">
          <h3>📋 Répartition par Statut</h3>
          <div class="stat-items">${statusBreakdown}</div>
        </div>

        <div class="breakdown">
          <h3>📦 Détail par Catégorie</h3>
          <table><thead><tr><th>Catégorie</th><th>Articles</th><th>Valeur</th></tr></thead><tbody>${catBreakdown}</tbody></table>
        </div>

        <div class="charts-print">
          <h3 style="font-size:16px;color:#2d3748;margin-bottom:15px;">📊 Graphiques</h3>
          ${chartBlocks}
        </div>

        <div class="footer">
          ADDEL ALWAREF — Rapport statistique généré le ${dateStr}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
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

  // Charger les données des graphiques
  const fetchChartData = async () => {
    try {
      const res = await axios.get(`${API_URL}/food-stock/stats/charts`, getAuthHeaders());
      setChartData(res.data);
    } catch (error) {
      console.error('Erreur chargement charts:', error);
    }
  };

  // Charger le calendrier d'expiration
  const fetchCalendarData = async () => {
    try {
      const res = await axios.get(`${API_URL}/food-stock/stats/expiration-calendar`, getAuthHeaders());
      setCalendarData(res.data);
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    }
  };

  // Charger l'historique d'un article
  const fetchItemHistory = async (item) => {
    try {
      const res = await axios.get(`${API_URL}/food-stock/${item._id}/history`, getAuthHeaders());
      setHistoryData(res.data);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // Charger l'historique global
  const fetchGlobalHistory = async (filters = historyFilters) => {
    setGlobalHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.typeSortie) params.append('typeSortie', filters.typeSortie);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('page', filters.page || 1);
      params.append('limit', 50);
      const res = await axios.get(`${API_URL}/food-stock/history/global?${params.toString()}`, getAuthHeaders());
      setGlobalHistory(res.data);
    } catch (error) {
      console.error('Erreur chargement historique global:', error);
    } finally {
      setGlobalHistoryLoading(false);
    }
  };

  // Enregistrer une sortie
  const handleSortie = async (e) => {
    e.preventDefault();
    if (sortieData.quantite <= 0) {
      alert('La quantité doit être supérieure à 0');
      return;
    }
    try {
      await axios.post(
        `${API_URL}/food-stock/${currentItem._id}/sortie`,
        sortieData,
        getAuthHeaders()
      );
      setShowSortieModal(false);
      setSortieData({ quantite: 0, typeSortie: 'don', destination: '', raison: '' });
      fetchData();
      if (activeTab === 'history') fetchGlobalHistory();
      alert('Sortie enregistrée avec succès!');
    } catch (error) {
      console.error('Erreur sortie:', error);
      alert(error.response?.data?.message || 'Erreur lors de la sortie');
    }
  };

  const openSortieModal = (item) => {
    setCurrentItem(item);
    setSortieData({ quantite: 0, typeSortie: 'don', destination: '', raison: '' });
    setShowSortieModal(true);
  };

  // Charger données quand on change de tab
  useEffect(() => {
    if (activeTab === 'charts' && !chartData) fetchChartData();
    if (activeTab === 'calendar' && !calendarData) fetchCalendarData();
    if (activeTab === 'history') fetchGlobalHistory();
  }, [activeTab]);

  // Helper pour les couleurs des graphiques
  const CHART_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b'];
  const STATUS_COLORS = { disponible: '#43e97b', faible: '#f5a623', critique: '#f5576c', expire: '#1f2937' };

  const categoryLabels = {
    'fruits-legumes': '🍎 Fruits & Légumes',
    'viandes-poissons': '🥩 Viandes & Poissons',
    'produits-laitiers': '🥛 Produits Laitiers',
    'cereales-pains': '🍞 Céréales & Pains',
    'conserves': '🥫 Conserves',
    'boissons': '🥤 Boissons',
    'autres': '📦 Autres'
  };

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  // Calendar helpers
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    // Adjust for Monday start (0=Mon,6=Sun)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const getItemsForDay = (day) => {
    if (!day || !calendarData?.grouped) return [];
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const key = `${year}-${month}-${dayStr}`;
    return calendarData.grouped[key] || [];
  };

  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

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
      notes: item.notes || '',
      barcode: item.barcode || ''
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
      notes: '',
      barcode: ''
    });
    setCurrentItem(null);
  };

  // Barcode scan handler
  const handleBarcodeScan = async (barcode, productInfo) => {
    setShowScanner(false);
    setScanLoading(true);
    try {
      const res = await axios.get(`${API_URL}/food-stock/by-barcode/${encodeURIComponent(barcode)}`, getAuthHeaders());
      // Product found in local DB — open edit modal with data
      const item = res.data;
      setCurrentItem(item);
      setFormData({
        nom: item.nom || '',
        categorie: item.categorie || 'fruits-legumes',
        quantite: item.quantite || 0,
        unite: item.unite || 'kg',
        prix: item.prix || 0,
        dateAchat: item.dateAchat ? new Date(item.dateAchat).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dateExpiration: item.dateExpiration ? new Date(item.dateExpiration).toISOString().split('T')[0] : '',
        seuilCritique: item.seuilCritique || 0,
        fournisseur: item.fournisseur || '',
        emplacement: item.emplacement || '',
        notes: item.notes || '',
        barcode: item.barcode || barcode
      });
      setShowEditModal(true);
      alert(`✅ Produit trouvé dans votre stock : ${item.nom}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Product not in local DB — pre-fill with Open Food Facts data
        resetForm();
        if (productInfo && productInfo.found) {
          setFormData(prev => ({
            ...prev,
            barcode,
            nom: productInfo.nom || '',
            categorie: productInfo.categorie || 'autres',
            notes: [
              productInfo.marque ? `Marque: ${productInfo.marque}` : '',
              productInfo.quantiteLabel ? `Contenu: ${productInfo.quantiteLabel}` : '',
              productInfo.nutriscore ? `Nutri-Score: ${productInfo.nutriscore.toUpperCase()}` : '',
            ].filter(Boolean).join(' | ')
          }));
          setShowAddModal(true);
          alert(`🌐 Produit trouvé en ligne : ${productInfo.nom || barcode}\nLes informations ont été pré-remplies.`);
        } else {
          setFormData(prev => ({ ...prev, barcode }));
          setShowAddModal(true);
          alert(`ℹ️ Produit non trouvé. Créez un nouvel article avec le code-barres : ${barcode}`);
        }
      } else {
        console.error('Erreur lors de la recherche par code-barres:', error);
        alert('Erreur lors de la recherche du produit.');
      }
    } finally {
      setScanLoading(false);
    }
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
          <button className="btn-inventory" onClick={printInventorySheet} title="Fiche Inventaire Papier">
            📋 Fiche Inventaire
          </button>
          <button className="btn-export-excel" onClick={exportToExcel} title="Exporter en Excel">
            📊 Exporter en Excel
          </button>
          <button className="btn-scanner" onClick={() => setShowScanner(true)} disabled={scanLoading}>
            {scanLoading ? '⏳ Recherche...' : '📷 Scanner Produit'}
          </button>
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            ➕ Ajouter un article
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

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

      {/* Tab Navigation */}
      <div className="stock-tabs">
        <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
          📋 Stock
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📤 الخروج والاستهلاك
        </button>
        <button className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}>
          📊 Graphiques
        </button>
        <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          📅 Calendrier
        </button>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* TAB: Stock (existing content)          */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'stock' && (
      <>

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
                        className="btn-action sortie"
                        onClick={() => openSortieModal(item)}
                        title="Sortie / خروج"
                      >
                        📤
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
                      <button 
                        className="btn-action history"
                        onClick={() => fetchItemHistory(item)}
                        title="Historique"
                      >
                        📜
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

      </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB: الخروج والاستهلاك (History)       */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="global-history-container">
          {/* Stats Summary Cards */}
          {globalHistory?.stats && (
            <div className="history-stats-cards">
              {(() => {
                const sortieCount = globalHistory.stats.find(s => s._id === 'sortie');
                const consoCount = globalHistory.stats.find(s => s._id === 'consommation');
                const totalSortie = sortieCount?.totalQuantite || 0;
                const totalConso = consoCount?.totalQuantite || 0;
                return (
                  <>
                    <div className="history-stat-card sortie">
                      <div className="hstat-icon">📤</div>
                      <div className="hstat-info">
                        <span className="hstat-value">{sortieCount?.count || 0}</span>
                        <span className="hstat-label">خروج / Sorties</span>
                        <span className="hstat-qty">{totalSortie.toFixed(1)} unités</span>
                      </div>
                    </div>
                    <div className="history-stat-card consommation">
                      <div className="hstat-icon">🍽️</div>
                      <div className="hstat-info">
                        <span className="hstat-value">{consoCount?.count || 0}</span>
                        <span className="hstat-label">استهلاك / Consommation</span>
                        <span className="hstat-qty">{totalConso.toFixed(1)} unités</span>
                      </div>
                    </div>
                    <div className="history-stat-card total-movement">
                      <div className="hstat-icon">📊</div>
                      <div className="hstat-info">
                        <span className="hstat-value">{(sortieCount?.count || 0) + (consoCount?.count || 0)}</span>
                        <span className="hstat-label">Total Mouvements</span>
                        <span className="hstat-qty">{(totalSortie + totalConso).toFixed(1)} unités</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Sortie Breakdown */}
          {globalHistory?.sortieBreakdown && globalHistory.sortieBreakdown.length > 0 && (
            <div className="sortie-breakdown">
              <h3>📤 Répartition des Sorties</h3>
              <div className="breakdown-chips">
                {globalHistory.sortieBreakdown.map((b, i) => {
                  const typeLabels = {
                    don: { label: 'تبرع / Don', icon: '🎁', color: '#43e97b' },
                    transfert: { label: 'تحويل / Transfert', icon: '🔄', color: '#667eea' },
                    perte: { label: 'خسارة / Perte', icon: '💔', color: '#f5576c' },
                    expire_jete: { label: 'منتهي / Expiré', icon: '🗑️', color: '#1f2937' },
                    retour_fournisseur: { label: 'إرجاع / Retour', icon: '↩️', color: '#f5a623' },
                    autre: { label: 'أخرى / Autre', icon: '📌', color: '#999' }
                  };
                  const info = typeLabels[b._id] || typeLabels.autre;
                  return (
                    <div key={i} className="breakdown-chip" style={{ borderColor: info.color }}>
                      <span className="chip-icon">{info.icon}</span>
                      <span className="chip-label">{info.label}</span>
                      <span className="chip-count" style={{ background: info.color }}>{b.count}</span>
                      <span className="chip-qty">{b.totalQuantite?.toFixed(1)} u.</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="history-filters">
            <div className="hfilter-group">
              <label>النوع / Type</label>
              <select
                value={historyFilters.action}
                onChange={(e) => {
                  const newF = { ...historyFilters, action: e.target.value, page: 1 };
                  setHistoryFilters(newF);
                  fetchGlobalHistory(newF);
                }}
              >
                <option value="sortie_consommation">الكل / Tout (Sorties + Consommation)</option>
                <option value="sortie">📤 خروج / Sorties uniquement</option>
                <option value="consommation">🍽️ استهلاك / Consommation uniquement</option>
                <option value="">📋 جميع الحركات / Tous les mouvements</option>
              </select>
            </div>
            {(historyFilters.action === 'sortie' || historyFilters.action === 'sortie_consommation') && (
              <div className="hfilter-group">
                <label>نوع الخروج / Type de sortie</label>
                <select
                  value={historyFilters.typeSortie}
                  onChange={(e) => {
                    const newF = { ...historyFilters, typeSortie: e.target.value, page: 1 };
                    setHistoryFilters(newF);
                    fetchGlobalHistory(newF);
                  }}
                >
                  <option value="">الكل / Tous</option>
                  <option value="don">🎁 تبرع / Don</option>
                  <option value="transfert">🔄 تحويل / Transfert</option>
                  <option value="perte">💔 خسارة / Perte</option>
                  <option value="expire_jete">🗑️ منتهي / Expiré jeté</option>
                  <option value="retour_fournisseur">↩️ إرجاع / Retour fournisseur</option>
                  <option value="autre">📌 أخرى / Autre</option>
                </select>
              </div>
            )}
            <div className="hfilter-group">
              <label>🔍 بحث / Recherche</label>
              <input
                type="text"
                placeholder="اسم المنتج / Nom du produit..."
                value={historyFilters.search}
                onChange={(e) => {
                  const newF = { ...historyFilters, search: e.target.value, page: 1 };
                  setHistoryFilters(newF);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchGlobalHistory(); }}
              />
            </div>
            <div className="hfilter-group">
              <label>من / Du</label>
              <input
                type="date"
                value={historyFilters.dateFrom}
                onChange={(e) => {
                  const newF = { ...historyFilters, dateFrom: e.target.value, page: 1 };
                  setHistoryFilters(newF);
                  fetchGlobalHistory(newF);
                }}
              />
            </div>
            <div className="hfilter-group">
              <label>إلى / Au</label>
              <input
                type="date"
                value={historyFilters.dateTo}
                onChange={(e) => {
                  const newF = { ...historyFilters, dateTo: e.target.value, page: 1 };
                  setHistoryFilters(newF);
                  fetchGlobalHistory(newF);
                }}
              />
            </div>
            <button className="hfilter-search-btn" onClick={() => fetchGlobalHistory()}>🔍 بحث</button>
            <button className="hfilter-reset-btn" onClick={() => {
              const resetF = { action: 'sortie_consommation', typeSortie: '', search: '', dateFrom: '', dateTo: '', page: 1 };
              setHistoryFilters(resetF);
              fetchGlobalHistory(resetF);
            }}>🔄 إعادة</button>
          </div>

          {/* History Table */}
          {globalHistoryLoading ? (
            <div className="loading-spinner" style={{ minHeight: '200px' }}>جاري التحميل...</div>
          ) : !globalHistory || globalHistory.history.length === 0 ? (
            <div className="empty-state"><p>لا توجد حركات / Aucun mouvement</p></div>
          ) : (
            <>
              <div className="history-table-wrapper">
                <table className="stock-table history-table">
                  <thead>
                    <tr>
                      <th>التاريخ / Date</th>
                      <th>المنتج / Produit</th>
                      <th>النوع / Type</th>
                      <th>الكمية / Quantité</th>
                      <th>المتبقي / Restant</th>
                      <th>تفاصيل / Détails</th>
                      <th>المستخدم / Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalHistory.history.map((h, idx) => {
                      const actionLabels = {
                        ajout: { icon: '➕', label: 'إضافة', labelFr: 'Ajout', color: '#43e97b' },
                        consommation: { icon: '🍽️', label: 'استهلاك', labelFr: 'Consommation', color: '#667eea' },
                        modification: { icon: '✏️', label: 'تعديل', labelFr: 'Modification', color: '#f5a623' },
                        reapprovisionnement: { icon: '📦', label: 'تزويد', labelFr: 'Réappro.', color: '#764ba2' },
                        sortie: { icon: '📤', label: 'خروج', labelFr: 'Sortie', color: '#f5576c' }
                      };
                      const info = actionLabels[h.action] || { icon: '📌', label: h.action, labelFr: h.action, color: '#999' };

                      const typeSortieLabels = {
                        don: { icon: '🎁', label: 'تبرع / Don' },
                        transfert: { icon: '🔄', label: 'تحويل / Transfert' },
                        perte: { icon: '💔', label: 'خسارة / Perte' },
                        expire_jete: { icon: '🗑️', label: 'منتهي / Expiré' },
                        retour_fournisseur: { icon: '↩️', label: 'إرجاع / Retour' },
                        autre: { icon: '📌', label: 'أخرى / Autre' }
                      };

                      return (
                        <tr key={idx} className={`history-row ${h.action}`}>
                          <td className="history-date-cell">
                            <div className="date-main">{new Date(h.date).toLocaleDateString('fr-FR')}</div>
                            <div className="date-time">{new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td>
                            <div className="product-name">{h.itemNom}</div>
                            <div className="product-cat">{categoryLabels[h.itemCategorie] || h.itemCategorie}</div>
                          </td>
                          <td>
                            <span className="action-badge" style={{ background: info.color }}>
                              {info.icon} {info.label}
                            </span>
                          </td>
                          <td className="qty-cell">
                            <span className="qty-value" style={{ color: info.color }}>
                              {h.action === 'ajout' || h.action === 'reapprovisionnement' ? '+' : '-'}{h.quantite} {h.itemUnite}
                            </span>
                          </td>
                          <td className="remaining-cell">{h.quantiteRestante} {h.itemUnite}</td>
                          <td className="details-cell">
                            {h.action === 'sortie' && h.typeSortie && (
                              <div className="detail-tag">
                                {(typeSortieLabels[h.typeSortie] || typeSortieLabels.autre).icon}{' '}
                                {(typeSortieLabels[h.typeSortie] || typeSortieLabels.autre).label}
                              </div>
                            )}
                            {h.destination && <div className="detail-dest">📍 {h.destination}</div>}
                            {h.notes && <div className="detail-notes">💬 {h.notes}</div>}
                          </td>
                          <td className="user-cell">
                            {h.utilisateur ? (
                              <span>👤 {h.utilisateur.name || h.utilisateur.email}</span>
                            ) : (
                              <span className="no-user">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {globalHistory.pagination && globalHistory.pagination.pages > 1 && (
                <div className="history-pagination">
                  <button
                    disabled={historyFilters.page <= 1}
                    onClick={() => {
                      const newF = { ...historyFilters, page: historyFilters.page - 1 };
                      setHistoryFilters(newF);
                      fetchGlobalHistory(newF);
                    }}
                  >◀ السابق</button>
                  <span className="page-info">
                    صفحة {globalHistory.pagination.page} / {globalHistory.pagination.pages}
                    ({globalHistory.pagination.total} نتيجة)
                  </span>
                  <button
                    disabled={historyFilters.page >= globalHistory.pagination.pages}
                    onClick={() => {
                      const newF = { ...historyFilters, page: historyFilters.page + 1 };
                      setHistoryFilters(newF);
                      fetchGlobalHistory(newF);
                    }}
                  >التالي ▶</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB: Graphiques & Analytics            */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'charts' && (
        <div className="charts-container">
          {!chartData ? (
            <div className="loading-spinner" style={{minHeight:'200px',color:'#333'}}>Chargement des graphiques...</div>
          ) : (
            <>
              <div className="charts-toolbar">
                <button className="btn-print" onClick={printCharts}>
                  🖨️ Imprimer Statistiques & Graphiques
                </button>
              </div>
              {/* Row 1: Pie Charts */}
              <div className="charts-row">
                <div className="chart-card">
                  <h3>🥧 Répartition par Catégorie</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={(chartData.parCategorie || []).map(c => ({
                          name: categoryLabels[c._id] || c._id,
                          value: c.count
                        }))}
                        cx="50%" cy="50%" outerRadius={100}
                        fill="#667eea" dataKey="value" label={({ name, value }) => `${value}`}
                      >
                        {(chartData.parCategorie || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>🔴 Répartition par Statut</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={(chartData.parStatut || []).map(s => ({
                          name: s._id === 'disponible' ? '✓ Disponible' : s._id === 'faible' ? '⚠ Faible' : s._id === 'critique' ? '⚠ Critique' : '✗ Expiré',
                          value: s.count
                        }))}
                        cx="50%" cy="50%" outerRadius={100}
                        fill="#43e97b" dataKey="value" label={({ name, value }) => `${value}`}
                      >
                        {(chartData.parStatut || []).map((s, i) => (
                          <Cell key={i} fill={STATUS_COLORS[s._id] || '#ccc'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 2: Bar chart — Valeur par catégorie */}
              <div className="chart-card full-width">
                <h3>💰 Valeur du Stock par Catégorie (DH)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={(chartData.valeurParCategorie || []).map(c => ({
                    nom: (categoryLabels[c._id] || c._id).replace(/^.{2}/, ''),
                    valeur: Math.round(c.valeur)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v} DH`} />
                    <Bar dataKey="valeur" fill="#667eea" radius={[8, 8, 0, 0]}>
                      {(chartData.valeurParCategorie || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Row 3: Top 10 articles + Line chart */}
              <div className="charts-row">
                <div className="chart-card">
                  <h3>🏆 Top 10 Articles (Quantité)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={(chartData.topArticles || []).map(a => ({
                      nom: a.nom.length > 15 ? a.nom.substring(0, 15) + '…' : a.nom,
                      quantite: a.quantite
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="nom" type="category" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="quantite" fill="#764ba2" radius={[0, 8, 8, 0]}>
                        {(chartData.topArticles || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>📈 Achats par Mois</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={(chartData.achatsParMois || []).map(m => ({
                      mois: monthNames[(m._id.month || 1) - 1]?.substring(0, 3) || '?',
                      articles: m.count,
                      valeur: Math.round(m.valeur)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="articles" stroke="#667eea" strokeWidth={3} dot={{ r: 5 }} name="Articles" />
                      <Line yAxisId="right" type="monotone" dataKey="valeur" stroke="#f5576c" strokeWidth={3} dot={{ r: 5 }} name="Valeur (DH)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB: Calendrier d'Expiration           */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="calendar-container">
          {!calendarData ? (
            <div className="loading-spinner" style={{minHeight:'200px',color:'#333'}}>Chargement du calendrier...</div>
          ) : (
            <>
              <div className="calendar-header-nav">
                <button className="cal-nav-btn" onClick={prevMonth}>◀</button>
                <h3>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h3>
                <button className="cal-nav-btn" onClick={nextMonth}>▶</button>
              </div>

              <div className="calendar-grid">
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                  <div key={d} className="calendar-day-header">{d}</div>
                ))}
                {getCalendarDays().map((day, idx) => {
                  const items = getItemsForDay(day);
                  const today = new Date();
                  const isToday = day && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear() && day === today.getDate();
                  const hasExpired = items.some(i => {
                    const d = Math.ceil((new Date(i.dateExpiration) - new Date()) / 86400000);
                    return d <= 0;
                  });
                  const hasWarning = items.some(i => {
                    const d = Math.ceil((new Date(i.dateExpiration) - new Date()) / 86400000);
                    return d > 0 && d <= 7;
                  });
                  return (
                    <div key={idx} className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${items.length > 0 ? 'has-items' : ''} ${hasExpired ? 'has-expired' : ''} ${hasWarning ? 'has-warning' : ''}`}>
                      {day && <span className="day-number">{day}</span>}
                      {items.length > 0 && (
                        <div className="day-items">
                          {items.slice(0, 3).map((item, i) => (
                            <div key={i} className={`day-item ${item.statut}`} title={`${item.nom} - ${item.quantite} ${item.unite}`}>
                              {item.nom.length > 10 ? item.nom.substring(0, 10) + '…' : item.nom}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="day-item more">+{items.length - 3} de plus</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Upcoming expirations list */}
              <div className="expiration-list">
                <h3>⏰ Prochaines Expirations</h3>
                <div className="exp-items">
                  {(calendarData.items || [])
                    .filter(i => Math.ceil((new Date(i.dateExpiration) - new Date()) / 86400000) > 0)
                    .slice(0, 20)
                    .map((item, idx) => {
                      const days = Math.ceil((new Date(item.dateExpiration) - new Date()) / 86400000);
                      return (
                        <div key={idx} className={`exp-item ${days <= 3 ? 'urgent' : days <= 7 ? 'warning' : days <= 30 ? 'soon' : ''}`}>
                          <div className="exp-info">
                            <strong>{item.nom}</strong>
                            <span className="exp-qty">{item.quantite} {item.unite}</span>
                          </div>
                          <div className="exp-date">
                            <span className="exp-days">{days}j</span>
                            <span className="exp-full-date">{new Date(item.dateExpiration).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📜 Historique — {historyData.nom}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="history-content">
              {historyData.historique.length === 0 ? (
                <div className="empty-state"><p>Aucun historique</p></div>
              ) : (
                <div className="history-timeline">
                  {historyData.historique.map((h, idx) => {
                    const actionLabels = {
                      ajout: { icon: '➕', label: 'Ajouté', color: '#43e97b' },
                      consommation: { icon: '🍽️', label: 'Consommé / استهلك', color: '#f5576c' },
                      modification: { icon: '✏️', label: 'Modifié', color: '#f5a623' },
                      reapprovisionnement: { icon: '📦', label: 'Réapprovisionné', color: '#667eea' },
                      sortie: { icon: '📤', label: 'خروج / Sorti', color: '#e74c3c' }
                    };
                    const info = actionLabels[h.action] || { icon: '📌', label: h.action, color: '#999' };
                    const typeSortieLabels = {
                      don: '🎁 تبرع/Don', transfert: '🔄 تحويل/Transfert', perte: '💔 خسارة/Perte',
                      expire_jete: '🗑️ منتهي/Expiré', retour_fournisseur: '↩️ إرجاع/Retour', autre: '📌 أخرى/Autre'
                    };
                    return (
                      <div key={idx} className="history-item">
                        <div className="history-dot" style={{ background: info.color }}></div>
                        <div className="history-line"></div>
                        <div className="history-card">
                          <div className="history-top">
                            <span className="history-action" style={{ color: info.color }}>
                              {info.icon} {info.label}
                            </span>
                            <span className="history-date">
                              {new Date(h.date).toLocaleDateString('fr-FR')} {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="history-details">
                            <span>Quantité : <strong>{h.quantite}</strong></span>
                            <span>Restant : <strong>{h.quantiteRestante}</strong></span>
                          </div>
                          {h.action === 'sortie' && h.typeSortie && (
                            <div className="history-sortie-type">📤 {typeSortieLabels[h.typeSortie] || h.typeSortie}</div>
                          )}
                          {h.destination && <div className="history-destination">📍 {h.destination}</div>}
                          {h.notes && <div className="history-notes">💬 {h.notes}</div>}
                          {h.utilisateur && <div className="history-user">👤 {h.utilisateur.name || h.utilisateur.email}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  <label>Code-barres</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ex: 3017620422003"
                  />
                </div>

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
                  <label>Code-barres</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ex: 3017620422003"
                  />
                </div>

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

      {/* Modal Sortie / خروج */}
      {showSortieModal && currentItem && (
        <div className="modal-overlay" onClick={() => setShowSortieModal(false)}>
          <div className="modal-content sortie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header sortie-header">
              <h2>📤 خروج / Sortie: {currentItem.nom}</h2>
              <button className="modal-close" onClick={() => setShowSortieModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSortie} className="sortie-form">
              <div className="current-stock-info">
                <span className="info-label">المخزون الحالي / Stock actuel :</span>
                <span className="info-value">{currentItem.quantite} {currentItem.unite}</span>
              </div>

              <div className="sortie-type-grid">
                {[
                  { value: 'don', icon: '🎁', label: 'تبرع', labelFr: 'Don' },
                  { value: 'transfert', icon: '🔄', label: 'تحويل', labelFr: 'Transfert' },
                  { value: 'perte', icon: '💔', label: 'خسارة', labelFr: 'Perte' },
                  { value: 'expire_jete', icon: '🗑️', label: 'منتهي', labelFr: 'Expiré/Jeté' },
                  { value: 'retour_fournisseur', icon: '↩️', label: 'إرجاع', labelFr: 'Retour fourn.' },
                  { value: 'autre', icon: '📌', label: 'أخرى', labelFr: 'Autre' }
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`sortie-type-btn ${sortieData.typeSortie === t.value ? 'active' : ''}`}
                    onClick={() => setSortieData({ ...sortieData, typeSortie: t.value })}
                  >
                    <span className="st-icon">{t.icon}</span>
                    <span className="st-label">{t.label}</span>
                    <span className="st-label-fr">{t.labelFr}</span>
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>الكمية / Quantité ({currentItem.unite}) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={currentItem.quantite}
                  step="0.01"
                  value={sortieData.quantite}
                  onChange={(e) => setSortieData({ ...sortieData, quantite: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="sortie-preview">
                <span className="preview-label">المخزون الجديد / Nouveau stock :</span>
                <span className="preview-value negative">
                  {(currentItem.quantite - (sortieData.quantite || 0)).toFixed(2)} {currentItem.unite}
                </span>
              </div>

              <div className="form-group">
                <label>الوجهة / Destination</label>
                <input
                  type="text"
                  value={sortieData.destination}
                  onChange={(e) => setSortieData({ ...sortieData, destination: e.target.value })}
                  placeholder="Ex: جمعية خيرية، مستشفى، مركز آخر..."
                />
              </div>

              <div className="form-group">
                <label>السبب / Raison</label>
                <textarea
                  value={sortieData.raison}
                  onChange={(e) => setSortieData({ ...sortieData, raison: e.target.value })}
                  rows="2"
                  placeholder="تفاصيل إضافية / Détails supplémentaires..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowSortieModal(false)}>
                  إلغاء / Annuler
                </button>
                <button type="submit" className="btn-submit btn-sortie-submit">
                  📤 تأكيد الخروج / Confirmer la sortie
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
