const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermart';
  console.log(`[MongoDB Initializing] Target URI: ${mongoURI.split('@')[1] ? 'mongodb+srv://***@' + mongoURI.split('@')[1] : mongoURI}`);

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`====================================================`);
    console.log(`🟢 [MongoDB Atlas Connected] Host: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    console.log(`====================================================`);
    return true;
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to external MongoDB Atlas at ${mongoURI}. Operating with localized engine mode for zero downtime. (${err.message})`);
    return false;
  }
};

module.exports = connectDB;
