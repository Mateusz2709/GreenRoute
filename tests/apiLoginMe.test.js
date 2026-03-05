const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

describe("API auth flow (login -> /api/me)", () => {
  let agent;
  const email = `api_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "API Tester";

  beforeAll(async () => {
    // Connect to the test database and create a user account for the login flow.
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Use an agent so the session cookie persists between login and /api/me.
    agent = request.agent(app);
  });

  afterAll(async () => {
    // Remove the test user and close the DB connection.
    await User.deleteOne({ email });
    await mongoose.connection.close();
  });

  test("POST /api/auth/login then GET /api/me returns 200 JSON", async () => {
    // Log in to create the session cookie.
    const loginRes = await agent.post("/api/auth/login").send({ email, password });

    expect([200, 201]).toContain(loginRes.status);
    expect(loginRes.headers["set-cookie"]).toBeDefined();

    // Request the current user profile using the same session.
    const meRes = await agent.get("/api/me");

    expect(meRes.status).toBe(200);
    expect(meRes.headers["content-type"]).toContain("application/json");

    // Confirm the returned JSON belongs to the logged-in user.
    expect(JSON.stringify(meRes.body)).toContain(email);
  });
});