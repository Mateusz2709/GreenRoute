const request = require("supertest");
const app = require("../app");

describe("EJS auth protection", () => {
  test("GET /dashboard redirects to /login when not authenticated", async () => {
    // The user dashboard is a protected page, so unauthenticated requests should be redirected.
    const res = await request(app).get("/dashboard");

    console.log("status:", res.status, "location:", res.headers.location);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});