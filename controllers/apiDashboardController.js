// controllers/apiDashboardController.js
const Journey = require("../models/Journey");

exports.getMyDashboard = async (req, res) => {
  try {
    // Return dashboard data for the currently logged-in user (JSON).
    // This supports a "My Dashboard" screen that shows personal stats and recent journeys.
    const userId = req.session.userId;

    // Total journeys is used for a summary card (e.g., "Journeys created").
    const totalJourneys = await Journey.countDocuments({ userRef: userId });

    // Recent journeys are shown as a list/table so the user can quickly review their latest entries.
    const recentJourneys = await Journey.find({ userRef: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("modeRef", "name emissionFactor active");

    // The most recent journey’s emissions are used for a quick "last result" style stat.
    const lastEmissions =
      recentJourneys.length ? (recentJourneys[0].estimatedEmissions ?? 0) : 0;

    // Find the lowest-emission option from the recent journeys.
    // This gives the user a simple "best mode" insight based on their own data.
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

    return res.status(200).json({ stats, recentJourneys });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};