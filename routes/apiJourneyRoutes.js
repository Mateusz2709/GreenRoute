// routes/apiJourneyRoutes.js
const express = require("express");
const router = express.Router();

const apiJourney = require("../controllers/apiJourneyController");

// ---------- AUTH CHECK (API) ----------
// Simple JSON-only auth guard for these routes.
// If the user is not logged in, return 401 instead of redirecting to a page.
function requireAuthJson(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }
  next();
}

// ---------- JOURNEYS API (JSON) ----------
router.get("/journeys", requireAuthJson, apiJourney.apiGetMyJourneys);
router.post("/journeys", requireAuthJson, apiJourney.apiCreateJourney);

router.get("/journeys/:id", requireAuthJson, apiJourney.apiGetMyJourneyById);
router.delete("/journeys/:id", requireAuthJson, apiJourney.apiDeleteMyJourney);

module.exports = router;