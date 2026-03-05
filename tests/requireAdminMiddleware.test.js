const requireAdmin = require("../middleware/requireAdmin");

function mockRes() {
  // Express response mock for redirect/status/send behaviour.
  return {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
}

describe("requireAdmin middleware", () => {
  test("redirects to /login when not authenticated", () => {
    // No session means the user is not logged in, so send them to the login page.
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/login");
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 403 when authenticated but not admin", () => {
    // Logged in, but role is not admin: block access to admin pages.
    const req = { session: { userId: "123", role: "public" } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Forbidden");
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next() when admin", () => {
    // Logged in and role is admin: allow the request to continue.
    const req = { session: { userId: "123", role: "admin" } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});