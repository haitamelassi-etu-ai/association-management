const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté');

    const PharmacyStock = mongoose.connection.collection('pharmacystocks');

    // Drop old unique index on medicationName
    console.log('\n🗑️ Suppression ancien index unique...');
    try {
      await PharmacyStock.dropIndex('medicationName_1');
      console.log('✅ Index medicationName_1 supprimé');
    } catch (err) {
      console.log('⚠️ Index medicationName_1 n\'existe pas ou déjà supprimé');
    }

    // Create new compound unique index
    console.log('\n✨ Création nouveau compound index...');
    await PharmacyStock.createIndex(
      { medicationName: 1, strength: 1, dosageForm: 1 },
      { unique: true, name: 'medication_compound_unique' }
    );
    console.log('✅ Compound index créé: medicationName + strength + dosageForm');

    // List all indexes
    console.log('\n📋 Liste des indexes actuels:');
    const indexes = await PharmacyStock.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Migration terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixIndexes();
