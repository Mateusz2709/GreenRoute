const requireAdminApi = require("../middleware/requireAdminApi");

function mockRes() {
  // Simple response mock that matches how Express chains res.status().json().
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("requireAdminApi middleware", () => {
  test("returns 401 JSON when not authenticated", () => {
    // No session means the user is not logged in.
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();

    requireAdminApi(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 403 JSON when authenticated but not admin", () => {
    // Logged in, but role is not admin: block access.
    const req = { session: { userId: "123", role: "public" } };
    const res = mockRes();
    const next = jest.fn();

    requireAdminApi(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next() when admin", () => {
    // Logged in and role is admin: allow access to continue.
    const req = { session: { userId: "123", role: "admin" } };
    const res = mockRes();
    const next = jest.fn();

    requireAdminApi(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});