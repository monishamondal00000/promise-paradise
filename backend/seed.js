const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const Destination = require('./models/Destination');
const Package = require('./models/Package');
const Vendor = require('./models/Vendor');

const dataDir = path.join(__dirname, 'data');

async function seed() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ MONGO_URI not set in .env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing collections...');
    await Destination.deleteMany({});
    await Package.deleteMany({});
    await Vendor.deleteMany({});

    // Read JSON files
    const destinations = JSON.parse(fs.readFileSync(path.join(dataDir, 'destinations.json'), 'utf8'));
    const packages = JSON.parse(fs.readFileSync(path.join(dataDir, 'packages.json'), 'utf8'));
    const vendors = JSON.parse(fs.readFileSync(path.join(dataDir, 'vendors.json'), 'utf8'));

    // Insert data
    console.log('📍 Seeding destinations...');
    const destResult = await Destination.insertMany(destinations);
    console.log(`   ✅ Inserted ${destResult.length} destinations`);

    console.log('📦 Seeding packages...');
    const pkgResult = await Package.insertMany(packages);
    console.log(`   ✅ Inserted ${pkgResult.length} packages`);

    console.log('🏪 Seeding vendors...');
    const vendorResult = await Vendor.insertMany(vendors);
    console.log(`   ✅ Inserted ${vendorResult.length} vendors`);

    console.log('\n🎉 Database seeded successfully!');
    console.log(`   Total: ${destResult.length} destinations, ${pkgResult.length} packages, ${vendorResult.length} vendors`);

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
