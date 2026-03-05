// routes/apiDashboardRoutes.js
const express = require("express");
const router = express.Router();

const requireAuthApi = require("../middleware/requireAuthApi");
const apiDashboard = require("../controllers/apiDashboardController");

// ---------- DASHBOARD API (JSON) ----------
// Same dashboard feature as the EJS /dashboard page, but returned as JSON for API clients.
router.get("/me/dashboard", requireAuthApi, apiDashboard.getMyDashboard);

module.exports = router;