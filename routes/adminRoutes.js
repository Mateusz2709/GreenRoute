// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const requireAdmin = require("../middleware/requireAdmin");
const admin = require("../controllers/adminController");

// ---------- ADMIN PAGES (EJS) ----------
// All routes here are protected: only logged-in admins can access them.

// ---------- DASHBOARD ----------
router.get("/dashboard", requireAdmin, admin.getDashboard);

// ---------- MODES ----------
router.get("/modes", requireAdmin, admin.getModes);
router.get("/modes/new", requireAdmin, admin.getNewMode);
router.post("/modes", requireAdmin, admin.postCreateMode);
router.get("/modes/:id/edit", requireAdmin, admin.getEditMode);
router.post("/modes/:id", requireAdmin, admin.postUpdateMode);
router.post("/modes/:id/toggle", requireAdmin, admin.postToggleMode);
router.post("/modes/:id/delete", requireAdmin, admin.postDeleteMode);

// ---------- JOURNEYS ----------
router.get("/journeys", requireAdmin, admin.getAllJourneys);
router.post("/journeys/:id/delete", requireAdmin, admin.postDeleteJourney);

// ---------- USERS ----------
router.get("/users", requireAdmin, admin.getUsers);
router.post("/users/:id/status", requireAdmin, admin.postUpdateUserStatus);
router.post("/users/:id/delete", requireAdmin, admin.postDeleteUser);

module.exports = router;