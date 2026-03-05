// seedModes.js - Script to seed transport modes into the database
require("dotenv").config();

const connectDB = require("./config/db");
const Mode = require("./models/Mode");

async function seedModes() {
  // Connect to MongoDB so modes can be inserted/updated.
  await connectDB();

  // Default transport modes used by the app (shown in dropdowns).
  // Values are emission factors in grams per kilometre.
  const modes = [
    { name: "Walking", emissionFactor: 0, active: true },
    { name: "Cycling", emissionFactor: 0, active: true },
    { name: "Bus", emissionFactor: 82, active: true },
    { name: "Tram / Metro", emissionFactor: 35, active: true },
    { name: "Train (local)", emissionFactor: 41, active: true },
    { name: "Car (petrol)", emissionFactor: 171, active: true },
    { name: "Car (electric)", emissionFactor: 50, active: true },
  ];

  // Upsert each mode: if it exists, update it; if not, create it.
  for (const m of modes) {
    await Mode.updateOne({ name: m.name }, { $set: m }, { upsert: true });
  }

  console.log("✅ Modes seeded/updated");
  process.exit(0);
}

seedModes().catch((err) => {
  // Print an error and exit.
  console.error("❌ Seeding failed:", err.message);
  process.exit(1);
});