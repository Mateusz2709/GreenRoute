// routes/apiModeRoutes.js
const express = require("express");
const router = express.Router();

const apiMode = require("../controllers/apiModeController");
const requireAdminApi = require("../middleware/requireAdminApi");

// ---------- MODES API (JSON) ----------
// Public routes: anyone can read modes (useful for dropdowns and integrations).
router.get("/modes", apiMode.getAll);
router.get("/modes/:id", apiMode.getOne);

// Admin routes: only admins can create, edit, or delete modes.
router.post("/modes", requireAdminApi, apiMode.create);
router.patch("/modes/:id", requireAdminApi, apiMode.patch);
router.delete("/modes/:id", requireAdminApi, apiMode.remove);

module.exports = router;