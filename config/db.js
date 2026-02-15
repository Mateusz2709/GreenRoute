const mongoose = require("mongoose");

async function connectDB() {
  const MONGO_URL =
    process.env.MONGO_URI ||
    "mongodb+srv://mateusz91:Playstation91@cluster0.kbu9of6.mongodb.net/";

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
