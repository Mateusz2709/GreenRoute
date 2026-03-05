// routes/apiUserRoutes.js
const express = require("express");
const router = express.Router();

const apiUser = require("../controllers/apiUserController");
const requireAuthApi = require("../middleware/requireAuthApi");
const requireAdminApi = require("../middleware/requireAdminApi");

// ---------- USERS API (JSON) ----------

// Current logged-in user (used for "My Account" / navbar role checks).
router.get("/me", requireAuthApi, apiUser.me);

// Admin-only user management (list users, view one user, change status).
router.get("/users", requireAdminApi, apiUser.getAll);
router.get("/users/:id", requireAdminApi, apiUser.getOne);
router.patch("/users/:id/status", requireAdminApi, apiUser.patchStatus);

module.exports = router;