// controllers/apiAdminController.js
const Mode = require("../models/Mode");
const Journey = require("../models/Journey");
const User = require("../models/User");

exports.getDashboard = async (req, res) => {
  try {
    // Provide a quick admin overview for the API: user counts, journey count, and recent activity.
    // This is used by admin tools/pages that need JSON instead of EJS rendering.
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const suspendedUsers = await User.countDocuments({ status: "suspended" });
    const totalJourneys = await Journey.countDocuments();

    const stats = { totalUsers, activeUsers, suspendedUsers, totalJourneys };

    // Send the latest journeys so an admin can quickly review recent submissions.
    const latestJourneys = await Journey.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userRef", "email name")
      .populate("modeRef", "name emissionFactor active");

    // Small list of modes for summaries and quick checks in the admin UI.
    const modeSummary = await Mode.find().sort({ name: 1 }).limit(8);

    return res.status(200).json({
      stats,
      latestJourneys,
      modeSummary,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- JOURNEYS (API list/search) ----------
exports.getAllJourneys = async (req, res) => {
  try {
    // Return journeys as JSON with optional search, mode filter, and sorting.
    // This supports admin pages/tools that load data dynamically.
    const q = (req.query.q || "").trim();
    const mode = (req.query.mode || "").trim();
    const sort = (req.query.sort || "date_desc").trim();

    const filter = {};
    if (mode) filter.modeRef = mode;

    // Sort options match what the admin UI offers.
    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      emissions_desc: { estimatedEmissions: -1 },
      emissions_asc: { estimatedEmissions: 1 },
      distance_desc: { distanceKm: -1 },
      distance_asc: { distanceKm: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.date_desc;

    let journeys = await Journey.find(filter)
      .populate("modeRef", "name emissionFactor active")
      .populate("userRef", "email name")
      .sort(sortObj);

    // Search is applied after populate so it can match user email and mode name.
    if (q) {
      const qq = q.toLowerCase();
      journeys = journeys.filter((j) => {
        const origin = (j.origin || "").toLowerCase();
        const dest = (j.destination || "").toLowerCase();
        const email = (j.userRef?.email || "").toLowerCase();
        const modeName = (j.modeRef?.name || "").toLowerCase();
        return (
          origin.includes(qq) ||
          dest.includes(qq) ||
          email.includes(qq) ||
          modeName.includes(qq)
        );
      });
    }

    // Echo filters back so the frontend/admin tool can keep the UI in sync.
    return res.status(200).json({ journeys, filters: { q, mode, sort } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- JOURNEYS (API delete) ----------
exports.deleteJourney = async (req, res) => {
  try {
    // Remove a single journey by id.
    const journeyId = req.params.id;

    const deleted = await Journey.findByIdAndDelete(journeyId);
    if (!deleted) {
      return res.status(404).json({ error: "Journey not found." });
    }

    return res.status(200).json({ message: "Journey deleted ✅" });
  } catch (err) {
    // Keep errors simple for API clients, but log details for debugging.
    console.error(err);
    return res.status(500).json({ error: "Server error while deleting journey." });
  }
};

// ---------- USERS (API delete) ----------
exports.deleteUser = async (req, res) => {
  try {
    // Delete a user account (admin action) and clean up their related journeys.
    const userIdToDelete = req.params.id;

    // Block self-deletion while logged in to avoid locking the current admin out.
    if (userIdToDelete === req.session.userId) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    const user = await User.findById(userIdToDelete);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // never allow deleting the last active admin account.
    if (user.role === "admin" && user.status === "active") {
      const activeAdmins = await User.countDocuments({
        role: "admin",
        status: "active",
      });

      if (activeAdmins <= 1) {
        return res
          .status(409)
          .json({ error: "Cannot delete the last active admin." });
      }
    }

    // Remove journeys first so there are no records left pointing to a deleted user.
    await Journey.deleteMany({ userRef: user._id });

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({ message: `User "${user.email}" deleted ✅` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error while deleting user." });
  }
};