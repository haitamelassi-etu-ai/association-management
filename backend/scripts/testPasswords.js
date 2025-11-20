require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function testPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const testEmails = [
      'haytam@adelelouerif.org',
      'admin@adelelouerif.org',
      'staff@adelelouerif.org',
      'hamid@adelelouerif.org'
    ];

    const testPasswords = [
      'test123',
      'admin123',
      'staff123',
      'Haytam@2005',
      'haytam123',
      'password',
      '123456'
    ];

    console.log('🔍 Testing common passwords for each user...\n');

    for (const email of testEmails) {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.log(`❌ User ${email} not found`);
        continue;
      }

      console.log(`\n👤 Testing: ${user.nom} ${user.prenom} (${email})`);
      console.log('   Role:', user.role);
      
      let found = false;
      for (const pwd of testPasswords) {
        const isMatch = await bcrypt.compare(pwd, user.password);
        if (isMatch) {
          console.log(`   ✅ PASSWORD FOUND: "${pwd}"`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`   ❌ None of the test passwords match`);
        console.log(`   💡 You need to reset this user's password`);
      }
    }

    await mongoose.connection.close();
    console.log('\n\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPasswords();
