// middleware/requireAdminApi.js
module.exports = function requireAdminApi(req, res, next) {
  // Protect admin-only API endpoints (JSON flow):
  // - If not logged in, return 401 so the client knows to log in.
  // - If logged in but not an admin, return 403.
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};