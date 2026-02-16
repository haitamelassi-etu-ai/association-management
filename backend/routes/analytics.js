const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// ─── COMPREHENSIVE BENEFICIARY ANALYTICS ───
// @route GET /api/analytics/beneficiaries/full
router.get('/beneficiaries/full', protect, async (req, res) => {
  try {
    const all = await Beneficiary.find({}).lean();
    const now = new Date();

    // ── 1. Overview KPIs ──
    const total = all.length;
    const heberge = all.filter(b => b.statut === 'heberge').length;
    const sorti = all.filter(b => b.statut === 'sorti').length;
    const withCIN = all.filter(b => b.cin && b.cin.trim()).length;
    const withoutCIN = total - withCIN;

    // ── 2. مابعد الايواء (Post-shelter status) ──
    const maBaadLabels = {
      nazil_bilmarkaz: 'نزيل بالمركز',
      mughAdara: 'مغادرة',
      idmaj_usari: 'إدماج أسري',
      firAr: 'فرار',
      tard: 'طرد',
      wafat: 'وفاة'
    };
    const maBaadCounts = {};
    all.forEach(b => {
      const key = b.maBaadAlIwaa || 'nazil_bilmarkaz';
      maBaadCounts[key] = (maBaadCounts[key] || 0) + 1;
    });
    const maBaadData = Object.entries(maBaadCounts).map(([k, v]) => ({
      name: maBaadLabels[k] || k,
      key: k,
      value: v,
      percent: ((v / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // ── 3. الحالة الاجتماعية (Situation type) ──
    const situationLabels = {
      mutasharrid: 'متشرد',
      mutasharrid_mutasawwil: 'متشرد + متسول',
      tasawwul: 'تسول',
      tasharrud: 'تشرد',
      autre: 'أخرى'
    };
    const situationCounts = {};
    all.forEach(b => {
      const key = b.situationType || 'autre';
      situationCounts[key] = (situationCounts[key] || 0) + 1;
    });
    const situationData = Object.entries(situationCounts).map(([k, v]) => ({
      name: situationLabels[k] || k,
      key: k,
      value: v,
      percent: ((v / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // ── 4. الحالة الصحية (Health status) ──
    const healthCounts = {};
    all.forEach(b => {
      const key = b.etatSante || 'غير محدد';
      healthCounts[key] = (healthCounts[key] || 0) + 1;
    });
    const healthData = Object.entries(healthCounts).map(([k, v]) => ({
      name: k,
      value: v,
      percent: ((v / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // ── 5. مكان التدخل (Intervention places) ──
    const lieuCounts = {};
    all.forEach(b => {
      const key = b.lieuIntervention || 'غير محدد';
      lieuCounts[key.trim()] = (lieuCounts[key.trim()] || 0) + 1;
    });
    const lieuData = Object.entries(lieuCounts).map(([k, v]) => ({
      name: k,
      value: v,
      percent: ((v / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // ── 6. الجهة الموجهة (Referring entity) ──
    const entityCounts = {};
    all.forEach(b => {
      const key = b.entiteOrientatrice || 'غير محدد';
      entityCounts[key.trim()] = (entityCounts[key.trim()] || 0) + 1;
    });
    const entityData = Object.entries(entityCounts).map(([k, v]) => ({
      name: k,
      value: v,
      percent: ((v / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // ── 7. مكان الازدياد (Birth places) ──
    const birthPlaceCounts = {};
    all.forEach(b => {
      const key = b.lieuNaissance || 'غير محدد';
      birthPlaceCounts[key.trim()] = (birthPlaceCounts[key.trim()] || 0) + 1;
    });
    const birthPlaceData = Object.entries(birthPlaceCounts)
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // Top 20 cities

    // ── 8. Age distribution ──
    const ageGroups = { '< 20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60-69': 0, '70+': 0, 'غير محدد': 0 };
    all.forEach(b => {
      if (!b.dateNaissance) { ageGroups['غير محدد']++; return; }
      const birth = new Date(b.dateNaissance);
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      
      if (age < 20) ageGroups['< 20']++;
      else if (age < 30) ageGroups['20-29']++;
      else if (age < 40) ageGroups['30-39']++;
      else if (age < 50) ageGroups['40-49']++;
      else if (age < 60) ageGroups['50-59']++;
      else if (age < 70) ageGroups['60-69']++;
      else ageGroups['70+']++;
    });
    const ageData = Object.entries(ageGroups)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v, percent: ((v / total) * 100).toFixed(1) }));

    // ── 9. Entry timeline (by year) ──
    const entryByYear = {};
    all.forEach(b => {
      if (!b.dateEntree) return;
      const year = new Date(b.dateEntree).getFullYear();
      entryByYear[year] = (entryByYear[year] || 0) + 1;
    });
    const entryTimelineData = Object.entries(entryByYear)
      .sort(([a], [b]) => a - b)
      .map(([year, count]) => ({ name: year, value: count }));

    // ── 10. Entry timeline (by month for recent 2 years) ──
    const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
    const entryByMonth = {};
    all.forEach(b => {
      if (!b.dateEntree) return;
      const d = new Date(b.dateEntree);
      if (d < twoYearsAgo) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      entryByMonth[key] = (entryByMonth[key] || 0) + 1;
    });
    const monthlyEntryData = Object.entries(entryByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        const [year, month] = k.split('-');
        return { name: `${monthNames[parseInt(month) - 1]} ${year}`, value: v };
      });

    // ── 11. Departure timeline (by year) ──
    const departByYear = {};
    all.filter(b => b.dateSortie).forEach(b => {
      const year = new Date(b.dateSortie).getFullYear();
      departByYear[year] = (departByYear[year] || 0) + 1;
    });
    const departTimelineData = Object.entries(departByYear)
      .sort(([a], [b]) => a - b)
      .map(([year, count]) => ({ name: year, value: count }));

    // ── 12. Duration of stay (for those who left) ──
    const stayDurations = { '< 1 شهر': 0, '1-3 أشهر': 0, '3-6 أشهر': 0, '6-12 شهر': 0, '1-2 سنة': 0, '2-3 سنوات': 0, '3+ سنوات': 0 };
    all.filter(b => b.dateEntree && b.dateSortie).forEach(b => {
      const days = (new Date(b.dateSortie) - new Date(b.dateEntree)) / (1000 * 60 * 60 * 24);
      if (days < 30) stayDurations['< 1 شهر']++;
      else if (days < 90) stayDurations['1-3 أشهر']++;
      else if (days < 180) stayDurations['3-6 أشهر']++;
      else if (days < 365) stayDurations['6-12 شهر']++;
      else if (days < 730) stayDurations['1-2 سنة']++;
      else if (days < 1095) stayDurations['2-3 سنوات']++;
      else stayDurations['3+ سنوات']++;
    });
    const stayDurationData = Object.entries(stayDurations)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }));

    // ── 13. Average stay duration ──
    const withDates = all.filter(b => b.dateEntree && b.dateSortie);
    const avgStayDays = withDates.length > 0
      ? (withDates.reduce((sum, b) => sum + (new Date(b.dateSortie) - new Date(b.dateEntree)) / (1000 * 60 * 60 * 24), 0) / withDates.length).toFixed(0)
      : 0;

    // ── 14. Entry vs Exit comparison by year ──
    const years = [...new Set([...Object.keys(entryByYear), ...Object.keys(departByYear)])].sort();
    const entryVsExitData = years.map(y => ({
      name: y,
      entries: entryByYear[y] || 0,
      exits: departByYear[y] || 0
    }));

    // ── 15. CIN statistics ──
    const cinData = [
      { name: 'مع بطاقة', value: withCIN },
      { name: 'بدون بطاقة', value: withoutCIN }
    ];

    res.json({
      success: true,
      data: {
        overview: { total, heberge, sorti, withCIN, withoutCIN, avgStayDays: parseInt(avgStayDays) },
        maBaad: maBaadData,
        situation: situationData,
        health: healthData,
        lieuIntervention: lieuData,
        entiteOrientatrice: entityData,
        birthPlace: birthPlaceData,
        age: ageData,
        entryTimeline: entryTimelineData,
        monthlyEntry: monthlyEntryData,
        departTimeline: departTimelineData,
        stayDuration: stayDurationData,
        entryVsExit: entryVsExitData,
        cin: cinData
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Manager, Staff)
router.get('/dashboard', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total beneficiaries
    const totalBeneficiaries = await Beneficiary.countDocuments();
    
    // Active beneficiaries (not exited)
    const activeBeneficiaries = await Beneficiary.countDocuments({
      statut: { $in: ['actif', 'en_attente'] }
    });
    
    // Exited beneficiaries
    const exitedBeneficiaries = await Beneficiary.countDocuments({
      statut: 'sorti'
    });
    
    // New beneficiaries this month
    const newThisMonth = await Beneficiary.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // New beneficiaries last month
    const newLastMonth = await Beneficiary.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    });
    
    // Beneficiaries by age groups
    const beneficiariesByAge = await Beneficiary.aggregate([
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 18] }, then: '0-17' },
                { case: { $and: [{ $gte: ['$age', 18] }, { $lt: ['$age', 30] }] }, then: '18-29' },
                { case: { $and: [{ $gte: ['$age', 30] }, { $lt: ['$age', 50] }] }, then: '30-49' },
                { case: { $and: [{ $gte: ['$age', 50] }, { $lt: ['$age', 65] }] }, then: '50-64' },
              ],
              default: '65+'
            }
          }
        }
      },
      {
        $group: {
          _id: '$ageGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Monthly statistics for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyStats = await Beneficiary.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format monthly stats
    const formattedMonthlyStats = monthlyStats.map(stat => ({
      month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
      count: stat.count
    }));
    
    // Staff statistics
    const totalStaff = await User.countDocuments({ role: 'staff' });
    const activeStaff = await User.countDocuments({ 
      role: 'staff',
      statut: 'actif'
    });
    
    // Today's attendance
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const todayAttendance = await Attendance.countDocuments({
      checkIn: { $gte: todayStart, $lte: todayEnd }
    });
    
    // Success rate (beneficiaries who exited successfully vs total exited)
    const successfulExits = await Beneficiary.countDocuments({
      statut: 'sorti',
      typeDepart: 'réinsertion'
    });
    const successRate = exitedBeneficiaries > 0 
      ? ((successfulExits / exitedBeneficiaries) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        beneficiaries: {
          total: totalBeneficiaries,
          active: activeBeneficiaries,
          exited: exitedBeneficiaries,
          newThisMonth,
          newLastMonth,
          growthRate: newLastMonth > 0 
            ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)
            : 0,
          byAge: beneficiariesByAge,
          monthlyStats: formattedMonthlyStats,
          successRate: parseFloat(successRate)
        },
        staff: {
          total: totalStaff,
          active: activeStaff,
          todayAttendance
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @desc    Get beneficiary statistics by status
// @route   GET /api/analytics/beneficiaries/status
// @access  Private (Admin, Manager, Staff)
router.get('/beneficiaries/status', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const statusStats = await Beneficiary.aggregate([
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: statusStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @desc    Get attendance statistics
// @route   GET /api/analytics/attendance
// @access  Private (Admin, Manager, Staff)
router.get('/attendance', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          checkIn: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$checkIn' }
          },
          count: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: [
                { $ne: ['$checkOut', null] },
                { $subtract: ['$checkOut', '$checkIn'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert duration from milliseconds to hours
    const formattedStats = attendanceStats.map(stat => ({
      date: stat._id,
      count: stat.count,
      avgHours: stat.avgDuration > 0 ? (stat.avgDuration / (1000 * 60 * 60)).toFixed(2) : 0
    }));

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

module.exports = router;
