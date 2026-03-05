// routes/mainRoutes.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const Journey = require("../models/Journey");

// ---------- MAIN PAGES (EJS) ----------
router.get("/", (req, res) => {
  // Public landing page.
  res.render("home");
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    // User dashboard page: shows simple personal stats and recent journeys.
    const userId = req.session.userId;

    // Used for the "Total journeys" stat card.
    const totalJourneys = await Journey.countDocuments({ userRef: userId });

    // Show the newest journeys first so the user immediately sees their latest activity.
    const recentJourneys = await Journey.find({ userRef: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("modeRef");

    // Quick "last result" stat from the most recent journey.
    const lastEmissions =
      recentJourneys.length ? (recentJourneys[0].estimatedEmissions ?? 0) : 0;

    // Pick the lowest-emission journey from the recent list to suggest a "best mode".
    let bestMode = "—";
    if (recentJourneys.length) {
      const bestJourney = recentJourneys.reduce((best, j) => {
        const e = j.estimatedEmissions ?? Infinity;
        const bestE = best?.estimatedEmissions ?? Infinity;
        return e < bestE ? j : best;
      }, null);

      bestMode = bestJourney?.modeRef?.name || "—";
    }

    const stats = { totalJourneys, lastEmissions, bestMode };

    return res.render("dashboard", { stats, recentJourneys });
  } catch (err) {
    // If something fails, render a safe empty state rather than crashing the page.
    console.error(err);
    return res.render("dashboard", {
      stats: { totalJourneys: 0, lastEmissions: 0, bestMode: "—" },
      recentJourneys: [],
    });
  }
});

module.exports = router;