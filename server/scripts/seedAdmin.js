const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Admin = require('../models/Admin');

// Parse optional CLI arguments: --mobile, --password, --name, --role
const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const nextVal = args[i + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        parsed[key] = nextVal;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
};

const args = parseArgs();

const ADMIN_NAME     = args.name     || process.env.ADMIN_NAME     || 'Supermart Owner';
const ADMIN_MOBILE   = args.mobile   || process.env.ADMIN_MOBILE   || '9999999999';
const ADMIN_PASSWORD = args.password || process.env.ADMIN_PASSWORD || 'supermart123';
const ADMIN_ROLE     = args.role     || 'SUPER_ADMIN';

const seedAdmin = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermart';

  console.log('====================================================');
  console.log('🛡️  SUPERMART - SEED ADMIN CLI');
  console.log('====================================================');
  console.log(`Connecting to MongoDB at ${mongoURI} ...`);

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`❌ Could not connect to MongoDB: ${err.message}`);
    console.log('\n💡 Tip: Verify your MONGODB_URI in server/.env');
    process.exit(1);
  }

  try {
    // Look up existing admin by mobile
    let admin = await Admin.findOne({ mobile: ADMIN_MOBILE });

    if (admin) {
      console.log(`\n⚠️  Admin already exists (ID: ${admin._id}). Updating credentials...`);

      admin.name     = ADMIN_NAME;
      admin.mobile   = ADMIN_MOBILE;
      admin.password = ADMIN_PASSWORD; // pre-save hook will re-hash it
      admin.role     = ADMIN_ROLE;
      await admin.save();

      console.log('✅ Admin account updated successfully!');
    } else {
      admin = await Admin.create({
        name:     ADMIN_NAME,
        mobile:   ADMIN_MOBILE,
        password: ADMIN_PASSWORD, // pre-save hook hashes it
        role:     ADMIN_ROLE
      });
      console.log('✅ Admin account created successfully!');
    }

    // Print plaintext credentials (not the hash)
    console.log('\n====================================================');
    console.log('📋 ADMIN CREDENTIALS:');
    console.log(`   Name     : ${ADMIN_NAME}`);
    console.log(`   Mobile   : ${ADMIN_MOBILE}  ← login with this`);
    console.log(`   Password : ${ADMIN_PASSWORD}  ← plaintext (stored as bcrypt hash)`);
    console.log(`   Role     : ${ADMIN_ROLE}`);
    console.log('====================================================');
    console.log('💡 Login to the admin portal with:');
    console.log(`   Mobile: ${ADMIN_MOBILE}  |  Password: ${ADMIN_PASSWORD}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error.message);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      console.error(`   Duplicate value for "${field}": ${error.keyValue?.[field]}`);
      console.error('   Try running with a different --mobile value.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
