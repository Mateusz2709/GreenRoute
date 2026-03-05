// config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const MONGO_URI = process.env.MONGO_URI;

  // Read the database connection string from environment variables.
  // This keeps secrets out of the codebase and allows different settings per machine/server.
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set in .env");
  }

  try {
    // Connect to MongoDB so the app can store and read application data.
    // If this fails, the app should not continue (most features depend on the database).
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    // Show a clear error in the console and stop the server.
    // Running without a database connection would cause confusing runtime failures later.
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;