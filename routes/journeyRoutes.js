// routes/journeyRoutes.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const journeyController = require("../controllers/journeyController");

// ---------- JOURNEYS PAGES (EJS) ----------
// Browser routes for logged-in users: create, view, and delete journeys.

router.get("/journeys/new", requireAuth, journeyController.getNewJourney);
router.post("/journeys", requireAuth, journeyController.postCreateJourney);

router.get("/journeys", requireAuth, journeyController.getMyJourneys);
router.get("/journeys/:id", requireAuth, journeyController.getJourneyDetails);

router.post("/journeys/:id/delete", requireAuth, journeyController.postDeleteJourney);

module.exports = router;