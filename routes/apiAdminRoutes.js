// routes/apiAdminRoutes.js
const express = require("express");
const router = express.Router();

const requireAdminApi = require("../middleware/requireAdminApi");
const apiAdmin = require("../controllers/apiAdminController");

// ---------- ADMIN API (JSON) ----------
// These routes return JSON and are protected so only admins can use them.

// ---------- DASHBOARD ----------
router.get("/admin/dashboard", requireAdminApi, apiAdmin.getDashboard);

// ---------- JOURNEYS ----------
router.get("/admin/journeys", requireAdminApi, apiAdmin.getAllJourneys);
router.delete("/admin/journeys/:id", requireAdminApi, apiAdmin.deleteJourney);

// ---------- USERS ----------
router.delete("/admin/users/:id", requireAdminApi, apiAdmin.deleteUser);

module.exports = router;