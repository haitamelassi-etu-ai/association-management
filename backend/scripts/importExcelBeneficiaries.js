/**
 * Import beneficiaries from "liste des benificaires (1).xlsx"
 * 
 * Excel column mapping (row 1 = headers):
 *   Col 21: ر.ت (row number)
 *   Col 20: الاسم الكامل (full name)
 *   Col 19: تاريخ الازدياد (birth date) 
 *   Col 18: مكان الازدياد (birth place)
 *   Col 17: العنوان (address)
 *   Col 16: الحالة الصحية (health status)
 *   Col 15: الجهة الموجهة (referring entity)
 *   Col 14: مكان التدخل (intervention place)
 *   Col 13: الحالة الاجتماعية (situation type)
 *   Col 12: ما بعد الايواء (post-shelter status)
 *   Col 11: تاريخ الايواء (entry date)
 *   Col 7:  تاريخ المغادرة (departure date)
 *   Col 5:  رقم البطاقة الوطنية (CIN)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

// Import the Beneficiary model
const Beneficiary = require('../models/Beneficiary');

// ─── DATE PARSING ───
function parseDate(val) {
  if (!val) return null;
  const s = val.toString().trim();
  if (!s) return null;

  // Excel serial number (5 digits, typically 20000-50000 range)
  const num = Number(s);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    if (d.getFullYear() > 1900 && d.getFullYear() < 2030) return d;
  }

  // Year only (e.g. "1976")
  if (/^\d{4}$/.test(s)) {
    return new Date(parseInt(s), 0, 1);
  }

  // YYYY.MM.DD (e.g. "2020.03.31")
  let m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,3})$/);
  if (m) {
    const day = parseInt(m[3]) > 31 ? 1 : parseInt(m[3]); // handle typos like "027"
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, day);
  }

  // DD/MM/YYYY (e.g. "13/01/1969")
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3]);
    if (year < 100) year += 1900;
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  }

  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }

  // YYYY.MM.DD with partial (e.g. "1978.08.08")
  m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (m) {
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }

  return null;
}

// ─── SITUATION TYPE NORMALIZATION ───
function normalizeSituationType(val) {
  if (!val) return 'mutasharrid';
  const s = val.toString().trim();

  // متشرد + متسول (all spacing variations)
  if (/متشرد.*متسول|متسول.*متشرد|متسرد/i.test(s)) {
    if (/متسول/.test(s)) return 'mutasharrid_mutasawwil';
    return 'mutasharrid';
  }
  if (s === 'متشرد' || s === 'كتشرد' || s === 'تشرد' || s === 'متسرد') return 'mutasharrid';
  if (s === 'متسول' || s === 'التسول') return 'tasawwul';
  if (s === 'عبر سبيل' || s === 'عابر سبيل') return 'autre';
  if (s === 'مغادرة') return 'mutasharrid'; // default

  return 'mutasharrid';
}

// ─── MA BAAD AL IWAA NORMALIZATION ───
function normalizeMaBaad(val) {
  if (!val) return 'nazil_bilmarkaz';
  const s = val.toString().trim();

  if (/نزيل/.test(s)) return 'nazil_bilmarkaz';
  if (s === 'مغادرة') return 'mughAdara';
  if (/ادماج|إدماج/.test(s)) return 'idmaj_usari';
  if (s === 'فرار' || s === 'فر ار') return 'firAr';
  if (s === 'طرد') return 'tard';
  if (s === 'وفاة') return 'wafat';
  if (/إحالة|احالة/.test(s)) return 'mughAdara'; // referral = departure
  if (/سافر/.test(s)) return 'mughAdara'; // traveled = departure

  return 'nazil_bilmarkaz';
}

// ─── DETERMINE STATUT FROM MA BAAD ───
function getStatut(maBaad) {
  switch (maBaad) {
    case 'nazil_bilmarkaz': return 'heberge';
    case 'mughAdara': return 'sorti';
    case 'idmaj_usari': return 'sorti';
    case 'firAr': return 'sorti';
    case 'tard': return 'sorti';
    case 'wafat': return 'sorti';
    default: return 'heberge';
  }
}

// ─── SPLIT NAME ───
function splitName(fullName) {
  if (!fullName) return { nom: 'غير معروف', prenom: '' };
  const parts = fullName.toString().trim().split(/\s+/);
  if (parts.length === 0) return { nom: 'غير معروف', prenom: '' };
  if (parts.length === 1) return { nom: parts[0], prenom: '' };
  // First part = first name (prenom), rest = last name (nom)
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

// ─── MAIN IMPORT ───
async function importData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read Excel
    const filePath = path.resolve(__dirname, '../../personnel-app/liste des benificaires (1).xlsx');
    console.log('📂 Reading Excel file:', filePath);
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['Feuil1'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    console.log(`📊 Total rows in Excel: ${data.length}`);

    // Check existing count
    const existingCount = await Beneficiary.countDocuments();
    console.log(`📋 Existing beneficiaries in DB: ${existingCount}`);

    const beneficiaries = [];
    let skipped = 0;
    let errors = [];

    // Data starts at row 2 (index 2), row 0 is empty, row 1 is headers
    for (let r = 2; r < data.length; r++) {
      const row = data[r];
      const fullName = row[20] ? row[20].toString().trim() : '';
      
      // Skip rows without a name
      if (!fullName) {
        skipped++;
        continue;
      }

      const { nom, prenom } = splitName(fullName);
      const situationType = normalizeSituationType(row[13]);
      const maBaadAlIwaa = normalizeMaBaad(row[12]);
      const dateEntree = parseDate(row[11]);
      const dateSortie = parseDate(row[7]);
      const dateNaissance = parseDate(row[19]);

      // Get serial number from Excel col 21, fallback to sequential
      const excelNum = row[21] ? parseInt(row[21]) : 0;

      const entry = {
        numeroOrdre: excelNum || (beneficiaries.length + 1),
        nom: nom || 'غير معروف',
        prenom: prenom || fullName,
        dateNaissance,
        lieuNaissance: row[18] ? row[18].toString().trim() : '',
        cin: row[5] ? row[5].toString().trim() : '',
        adresseOrigine: row[17] ? row[17].toString().trim() : '',
        etatSante: row[16] ? row[16].toString().trim() : '',
        entiteOrientatrice: row[15] ? row[15].toString().trim() : '',
        lieuIntervention: row[14] ? row[14].toString().trim() : '',
        situationType,
        maBaadAlIwaa,
        dateEntree: dateEntree || new Date(),
        dateSortie,
        statut: getStatut(maBaadAlIwaa),
        sexe: 'homme',
        nationalite: 'Marocaine'
      };

      beneficiaries.push(entry);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total data rows: ${data.length - 2}`);
    console.log(`   Valid beneficiaries to import: ${beneficiaries.length}`);
    console.log(`   Skipped (no name): ${skipped}`);

    // Show sample
    console.log(`\n📝 First 3 entries preview:`);
    beneficiaries.slice(0, 3).forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.prenom} ${b.nom} | ${b.lieuNaissance} | ${b.situationType} | ${b.maBaadAlIwaa} | ${b.statut} | Entry: ${b.dateEntree?.toLocaleDateString('fr-FR') || 'N/A'}`);
    });

    // Clear existing and insert
    console.log(`\n🗑️  Clearing existing ${existingCount} beneficiaries...`);
    await Beneficiary.deleteMany({});
    
    console.log(`📥 Inserting ${beneficiaries.length} beneficiaries...`);
    
    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < beneficiaries.length; i += batchSize) {
      const batch = beneficiaries.slice(i, i + batchSize);
      try {
        await Beneficiary.insertMany(batch, { ordered: false });
        inserted += batch.length;
        process.stdout.write(`\r   Progress: ${inserted}/${beneficiaries.length} (${Math.round(inserted/beneficiaries.length*100)}%)`);
      } catch (err) {
        // Some may fail validation, count successful ones
        if (err.insertedDocs) {
          inserted += err.insertedDocs.length;
          errors.push(`Batch ${Math.floor(i/batchSize)}: ${err.message.substring(0, 100)}`);
        } else {
          errors.push(`Batch ${Math.floor(i/batchSize)}: ${err.message.substring(0, 100)}`);
        }
        process.stdout.write(`\r   Progress: ${inserted}/${beneficiaries.length} (${Math.round(inserted/beneficiaries.length*100)}%)`);
      }
    }

    console.log('\n');

    // Final count
    const finalCount = await Beneficiary.countDocuments();
    console.log(`✅ Import complete!`);
    console.log(`   Total in database: ${finalCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} batch errors:`);
      errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    }

    // Stats
    const stats = await Beneficiary.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 } } }
    ]);
    console.log(`\n📊 Status breakdown:`);
    stats.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    const maBaadStats = await Beneficiary.aggregate([
      { $group: { _id: '$maBaadAlIwaa', count: { $sum: 1 } } }
    ]);
    console.log(`\n📊 Ma Baad Al Iwaa breakdown:`);
    maBaadStats.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importData();
