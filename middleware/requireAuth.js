// middleware/requireAuth.js
module.exports = function requireAuth(req, res, next) {
  // Protect pages that require a logged-in user.
  // If there is no active session, send the user to the login page.
  if (!req.session || !req.session.userId) return res.redirect("/login");
  next();
};