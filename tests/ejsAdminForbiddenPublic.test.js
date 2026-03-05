const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

describe("Admin access control (public user)", () => {
  let agent;
  const email = `public_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "Public Tester";

  beforeAll(async () => {
    // Connect to the test database and create a normal account.
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    agent = request.agent(app);

    // Log in through the browser.
    const loginRes = await agent
      .post("/login")
      .type("form")
      .send({ email, password });

    // Public users typically land on their dashboard after login.
    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.location).toBe("/dashboard");
  });

  afterAll(async () => {
    // Remove the test user and close the DB connection.
    await User.deleteOne({ email });
    await mongoose.connection.close();
  });

  test("GET /admin/dashboard returns 403 Forbidden for public user", async () => {
    // Admin-only page should block logged-in users who are not admins.
    const res = await agent.get("/admin/dashboard");

    expect(res.status).toBe(403);
    expect(res.text).toContain("Forbidden");
  });
});