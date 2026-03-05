// middleware/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  // Protect admin-only pages:
  // - If not logged in, redirect to the login page (browser flow).
  // - If logged in but not an admin, show "Forbidden".
  if (!req.session || !req.session.userId) return res.redirect("/login");
  if (req.session.role !== "admin") return res.status(403).send("Forbidden");
  next();
};