const request = require("supertest");
const app = require("../app");

describe("Admin route protection (unauthenticated)", () => {
  test("GET /admin/dashboard redirects to /login when not authenticated", async () => {
    // Without a session cookie, the admin area should send the user to the login page.
    const res = await request(app).get("/admin/dashboard");

    // Helpful during debugging.
    console.log("status:", res.status, "location:", res.headers.location);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});