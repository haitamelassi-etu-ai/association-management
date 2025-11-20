const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const users = [
  {
    nom: 'El Assi',
    prenom: 'Haytam',
    email: 'haytam@adelelouerif.org',
    password: 'test123',
    role: 'responsable',
    isActive: true
  },
  {
    nom: 'Admin',
    prenom: 'User',
    email: 'admin@adelelouerif.org',
    password: 'admin123',
    role: 'admin',
    isActive: true
  },
  {
    nom: 'Staff',
    prenom: 'Member',
    email: 'staff@adelelouerif.org',
    password: 'staff123',
    role: 'staff',
    isActive: true
  }
];

async function resetAndSeedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing users
    await User.deleteMany({});
    console.log('🗑️  Existing users deleted');

    // Hash passwords and create users
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        isActive: userData.isActive
      });

      // Mark password as not modified to prevent double hashing
      user.markModified('password');
      user.$locals.skipPasswordHash = true;
      
      await user.save({ validateBeforeSave: true });
      console.log(`✅ Created: ${userData.email} (${userData.role}) - Password: ${userData.password}`);
    }

    console.log('\n🎉 Users seeded successfully!');
    console.log('\n📝 Login credentials:');
    users.forEach(u => {
      console.log(`   Email: ${u.email} | Password: ${u.password} | Role: ${u.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAndSeedUsers();
