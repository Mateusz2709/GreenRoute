const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

describe("Admin API protection (public user)", () => {
  let agent;

  const email = `api_public_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "API Public User";

  beforeAll(async () => {
    // Connect to the test database and create a normal (non-admin) user.
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Use a persistent agent so the session cookie is kept between requests.
    agent = request.agent(app);

    // Log in through the API so the agent becomes an authenticated "public" user.
    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect([200, 201]).toContain(loginRes.status);
  });

  afterAll(async () => {
    // Clean up the test user and close the DB connection.
    await User.deleteOne({ email }).catch(() => {});
    await mongoose.connection.close();
  });

  test("GET /api/users returns 403 for a public user", async () => {
    // Admin-only endpoint should reject authenticated users who are not admins.
    const res = await agent.get("/api/users");

    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toContain("application/json");

    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).toMatch(/forbidden|admin|unauthori/);
  });
});