const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");
const Mode = require("../models/Mode");
const Journey = require("../models/Journey");

describe("API journeys flow (login -> create -> list)", () => {
  let agent;
  let mode;

  const email = `api_journey_${Date.now()}@test.local`;
  const password = "TestPass123!";
  const name = "API Journey Tester";

  const origin = "Manchester";
  const destination = "Bolton";
  const distanceKm = 10;

  beforeAll(async () => {
    // Connect to the test database and set up the minimum data needed for this flow.
    await connectDB();

    // Create an active public user for authentication.
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Create an active mode so the journey can be created successfully.
    mode = await Mode.create({
      name: `Test Mode ${Date.now()}`,
      emissionFactor: 120,
      active: true,
    });

    // Use an agent to keep the session cookie between requests.
    agent = request.agent(app);

    // Log in via the API so the agent becomes an authenticated user.
    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect([200, 201]).toContain(loginRes.status);
  });

  afterAll(async () => {
    // Clean up test data so repeated runs do not pollute the database.
    // This tries a couple of field names in case the schema differs between versions.
    if (mode?._id) {
      await Journey.deleteMany({
        origin,
        destination,
        mode: mode._id,
      }).catch(async () => {
        await Journey.deleteMany({
          origin,
          destination,
          modeId: String(mode._id),
        }).catch(() => {});
      });

      await Mode.deleteOne({ _id: mode._id }).catch(() => {});
    }

    await User.deleteOne({ email }).catch(() => {});
    await mongoose.connection.close();
  });

  test("POST /api/journeys creates a journey, then GET /api/journeys includes it", async () => {
    // Create a journey using the required fields.
    const createRes = await agent.post("/api/journeys").send({
      origin,
      destination,
      modeId: String(mode._id),
      distanceKm,
    });

    expect([200, 201]).toContain(createRes.status);

    // Fetch the user’s journeys and confirm the new journey appears in the list.
    const listRes = await agent.get("/api/journeys");

    expect(listRes.status).toBe(200);
    expect(listRes.headers["content-type"]).toContain("application/json");

    const listText = JSON.stringify(listRes.body);

    expect(listText).toContain(origin);
    expect(listText).toContain(destination);
    expect(listText).toContain(String(mode._id));
    expect(listText).toContain(String(distanceKm));
  });
});