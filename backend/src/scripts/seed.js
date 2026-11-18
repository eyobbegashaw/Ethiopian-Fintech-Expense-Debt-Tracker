const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const { initDatabase } = require('../config/initDatabase');

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);
    console.log('Connected! Resetting collections for fresh test data...');

    // Ensure all collections exist
    await initDatabase();

    // Clear existing test data
    await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Expense.deleteMany({}),
      Settlement.deleteMany({}),
      FriendRequest.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('Cleared existing data.');

    // 1. Create exactly THREE test users
    console.log('Creating 3 test users...');

    const user1 = await User.create({
      name: 'Abebe Kebede',
      phone: '0911223344', // Ethio Telecom
      password: 'password123',
      settings: {
        currency: 'ETB',
        language: 'en',
        notifications: { inApp: true, push: true, email: true }
      }
    });

    const user2 = await User.create({
      name: 'Almaz Ayana',
      phone: '0922334455', // Ethio Telecom
      password: 'password123',
      settings: {
        currency: 'ETB',
        language: 'am',
        notifications: { inApp: true, push: true, email: true }
      }
    });

    const user3 = await User.create({
      name: 'Chala Bekele',
      phone: '0711223344', // Safaricom Ethiopia
      password: 'password123',
      settings: {
        currency: 'ETB',
        language: 'en',
        notifications: { inApp: true, push: true, email: true }
      }
    });

    // Connect all three as friends
    user1.friends = [user2._id, user3._id];
    user2.friends = [user1._id, user3._id];
    user3.friends = [user1._id, user2._id];
    await Promise.all([user1.save(), user2.save(), user3.save()]);

    console.log('✓ 3 Users created successfully with phone numbers and passwords.');

    // Print summary table
    console.log('\n========================================================');
    console.log('           SEED DATA GENERATED SUCCESSFULLY             ');
    console.log('========================================================');
    console.log('All mock groups, expenses, and notifications removed.');
    console.log('Only 3 test users are active in the database:\n');
    console.log('1. User 1:');
    console.log('   - Name:     Abebe Kebede');
    console.log('   - Phone:    0911223344');
    console.log('   - Password: password123');
    console.log('   - Network:  Ethio Telecom\n');
    console.log('2. User 2:');
    console.log('   - Name:     Almaz Ayana');
    console.log('   - Phone:    0922334455');
    console.log('   - Password: password123');
    console.log('   - Network:  Ethio Telecom\n');
    console.log('3. User 3:');
    console.log('   - Name:     Chala Bekele');
    console.log('   - Phone:    0711223344');
    console.log('   - Password: password123');
    console.log('   - Network:  Safaricom Ethiopia\n');
    console.log('Database is completely clean with 0 mock expenses/groups.');
    console.log('========================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
