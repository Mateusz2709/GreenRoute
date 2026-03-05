// controllers/journeyController.js
const Journey = require("../models/Journey");
const Mode = require("../models/Mode");

// ---------- NEW JOURNEY ----------
exports.getNewJourney = async (req, res) => {
  // Show the "New journey" form with only active modes in the dropdown.
  const modes = await Mode.find({ active: true }).sort({ name: 1 });
  return res.render("journeys/new", { modes, errors: [], values: {} });
};

exports.postCreateJourney = async (req, res) => {
  try {
    // Create a journey from the form input and calculate emissions.
    const origin = (req.body.origin || "").trim();
    const destination = (req.body.destination || "").trim();
    const distanceKm = Number(req.body.distanceKm);
    const modeId = req.body.modeId;

    // Validate input so the user gets clear form errors.
    const errors = [];
    if (!origin) errors.push("Origin is required.");
    if (!destination) errors.push("Destination is required.");
    if (!modeId) errors.push("Transport mode is required.");
    if (!Number.isFinite(distanceKm) || distanceKm <= 0)
      errors.push("Distance must be a positive number.");

    // Reload modes so the form can be re-rendered with the dropdown populated.
    const modes = await Mode.find({ active: true }).sort({ name: 1 });

    // If validation fails, show the form again and keep the user’s typed values.
    if (errors.length) {
      return res.status(400).render("journeys/new", {
        modes,
        errors,
        values: { origin, destination, distanceKm, modeId },
      });
    }

    // Only allow active modes so users cannot submit journeys with disabled options.
    const mode = await Mode.findById(modeId);
    if (!mode || !mode.active) {
      return res.status(400).render("journeys/new", {
        modes,
        errors: ["Selected mode is not available."],
        values: { origin, destination, distanceKm, modeId },
      });
    }

    // Store the factor used so the result stays consistent even if the mode is edited later.
    const emissionFactorUsed = mode.emissionFactor; // g CO2e per km
    const estimatedEmissions = distanceKm * emissionFactorUsed;

    const journey = await Journey.create({
      userRef: req.session.userId,
      origin,
      destination,
      distanceKm,
      modeRef: mode._id,
      emissionFactorUsed,
      estimatedEmissions,
    });

    // One-time message shown after redirect.
    req.session.messages = { success: "Journey added successfully ✅" };

    // Save the session before redirecting (important when using MongoDB session store).
    return req.session.save(() => {
      return res.redirect(`/journeys/${journey._id}`);
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

// ---------- MY JOURNEYS LIST ----------
exports.getMyJourneys = async (req, res) => {
  try {
    // Show the logged-in user’s journeys with search, filters, sorting, and pagination.
    const userId = req.session.userId;

    const query = (req.query.query || "").trim();
    const mode = (req.query.mode || "").trim();
    const sort = (req.query.sort || "date_desc").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);

    const limit = 10;
    const skip = (page - 1) * limit;

    // Start with a filter that only returns journeys owned by this user.
    const filter = { userRef: userId };

    // Optional filter by mode (dropdown).
    if (mode) filter.modeRef = mode;

    // Optional text search in origin/destination (case-insensitive).
    if (query) {
      const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ origin: rx }, { destination: rx }];
    }

    // Sorting options shown in the UI.
    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      emissions_desc: { estimatedEmissions: -1 },
      emissions_asc: { estimatedEmissions: 1 },
      distance_desc: { distanceKm: -1 },
      distance_asc: { distanceKm: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.date_desc;

    // Active modes for the filter dropdown.
    const modes = await Mode.find({ active: true })
      .sort({ name: 1 })
      .select("_id name");

    // Pagination values are calculated from the filtered count.
    const total = await Journey.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);

    const journeys = await Journey.find(filter)
      .populate("modeRef")
      .sort(sortObj)
      .skip((safePage - 1) * limit)
      .limit(limit);

    return res.render("journeys/index", {
      journeys,
      modes,
      filters: { query, mode, sort },
      pagination: { page: safePage, totalPages, total, limit },
    });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- JOURNEY DETAILS ----------
exports.getJourneyDetails = async (req, res) => {
  // Show one journey, but only if it belongs to the logged-in user.
  const journey = await Journey.findOne({
    _id: req.params.id,
    userRef: req.session.userId,
  }).populate("modeRef");

  if (!journey) return res.status(404).send("Journey not found");

  return res.render("journeys/details", { journey });
};

// ---------- DELETE JOURNEY ----------
exports.postDeleteJourney = async (req, res) => {
  try {
    // Delete one journey and then return the user to the same list view (same filters/page).
    const journeyId = req.params.id;
    const userId = req.session.userId;

    // Read current list state from hidden inputs so the redirect preserves the view.
    const page = parseInt(req.body.page || "1", 10) || 1;
    const query = (req.body.query || "").trim();
    const mode = (req.body.mode || "").trim();
    const sort = (req.body.sort || "date_desc").trim();

    const qs =
      `page=${encodeURIComponent(page)}` +
      `&query=${encodeURIComponent(query)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&sort=${encodeURIComponent(sort)}`;

    // Only delete if the journey belongs to the logged-in user.
    const deleted = await Journey.findOneAndDelete({
      _id: journeyId,
      userRef: userId,
    });

    if (!deleted) {
      req.session.messages = {
        error: "Journey not found or you don't have permission to delete it.",
      };
      return req.session.save(() => res.redirect(`/journeys?${qs}`));
    }

    // One-time message shown after redirect.
    req.session.messages = { success: "Journey deleted ✅" };

    return req.session.save(() => {
      return res.redirect(`/journeys?${qs}`);
    });
  } catch (err) {
    console.error(err);

    // If something fails, still redirect back to the same list view with an error message.
    const page = parseInt(req.body.page || "1", 10) || 1;
    const query = (req.body.query || "").trim();
    const mode = (req.body.mode || "").trim();
    const sort = (req.body.sort || "date_desc").trim();

    const qs =
      `page=${encodeURIComponent(page)}` +
      `&query=${encodeURIComponent(query)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&sort=${encodeURIComponent(sort)}`;

    req.session.messages = { error: "Server error while deleting journey." };
    return req.session.save(() => res.redirect(`/journeys?${qs}`));
  }
};