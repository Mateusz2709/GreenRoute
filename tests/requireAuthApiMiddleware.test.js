const requireAuthApi = require("../middleware/requireAuthApi");

function mockRes() {
  // response mock for JSON endpoints.
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("requireAuthApi middleware", () => {
  test("returns 401 JSON when not authenticated", () => {
    // No session means the user is not logged in.
    const req = { session: null };
    const res = mockRes();
    const next = jest.fn();

    requireAuthApi(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next() when authenticated", () => {
    // Session userId present means the user is logged in, so allow the request through.
    const req = { session: { userId: "123" } };
    const res = mockRes();
    const next = jest.fn();

    requireAuthApi(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});