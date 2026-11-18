const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const { initDatabase } = require('../config/initDatabase');
const logger = require('../utils/logger');

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected! Initializing all database tables/collections...');

    await initDatabase();

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n--- Active Collections in Database ---');
    collections.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.name}`);
    });
    console.log('--------------------------------------\n');

    await mongoose.connection.close();
    console.log('Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

run();
