const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

describe("Admin access control (admin user)", () => {
  let agent;
  const email = `admin_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "Admin Tester";

  beforeAll(async () => {
    // Connect to the test database and create an active admin account.
    await connectDB();

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "admin",
      status: "active",
    });

    agent = request.agent(app);

    // Log in through the browser (form) route to mirror real admin behaviour.
    const loginRes = await agent
      .post("/login")
      .type("form")
      .send({ email, password });

    // Successful login usually redirects (admin goes to the admin dashboard).
    expect(loginRes.status).toBe(302);
  });

  afterAll(async () => {
    // Remove the test admin and close the DB connection.
    await User.deleteOne({ email });
    await mongoose.connection.close();
  });

  test("GET /admin/dashboard returns 200 for admin user", async () => {
    // Admin-only page should be accessible after login.
    const res = await agent.get("/admin/dashboard");

    expect(res.status).toBe(200);

    // Confirm the page content indicates it's the admin dashboard.
    expect(res.text).toContain("Admin");
  });
});