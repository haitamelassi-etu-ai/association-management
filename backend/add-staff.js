// Script pour ajouter des Staff members
const http = require('http');

const staffMembers = [
  {
    nom: 'Alami',
    prenom: 'Hassan',
    email: 'staff@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    telephone: '0612345679',
    poste: 'Éducateur social',
    shift: 'jour',
    status: 'active'
  },
  {
    nom: 'Bennani',
    prenom: 'Fatima',
    email: 'fatima.bennani@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    telephone: '0612345680',
    poste: 'Assistant social',
    shift: 'jour',
    status: 'active'
  },
  {
    nom: 'Tazi',
    prenom: 'Mohamed',
    email: 'mohamed.tazi@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    telephone: '0612345681',
    poste: 'Infirmier',
    shift: 'nuit',
    status: 'active'
  },
  {
    nom: 'Idrissi',
    prenom: 'Samira',
    email: 'samira.idrissi@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    telephone: '0612345682',
    poste: 'Psychologue',
    shift: 'jour',
    status: 'active'
  },
  {
    nom: 'El Amrani',
    prenom: 'Youssef',
    email: 'youssef.amrani@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    telephone: '0612345683',
    poste: 'Agent de nuit',
    shift: 'nuit',
    status: 'active'
  }
];

let currentIndex = 0;

function registerStaff(staffData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(staffData);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function addAllStaff() {
  console.log('🚀 Ajout des membres du personnel...\n');

  for (const staff of staffMembers) {
    try {
      console.log(`📝 Ajout: ${staff.nom} ${staff.prenom} (${staff.email})...`);
      const result = await registerStaff(staff);
      
      if (result.success) {
        console.log(`✅ ${staff.nom} ${staff.prenom} ajouté avec succès!`);
        console.log(`   📧 Email: ${staff.email}`);
        console.log(`   🔐 Password: staff123`);
        console.log(`   👔 Poste: ${staff.poste}`);
        console.log(`   ⏰ Shift: ${staff.shift === 'jour' ? '☀️ Jour' : '🌙 Nuit'}\n`);
      } else {
        console.log(`⚠️  ${staff.nom}: ${result.message}\n`);
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${staff.nom}:`, error.message, '\n');
    }
  }

  console.log('\n✨ Terminé! Tous les staff ont été ajoutés.');
  console.log('\n📋 Récapitulatif des comptes:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  staffMembers.forEach(staff => {
    console.log(`👤 ${staff.nom} ${staff.prenom}`);
    console.log(`   📧 ${staff.email}`);
    console.log(`   🔐 staff123`);
    console.log(`   ${staff.shift === 'jour' ? '☀️' : '🌙'} ${staff.shift === 'jour' ? 'Jour' : 'Nuit'}`);
    console.log('');
  });
}

addAllStaff();
