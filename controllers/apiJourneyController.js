// controllers/apiJourneyController.js
const mongoose = require("mongoose");
const Journey = require("../models/Journey");
const Mode = require("../models/Mode");

// ---------- HELPERS ----------
function isValidObjectId(id) {
  // Quick safety check so invalid ids do not trigger database errors.
  return mongoose.Types.ObjectId.isValid(String(id));
}

function toPositiveNumber(value) {
  // Convert input to a number and accept only values greater than 0.
  // Returns null when the input is missing or invalid.
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- API: JOURNEYS (logged-in user, JSON) ----------
exports.apiGetMyJourneys = async (req, res) => {
  try {
    // Return all journeys for the currently logged-in user (newest first).
    const userId = req.session.userId;

    const journeys = await Journey.find({ userRef: userId })
      .populate("modeRef", "name emissionFactor active")
      .sort({ createdAt: -1 });

    return res.status(200).json(journeys);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.apiGetMyJourneyById = async (req, res) => {
  try {
    // Return one journey by id, but only if it belongs to the current user.
    const userId = req.session.userId;
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid journey id." });
    }

    const journey = await Journey.findOne({ _id: id, userRef: userId }).populate(
      "modeRef",
      "name emissionFactor active"
    );

    if (!journey) {
      return res.status(404).json({ message: "Journey not found." });
    }

    return res.status(200).json(journey);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.apiCreateJourney = async (req, res) => {
  try {
    // Create a new journey for the current user.
    // The client sends origin/destination/distance and selects a transport mode.
    const userId = req.session.userId;

    const origin = (req.body.origin || "").trim();
    const destination = (req.body.destination || "").trim();
    const distanceKm = toPositiveNumber(req.body.distanceKm);
    const modeId = (req.body.modeId || "").trim();

    // Validate input so the API returns messages the frontend can display.
    const errors = [];
    if (!origin) errors.push("Origin is required.");
    if (!destination) errors.push("Destination is required.");
    if (!distanceKm) errors.push("Distance must be a positive number.");
    if (!modeId) errors.push("Transport mode is required.");
    if (modeId && !isValidObjectId(modeId)) errors.push("Invalid modeId.");

    if (errors.length) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    // Only allow active modes so users cannot create journeys using disabled options.
    const mode = await Mode.findById(modeId);
    if (!mode || !mode.active) {
      return res
        .status(400)
        .json({ message: "Selected mode is not available." });
    }

    // Calculate emissions using the mode factor at the time of creation.
    // Storing emissionFactorUsed keeps results consistent even if the mode is edited later.
    const emissionFactorUsed = mode.emissionFactor; // g CO2e per km
    const estimatedEmissions = distanceKm * emissionFactorUsed;

    const created = await Journey.create({
      userRef: userId,
      origin,
      destination,
      distanceKm,
      modeRef: mode._id,
      emissionFactorUsed,
      estimatedEmissions,
    });

    // Return the created journey with populated mode details for UI display.
    const createdPopulated = await Journey.findById(created._id).populate(
      "modeRef",
      "name emissionFactor active"
    );

    return res.status(201).json(createdPopulated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.apiDeleteMyJourney = async (req, res) => {
  try {
    // Delete a journey only if it belongs to the current user.
    // This prevents users from deleting other people’s journeys.
    const userId = req.session.userId;
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid journey id." });
    }

    const deleted = await Journey.findOneAndDelete({ _id: id, userRef: userId });

    if (!deleted) {
      return res.status(404).json({ message: "Journey not found." });
    }

    // 204 means "deleted successfully" with no response body.
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};