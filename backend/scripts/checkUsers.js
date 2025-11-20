require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({}).select('+password');
    
    console.log('\n📋 Users in Database:');
    console.log('=====================');
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\n💡 You need to create users first.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Name: ${user.nom} ${user.prenom}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Active: ${user.isActive}`);
        console.log(`   - Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NO PASSWORD'}`);
      });
      
      console.log(`\n✅ Total users: ${users.length}`);
    }

    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
