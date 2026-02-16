require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const B = require('../models/Beneficiary');

function parseFlexDate(val) {
  if (!val) return null;
  const s = val.toString().trim();
  if (!s) return null;
  const num = Number(s);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + num * 86400000);
    if (d.getFullYear() > 1900 && d.getFullYear() < 2030) return d;
  }
  if (/^\d{4}$/.test(s)) return new Date(parseInt(s), 0, 1);
  let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) { let yr = parseInt(m[3]); if (yr < 100) yr += 1900; return new Date(yr, parseInt(m[2]) - 1, parseInt(m[1])); }
  m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,3})$/);
  if (m) { const day = parseInt(m[3]) > 31 ? 1 : parseInt(m[3]); return new Date(parseInt(m[1]), parseInt(m[2]) - 1, day); }
  return null;
}

function normSituation(s) {
  if (!s) return 'mutasharrid';
  const t = s.toString().trim();
  if (/متشرد.*متسول|متسول.*متشرد/.test(t)) return 'mutasharrid_mutasawwil';
  if (/^متشرد$|^كتشرد$|^متسرد$/.test(t)) return 'mutasharrid';
  if (t === 'تشرد') return 'tasharrud';
  if (/التسول|^متسول$|تسول/.test(t)) return 'tasawwul';
  if (/عبر سبيل|عابر سبيل/.test(t)) return 'autre';
  return 'mutasharrid';
}

function normMaBaad(s) {
  if (!s) return 'nazil_bilmarkaz';
  const t = s.toString().trim();
  if (/نزيل/.test(t)) return 'nazil_bilmarkaz';
  if (t === 'مغادرة') return 'mughAdara';
  if (/ادماج|إدماج/.test(t)) return 'idmaj_usari';
  if (t === 'فرار' || t === 'فر ار') return 'firAr';
  if (t === 'طرد') return 'tard';
  if (t === 'وفاة') return 'wafat';
  if (/إحالة|احالة|سافر/.test(t)) return 'mughAdara';
  return 'nazil_bilmarkaz';
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const wb = XLSX.readFile(__dirname + '/../neveau_list.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Find header row
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(rawData.length, 10); r++) {
    const row = rawData[r];
    const nonEmpty = row.filter(c => c && c.toString().trim() !== '').length;
    if (nonEmpty >= 3) { headerRowIdx = r; break; }
  }
  console.log('Header row at index:', headerRowIdx);

  const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIdx, defval: '' });
  console.log('Total rows:', data.length);

  // Delete existing
  const existing = await B.countDocuments();
  console.log('Deleting', existing, 'existing...');
  await B.deleteMany({});

  const entries = [];
  let skip = 0;

  for (const row of data) {
    const name = row['الاسم الكامل'];
    if (!name || !name.toString().trim()) { skip++; continue; }

    const parts = name.toString().trim().split(/\s+/);
    const prenom = parts[0];
    const nom = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    const mb = normMaBaad(row['ما بعد الايواء']);

    entries.push({
      numeroOrdre: parseInt(row['ر.ت']) || 0,
      prenom,
      nom,
      dateNaissance: parseFlexDate(row['تاريخ الازدياد']),
      lieuNaissance: (row['مكان الازدياد'] || '').toString().trim(),
      adresseOrigine: (row['العنوان'] || '').toString().trim(),
      etatSante: (row['الحالة الصحية'] || '').toString().trim(),
      entiteOrientatrice: (row['الجهة الموجهة'] || '').toString().trim(),
      lieuIntervention: (row['مكان التدخل'] || '').toString().trim(),
      situationType: normSituation(row['الحالة الاجتماعية']),
      maBaadAlIwaa: mb,
      dateEntree: parseFlexDate(row['تاريخ الايواء']) || new Date(),
      dateSortie: parseFlexDate(row['تاريخ المغادرة']),
      cin: (row['رقم البطاقة الوطنية'] || '').toString().trim(),
      statut: mb === 'nazil_bilmarkaz' ? 'heberge' : 'sorti',
      sexe: 'homme',
      nationalite: 'Marocaine'
    });
  }

  console.log('Valid entries:', entries.length, '| Skipped:', skip);

  // Insert in batches
  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await B.insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write('\r  Progress: ' + inserted + '/' + entries.length);
  }

  const total = await B.countDocuments();
  console.log('\nTotal in DB:', total);

  // Stats
  const stats = await B.aggregate([
    { $group: { _id: '$maBaadAlIwaa', count: { $sum: 1 } } }
  ]);
  console.log('\nBreakdown:');
  stats.forEach(s => console.log(' ', s._id, ':', s.count));

  // Verify serial numbers
  const first = await B.find().sort({ numeroOrdre: 1 }).limit(3).select('numeroOrdre prenom nom');
  const last = await B.find().sort({ numeroOrdre: -1 }).limit(3).select('numeroOrdre prenom nom');
  console.log('\nFirst 3:');
  first.forEach(b => console.log(' ', b.numeroOrdre, b.prenom, b.nom));
  console.log('Last 3:');
  last.forEach(b => console.log(' ', b.numeroOrdre, b.prenom, b.nom));

  await mongoose.disconnect();
  console.log('\nDone!');
})();
