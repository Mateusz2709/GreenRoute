// routes/apiAuthRoutes.js
const express = require("express");
const router = express.Router();

const apiAuth = require("../controllers/apiAuthController");

// ---------- AUTH API (JSON) ----------
// These endpoints are used by API clients / frontend requests that expect JSON responses.

router.post("/auth/register", apiAuth.register);
router.post("/auth/login", apiAuth.login);
router.post("/auth/logout", apiAuth.logout);

router.post("/auth/forgot-password", apiAuth.forgotPassword);
router.post("/auth/reset-password", apiAuth.resetPassword);

module.exports = router;