const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");
const Mode = require("../models/Mode");
const Journey = require("../models/Journey");

describe("Business rule: block deleting Mode when used by Journey", () => {
  let agent;
  let mode;
  let journeyId;

  const email = `admin_rule_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "Admin Rule Tester";

  beforeAll(async () => {
    // Connect to the test database and set up an admin user + a mode used by a journey.
    await connectDB();

    // Create an active admin account for admin-only API endpoints.
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "admin",
      status: "active",
    });

    // Create a mode that will later be referenced by a journey.
    mode = await Mode.create({
      name: `Protected Mode ${Date.now()}`,
      emissionFactor: 123,
      active: true,
    });

    // Use an agent so login session is kept between requests.
    agent = request.agent(app);

    // Log in as admin (creates a session cookie inside the agent).
    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect([200, 201]).toContain(loginRes.status);

    // Create a journey using this mode, so the mode becomes "in use".
    const createJourneyRes = await agent.post("/api/journeys").send({
      origin: "Manchester",
      destination: "Bolton",
      distanceKm: 10,
      modeId: String(mode._id),
    });
    expect([200, 201]).toContain(createJourneyRes.status);

    // Capture the created journey id.
    journeyId =
      createJourneyRes.body?._id ||
      createJourneyRes.body?.journey?._id ||
      null;
  });

  afterAll(async () => {
    // Clean up test data: delete the journey, mode, and user created for this test.
    if (journeyId) {
      await Journey.deleteOne({ _id: journeyId }).catch(() => {});
    } else if (mode?._id) {
      await Journey.deleteMany({ mode: mode._id }).catch(async () => {
        await Journey.deleteMany({ modeId: String(mode._id) }).catch(() => {});
      });
    }

    if (mode?._id) await Mode.deleteOne({ _id: mode._id }).catch(() => {});
    await User.deleteOne({ email }).catch(() => {});

    await mongoose.connection.close();
  });

  test("DELETE /api/modes/:id is blocked when mode is used by a journey (after deactivation)", async () => {
    // First, deactivate the mode so it's clear that deletion is blocked due to "in use" status, not just because it's active.
    const patchRes = await agent
      .patch(`/api/modes/${mode._id}`)
      .send({ active: false });

    expect(patchRes.status).toBe(200);

    // Attempt to delete the mode that is referenced by an existing journey.
    const res = await agent.delete(`/api/modes/${mode._id}`);

    // Expected: API refuses deletion to preserve history.
    expect(res.status).toBe(409);

    // Confirm the API returns JSON so the client can show a clear error message.
    if (res.headers["content-type"]) {
      expect(res.headers["content-type"]).toContain("application/json");
    }

    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).toMatch(
      /used|in use|journey|history|referenced|cannot|forbidden|conflict|error/
    );
  });
});