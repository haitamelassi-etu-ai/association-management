// Load heavy PDF libraries dynamically to avoid bundling them into the main chunk
// They will be imported at runtime only when the user requests a PDF export

import { SITE_INFO } from '../config/siteInfo'

// Add Arabic font support
const addArabicFont = (doc) => {
  // For now, we'll use a basic font. You can add custom Arabic font later
  doc.setFont('helvetica');
};

// Format date in French
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Generate Beneficiaries Report
export const generateBeneficiariesReport = async (beneficiaries, analytics) => {
  const [{ default: jsPDF }, _autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text(SITE_INFO.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.text('Rapport des Beneficiaires', 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  doc.text(`Genere le: ${formatDate(new Date())}`, 105, 38, { align: 'center' });
  
  // Statistics Summary
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text('Resume Statistique', 14, 50);
  
  const statsData = [
    ['Indicateur', 'Valeur'],
    ['Total Beneficiaires', analytics.beneficiaries.total.toString()],
    ['Actifs', analytics.beneficiaries.active.toString()],
    ['Sortis', analytics.beneficiaries.exited.toString()],
    ['Nouveaux ce mois', analytics.beneficiaries.newThisMonth.toString()],
    ['Taux de reussite', `${analytics.beneficiaries.successRate}%`],
  ];
  
  doc.autoTable({
    startY: 55,
    head: [statsData[0]],
    body: statsData.slice(1),
    theme: 'grid',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 11,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    margin: { left: 14, right: 14 }
  });
  
  // Beneficiaries List
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Liste des Beneficiaires', 14, finalY);
  
  const beneficiariesData = beneficiaries.slice(0, 50).map(b => [
    `${b.nom} ${b.prenom}`,
    b.age || 'N/A',
    b.statut === 'heberge' ? 'Heberge' : 
    b.statut === 'sorti' ? 'Sorti' : 
    b.statut === 'en_suivi' ? 'En Suivi' : 'Transfere',
    formatDate(b.dateEntree),
    b.dateSortie ? formatDate(b.dateSortie) : '-'
  ]);
  
  doc.autoTable({
    startY: finalY + 5,
    head: [['Nom Complet', 'Age', 'Statut', 'Date Entree', 'Date Sortie']],
    body: beneficiariesData,
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    margin: { left: 14, right: 14 }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`rapport-beneficiaires-${new Date().getTime()}.pdf`);
};

// Generate Monthly Report
export const generateMonthlyReport = async (analytics, beneficiaries, announcements) => {
  const [{ default: jsPDF }, _autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text(SITE_INFO.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.text(`Rapport Mensuel - ${monthName}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  doc.text(`Genere le: ${formatDate(now)}`, 105, 38, { align: 'center' });
  
  // Key Metrics
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text('Indicateurs Cles', 14, 50);
  
  const metricsData = [
    ['Indicateur', 'Ce Mois', 'Mois Dernier', 'Evolution'],
    [
      'Nouveaux Beneficiaires',
      analytics.beneficiaries.newThisMonth.toString(),
      analytics.beneficiaries.newLastMonth.toString(),
      `${analytics.beneficiaries.growthRate}%`
    ],
    [
      'Total Actifs',
      analytics.beneficiaries.active.toString(),
      '-',
      '-'
    ],
    [
      'Personnel Present',
      `${analytics.staff.todayAttendance}/${analytics.staff.total}`,
      '-',
      '-'
    ],
  ];
  
  doc.autoTable({
    startY: 55,
    head: [metricsData[0]],
    body: metricsData.slice(1),
    theme: 'grid',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      3: { fontStyle: 'bold', textColor: [46, 204, 113] }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Age Distribution
  let currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Repartition par Age', 14, currentY);
  
  const ageData = analytics.beneficiaries.byAge.map(item => [
    item._id,
    item.count.toString(),
    `${((item.count / analytics.beneficiaries.total) * 100).toFixed(1)}%`
  ]);
  
  doc.autoTable({
    startY: currentY + 5,
    head: [['Tranche d\'Age', 'Nombre', 'Pourcentage']],
    body: ageData,
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    margin: { left: 14, right: 14 }
  });
  
  // Recent Activity
  currentY = doc.lastAutoTable.finalY + 15;
  
  // Check if we need a new page
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(14);
  doc.text('Activites Recentes', 14, currentY);
  
  const recentBeneficiaries = beneficiaries
    .filter(b => new Date(b.createdAt).getMonth() === now.getMonth())
    .slice(0, 10)
    .map(b => [
      `${b.nom} ${b.prenom}`,
      formatDate(b.dateEntree),
      b.statut === 'heberge' ? 'Heberge' : 
      b.statut === 'sorti' ? 'Sorti' : 'En Suivi'
    ]);
  
  doc.autoTable({
    startY: currentY + 5,
    head: [['Nom', 'Date d\'Entree', 'Statut']],
    body: recentBeneficiaries.length > 0 ? recentBeneficiaries : [['Aucune activite ce mois', '', '']],
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    margin: { left: 14, right: 14 }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(
      `Page ${i} sur ${pageCount} - Confidentiel`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`rapport-mensuel-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}.pdf`);
};

// Generate Attendance Report
export const generateAttendanceReport = async (attendanceData, startDate, endDate) => {
  const [{ default: jsPDF }, _autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text(SITE_INFO.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(52, 152, 219);
  doc.text('Rapport de Presence du Personnel', 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  doc.text(
    `Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`,
    105,
    38,
    { align: 'center' }
  );
  
  // Attendance Table
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text('Details de Presence', 14, 50);
  
  const attendanceTableData = attendanceData.map(a => [
    `${a.user?.nom || ''} ${a.user?.prenom || ''}`,
    formatDate(a.checkIn),
    new Date(a.checkIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    a.checkOut ? new Date(a.checkOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
    a.checkOut ? `${((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60)).toFixed(1)}h` : '-'
  ]);
  
  doc.autoTable({
    startY: 55,
    head: [['Employe', 'Date', 'Arrivee', 'Depart', 'Duree']],
    body: attendanceTableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    margin: { left: 14, right: 14 }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`rapport-presence-${new Date().getTime()}.pdf`);
};
