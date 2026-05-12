const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[DB] No MONGODB_URI — using in-memory store');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log('[DB] MongoDB connected');
  } catch (e) {
    console.error('[DB] MongoDB error:', e.message, '— falling back to in-memory store');
  }
}

function useMongo() {
  return connected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, useMongo };
