require('dotenv').config();
const mongoose = require('mongoose');
const B = require('../models/Beneficiary');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('=== FIXING DATABASE ===\n');

  let totalFixed = 0;

  // ─── FIX etatSante (Health Status) ───
  console.log('--- Fixing etatSante ---');
  const healthFixes = {
    // Normalize مختل variations
    'مختل عقلي': 'مختل عقليا',
    'مختل ذهنيا': 'مختل عقليا',
    'مختل ذهنبا': 'مختل عقليا',  // typo
    'مختل اعاقة جسدية': 'مختل + إعاقة جسدية',
    'مختل+اعاقة جسدية': 'مختل + إعاقة جسدية',
    // Normalize إعاقة variations  
    'اعاقة حركية': 'إعاقة حركية',
    'اعاقة جسدية': 'إعاقة جسدية',
    'معاق جسديا': 'إعاقة جسدية',
    'اعاقة بصرية': 'إعاقة بصرية',
    'اعاقة مركبة': 'إعاقة مركبة',
    'اعاقة حسية': 'إعاقة حسية',
    'إعاقة ذهنية': 'مختل عقليا',
    // Typos
    'حيدة': 'جيدة',  // typo for جيدة
    'غير صحية': 'غير جيدة',
    'متوسطة': 'متوسطة الخطورة'
  };

  for (const [from, to] of Object.entries(healthFixes)) {
    const r = await B.updateMany({ etatSante: from }, { $set: { etatSante: to } });
    if (r.modifiedCount > 0) {
      console.log('  ', from, '->', to, ':', r.modifiedCount);
      totalFixed += r.modifiedCount;
    }
  }

  // ─── FIX entiteOrientatrice (Referring Entity) ───
  console.log('\n--- Fixing entiteOrientatrice ---');
  const entityFixes = {
    'السلطات المحلية': 'السلطة المحلية',
    'االسلطة المحلية': 'السلطة المحلية',  // double alef
    'اليسلطة المحلية': 'السلطة المحلية',  // typo
    'السلطة المجلية': 'السلطة المحلية',  // typo
    'السلطة المجاية': 'السلطة المحلية',  // typo
    'السلطة المحلي': 'السلطة المحلية',  // missing ة
    'السلظة المحلية': 'السلطة المحلية',  // typo ظ→ط
    'السلطةة المحلية': 'السلطة المحلية',  // double ة
    'سلطة المحلية': 'السلطة المحلية',  // missing ال
    'االتعاون الوطني': 'التعاون الوطني',  // double alef
    'التعاون الوطني': 'مندوبية التعاون الوطني',
    'امستشفى 20 غشت': 'مستشفى 20 غشت',  // extra alef
    'م+F612:R613': 'السلطة المحلية',  // Excel formula error
  };

  for (const [from, to] of Object.entries(entityFixes)) {
    const r = await B.updateMany({ entiteOrientatrice: from }, { $set: { entiteOrientatrice: to } });
    if (r.modifiedCount > 0) {
      console.log('  ', from, '->', to, ':', r.modifiedCount);
      totalFixed += r.modifiedCount;
    }
  }

  // ─── FIX lieuIntervention (Intervention Place) ───
  console.log('\n--- Fixing lieuIntervention ---');
  const lieuFixes = {
    'صخور السوداء': 'الصخور السوداء',  // missing ال
    'االصخور السوداء': 'الصخور السوداء',  // double alef
    'الحثي المحمدي': 'الحي المحمدي',  // typo ث→ي
    'اخر': 'أخرى',
  };

  for (const [from, to] of Object.entries(lieuFixes)) {
    const r = await B.updateMany({ lieuIntervention: from }, { $set: { lieuIntervention: to } });
    if (r.modifiedCount > 0) {
      console.log('  ', from, '->', to, ':', r.modifiedCount);
      totalFixed += r.modifiedCount;
    }
  }

  // ─── TRIM leading/trailing spaces in lieuIntervention ───
  console.log('\n--- Trimming spaces ---');
  const withSpaces = await B.find({ 
    $or: [
      { lieuIntervention: /^\s|\s$/ },
      { entiteOrientatrice: /^\s|\s$/ },
      { etatSante: /^\s|\s$/ },
      { adresseOrigine: /^\s|\s$/ },
      { nom: /^\s|\s$/ },
      { prenom: /^\s|\s$/ }
    ]
  });
  
  for (const b of withSpaces) {
    const updates = {};
    if (b.lieuIntervention && b.lieuIntervention !== b.lieuIntervention.trim()) updates.lieuIntervention = b.lieuIntervention.trim();
    if (b.entiteOrientatrice && b.entiteOrientatrice !== b.entiteOrientatrice.trim()) updates.entiteOrientatrice = b.entiteOrientatrice.trim();
    if (b.etatSante && b.etatSante !== b.etatSante.trim()) updates.etatSante = b.etatSante.trim();
    if (b.adresseOrigine && b.adresseOrigine !== b.adresseOrigine.trim()) updates.adresseOrigine = b.adresseOrigine.trim();
    if (b.nom && b.nom !== b.nom.trim()) updates.nom = b.nom.trim();
    if (b.prenom && b.prenom !== b.prenom.trim()) updates.prenom = b.prenom.trim();
    
    if (Object.keys(updates).length > 0) {
      await B.updateOne({ _id: b._id }, { $set: updates });
      totalFixed++;
    }
  }
  console.log('  Trimmed spaces for', withSpaces.length, 'records');

  // ─── FIX duplicate serial number 380 ───
  console.log('\n--- Fixing duplicate serial numbers ---');
  const dup380 = await B.find({ numeroOrdre: 380 }).sort({ _id: 1 });
  if (dup380.length > 1) {
    // Renumber the second one
    const maxOrdre = await B.findOne().sort({ numeroOrdre: -1 }).select('numeroOrdre');
    const newNum = (maxOrdre?.numeroOrdre || 0) + 1;
    await B.updateOne({ _id: dup380[1]._id }, { $set: { numeroOrdre: newNum } });
    console.log('  Duplicate #380 - second entry renumbered to', newNum);
    totalFixed++;
  }

  // ─── FIX birth date before 1900 ───
  console.log('\n--- Fixing invalid dates ---');
  const oldBirth = await B.find({ dateNaissance: { $lt: new Date('1900-01-01') } }).select('prenom nom dateNaissance');
  for (const b of oldBirth) {
    console.log('  ', b.prenom, b.nom, ': birth date', b.dateNaissance?.toISOString(), '-> removing');
    await B.updateOne({ _id: b._id }, { $unset: { dateNaissance: '' } });
    totalFixed++;
  }

  // ─── VERIFY RESULTS ───
  console.log('\n=== VERIFICATION ===');
  console.log('Total fixes applied:', totalFixed);

  const byHealth = await B.aggregate([
    { $group: { _id: '$etatSante', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\netatSante (after fix):');
  byHealth.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  const byEntite = await B.aggregate([
    { $group: { _id: '$entiteOrientatrice', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nentiteOrientatrice (after fix):');
  byEntite.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  const byLieu = await B.aggregate([
    { $group: { _id: '$lieuIntervention', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nlieuIntervention (after fix):');
  byLieu.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  await mongoose.disconnect();
  console.log('\nDone!');
})();
