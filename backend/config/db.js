const mongoose = require('mongoose');

// Works with a local MongoDB (mongodb://127.0.0.1:27017/nccms) and with
// MongoDB Atlas (mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/nccms).
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Put your MongoDB connection string in backend/.env (local) or in the Render environment variables.');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    if (/ENOTFOUND|querySrv|ECONNREFUSED|Server selection timed out|whitelist|IP/i.test(err.message)) {
      console.error('Hint (Atlas): in Atlas → Network Access, allow 0.0.0.0/0 so Render can connect, and check the cluster host in your connection string.');
    }
    if (/bad auth|Authentication failed/i.test(err.message)) {
      console.error('Hint (Atlas): wrong database-user name or password. If the password has special characters (@ : / ? # %), URL-encode them or choose a simpler password.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
