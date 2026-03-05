const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

describe("API get journey by id (not found)", () => {
  let agent;

  const email = `api_notfound_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "API NotFound Tester";

  // Use a valid ObjectId format that should not exist in the database.
  const missingId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    // Connect to the test database and create a user for authentication.
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Use an agent so the login session cookie is kept for the request.
    agent = request.agent(app);

    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect([200, 201]).toContain(loginRes.status);
  });

  afterAll(async () => {
    // Clean up the test user and close the DB connection.
    await User.deleteOne({ email }).catch(() => {});
    await mongoose.connection.close();
  });

  test("GET /api/journeys/:id returns 404 for a non-existing id", async () => {
    // Request a journey id that is valid but not present in the database.
    const res = await agent.get(`/api/journeys/${missingId}`);

    expect([404, 400]).toContain(res.status);
    expect(res.headers["content-type"]).toContain("application/json");

    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).toMatch(/not\s*found|error|message/);
  });
});