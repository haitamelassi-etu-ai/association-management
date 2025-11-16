// Test API Script
const https = require('http');

// Test 1: Register Admin
const registerData = JSON.stringify({
  nom: 'Admin',
  prenom: 'Principal',
  email: 'admin@adelelouerif.org',
  password: 'admin123',
  role: 'admin',
  telephone: '0612345678',
  poste: 'Directeur'
});

const registerOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': registerData.length
  }
};

console.log('🔄 Creating admin user...\n');

const req = https.request(registerOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ Response:');
    console.log(JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(registerData);
req.end();
