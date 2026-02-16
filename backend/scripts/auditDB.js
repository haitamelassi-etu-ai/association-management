require('dotenv').config();
const mongoose = require('mongoose');
const B = require('../models/Beneficiary');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('=== DATABASE AUDIT ===\n');
  
  const total = await B.countDocuments();
  console.log('Total beneficiaries:', total);

  // Statut breakdown
  const byStatut = await B.aggregate([
    { $group: { _id: '$statut', count: { $sum: 1 } } }
  ]);
  console.log('\n--- Statut ---');
  byStatut.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // maBaadAlIwaa breakdown
  const byMaBaad = await B.aggregate([
    { $group: { _id: '$maBaadAlIwaa', count: { $sum: 1 } } }
  ]);
  console.log('\n--- maBaadAlIwaa ---');
  byMaBaad.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // situationType breakdown
  const bySituation = await B.aggregate([
    { $group: { _id: '$situationType', count: { $sum: 1 } } }
  ]);
  console.log('\n--- situationType ---');
  bySituation.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // sexe breakdown
  const bySexe = await B.aggregate([
    { $group: { _id: '$sexe', count: { $sum: 1 } } }
  ]);
  console.log('\n--- sexe ---');
  bySexe.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // Data quality issues
  const noName = await B.countDocuments({ $or: [{ nom: '' }, { prenom: '' }] });
  console.log('\n--- Data Quality ---');
  console.log('Missing/empty name:', noName);

  const noBirth = await B.countDocuments({ dateNaissance: null });
  console.log('Missing birth date:', noBirth);

  const noEntry = await B.countDocuments({ dateEntree: null });
  console.log('Missing entry date:', noEntry);

  const noOrdre = await B.countDocuments({ $or: [{ numeroOrdre: 0 }, { numeroOrdre: null }] });
  console.log('Missing serial number:', noOrdre);

  // Duplicate serial numbers
  const dups = await B.aggregate([
    { $group: { _id: '$numeroOrdre', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  console.log('\nDuplicate serial numbers:');
  if (dups.length === 0) console.log('  None');
  else dups.forEach(d => console.log('  #' + d._id, ':', d.count, 'times'));

  // Invalid maBaadAlIwaa values (not in enum)
  const validMaBaad = ['nazil_bilmarkaz', 'mughAdara', 'idmaj_usari', 'firAr', 'tard', 'wafat', ''];
  const invalidMaBaad = await B.find({ maBaadAlIwaa: { $nin: validMaBaad } }).select('maBaadAlIwaa prenom nom').limit(10);
  console.log('\nInvalid maBaadAlIwaa values:');
  if (invalidMaBaad.length === 0) console.log('  None');
  else invalidMaBaad.forEach(b => console.log('  ', b.prenom, b.nom, ':', b.maBaadAlIwaa));

  // Invalid situationType values
  const validSituation = ['mutasharrid', 'mutasharrid_mutasawwil', 'tasawwul', 'tasharrud', 'autre'];
  const invalidSituation = await B.find({ situationType: { $nin: validSituation } }).select('situationType prenom nom').limit(10);
  console.log('\nInvalid situationType values:');
  if (invalidSituation.length === 0) console.log('  None');
  else invalidSituation.forEach(b => console.log('  ', b.prenom, b.nom, ':', b.situationType));

  // Statut mismatch (heberge but maBaad is not nazil)
  const mismatch1 = await B.countDocuments({ statut: 'heberge', maBaadAlIwaa: { $ne: 'nazil_bilmarkaz' } });
  const mismatch2 = await B.countDocuments({ statut: 'sorti', maBaadAlIwaa: 'nazil_bilmarkaz' });
  console.log('\nStatut/maBaad mismatches:');
  console.log('  heberge but not nazil:', mismatch1);
  console.log('  sorti but nazil:', mismatch2);

  // Check etatSante values
  const byHealth = await B.aggregate([
    { $group: { _id: '$etatSante', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\n--- etatSante values ---');
  byHealth.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // Check entiteOrientatrice values
  const byEntite = await B.aggregate([
    { $group: { _id: '$entiteOrientatrice', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\n--- entiteOrientatrice values ---');
  byEntite.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // Check lieuIntervention values
  const byLieu = await B.aggregate([
    { $group: { _id: '$lieuIntervention', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\n--- lieuIntervention values ---');
  byLieu.forEach(s => console.log(' ', s._id || '(empty)', ':', s.count));

  // Check weird dates (future or too old)
  const futureBirth = await B.countDocuments({ dateNaissance: { $gt: new Date() } });
  const tooOldBirth = await B.countDocuments({ dateNaissance: { $lt: new Date('1900-01-01') } });
  console.log('\n--- Date issues ---');
  console.log('  Birth dates in future:', futureBirth);
  console.log('  Birth dates before 1900:', tooOldBirth);

  const futureEntry = await B.countDocuments({ dateEntree: { $gt: new Date() } });
  console.log('  Entry dates in future:', futureEntry);

  await mongoose.disconnect();
  console.log('\nDone!');
})();
