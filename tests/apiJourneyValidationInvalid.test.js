const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");
const Mode = require("../models/Mode");

describe("API journey validation (invalid payload)", () => {
  let agent;
  let mode;

  const email = `api_invalid_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "API Invalid Tester";

  beforeAll(async () => {
    // Connect to the test database and create the minimum data needed for the test.
    await connectDB();

    // Create a normal user so the journey endpoints can be accessed after login.
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Create an active mode to include in the payload even though other fields will be invalid.
    mode = await Mode.create({
      name: `Test Mode ${Date.now()}`,
      emissionFactor: 120,
      active: true,
    });

    // Use an agent so the session cookie persists across requests.
    agent = request.agent(app);

    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect([200, 201]).toContain(loginRes.status);
  });

  afterAll(async () => {
    // Clean up test data.
    if (mode?._id) await Mode.deleteOne({ _id: mode._id }).catch(() => {});
    await User.deleteOne({ email }).catch(() => {});
    await mongoose.connection.close();
  });

  test("POST /api/journeys returns 400 and JSON errors when required fields are missing", async () => {
    // Send an invalid payload (missing origin/destination and distance is not positive).
    const res = await agent.post("/api/journeys").send({
      modeId: String(mode._id),
      distanceKm: 0,
    });

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/json");

    const bodyText = JSON.stringify(res.body);
    expect(bodyText.length).toBeGreaterThan(2);
    expect(bodyText.toLowerCase()).toMatch(/error|errors|message|validation/);
  });
});