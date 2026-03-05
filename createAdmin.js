// createAdmin.js - Script to create an admin user in the database
require("dotenv").config();
const bcrypt = require("bcrypt");

const connectDB = require("../config/db");
const User = require("../models/User");

async function createAdmin() {
  // Connect to MongoDB so the script can read/write users.
  await connectDB();

  // admin credentials.
  const email = "admin@greenroute.local";
  const name = "Admin";
  const password = "Admin123!";

  // If the account already exists, upgrade it to an active admin instead of creating a duplicate.
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.status = "active";
    await existing.save();
    console.log("✅ Existing user updated to admin:", email);
    process.exit(0);
  }

  // Store a hash, not the raw password.
  const passwordHash = await bcrypt.hash(password, 10);

  // Create a fresh admin account for the app.
  await User.create({
    email,
    name,
    passwordHash,
    role: "admin",
    status: "active",
  });

  // Print credentials so the admin can log in right away in a local environment.
  console.log("✅ Admin created");
  console.log("Email:", email);
  console.log("Password:", password);
  process.exit(0);
}

createAdmin().catch((err) => {
  // If anything fails, show an error and exit with a failure code.
  console.error("❌ Failed:", err.message);
  process.exit(1);
});