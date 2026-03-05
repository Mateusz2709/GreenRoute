// controllers/apiModeController.js
const Mode = require("../models/Mode");
const Journey = require("../models/Journey");

// Convert input to a number and allow only values 0 or higher.
// Returns null when the input is missing or invalid.
function toNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ---------- MODES (API, JSON) ----------
exports.getAll = async (req, res) => {
  try {
    // Return all modes as JSON, filtered by active=true/false.
    // This is useful for dropdowns and admin lists.
    const activeParam = req.query.active;

    const filter = {};
    if (activeParam === "true") filter.active = true;
    if (activeParam === "false") filter.active = false;

    const modes = await Mode.find(filter).sort({ name: 1 });
    return res.status(200).json(modes);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    // Return one mode by id (JSON).
    const mode = await Mode.findById(req.params.id);
    if (!mode) return res.status(404).json({ message: "Mode not found" });
    return res.status(200).json(mode);
  } catch (err) {
    // If the id format is invalid, Mongoose throws an error.
    return res.status(400).json({ message: "Invalid mode id" });
  }
};

exports.create = async (req, res) => {
  try {
    // Create a new mode (admin use).
    // If "active" is not provided, it defaults to true so it can be used immediately.
    const name = (req.body.name || "").trim();
    const emissionFactor = toNonNegativeNumber(req.body.emissionFactor);
    const active =
      typeof req.body.active === "boolean" ? req.body.active : true;

    const errors = [];
    if (!name) errors.push("Mode name is required.");
    if (emissionFactor === null) errors.push("Emission factor must be 0 or more.");

    if (errors.length) return res.status(400).json({ message: "Validation error", errors });

    // Prevent duplicate names to avoid confusion in the UI and reports.
    const existing = await Mode.findOne({ name });
    if (existing) return res.status(409).json({ message: "Mode name already exists." });

    const created = await Mode.create({ name, emissionFactor, active });
    return res.status(201).json(created);
  } catch (err) {
    // a message if a unique index rejects a duplicate name.
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Mode name already exists." });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.patch = async (req, res) => {
  try {
    // Update only the fields provided (admin use).
    // This supports quick edits like toggling active or correcting a factor.
    const patch = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Mode name cannot be empty." });
      patch.name = name;
    }

    if (req.body.emissionFactor !== undefined) {
      const ef = toNonNegativeNumber(req.body.emissionFactor);
      if (ef === null) return res.status(400).json({ message: "Emission factor must be 0 or more." });
      patch.emissionFactor = ef;
    }

    if (req.body.active !== undefined) {
      // Keep this strict: the client must send a real boolean, not "true"/"false" strings.
      if (typeof req.body.active !== "boolean") {
        return res.status(400).json({ message: "Active must be boolean." });
      }
      patch.active = req.body.active;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No valid fields to patch." });
    }

    // If the name is changing, make sure it does not clash with another mode.
    if (patch.name) {
      const dup = await Mode.findOne({ name: patch.name, _id: { $ne: req.params.id } });
      if (dup) return res.status(409).json({ message: "Another mode already uses this name." });
    }

    const updated = await Mode.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Mode not found" });
    return res.status(200).json(updated);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Mode name already exists." });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // Delete a mode only if it is not used by any journeys.
    // If it has been used before, the safer option is to mark it inactive.
    const mode = await Mode.findById(req.params.id);
    if (!mode) return res.status(404).json({ message: "Mode not found" });

    const usedCount = await Journey.countDocuments({ modeRef: mode._id });
    if (usedCount > 0) {
      return res.status(409).json({
        message:
          "Cannot delete: this mode is used by existing journeys. Keep it (inactive) to preserve history.",
      });
    }

    await Mode.deleteOne({ _id: mode._id });
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};