// middleware/requireAuthApi.js
module.exports = function requireAuthApi(req, res, next) {
  // Protect API endpoints that require a logged-in user (JSON flow).
  // If there is no active session, return 401 so the client can handle it.
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};