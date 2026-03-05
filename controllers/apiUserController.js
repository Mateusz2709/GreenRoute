// controllers/apiUserController.js
const User = require("../models/User");

// Return only safe user fields for API responses.
// This avoids leaking passwords or reset-code data to the frontend/client.
function safeUserSelect() {
  return "-passwordHash -resetCodeHash -resetCodeExpiresAt -resetCodeAttempts";
}

// ---------- USERS (API, JSON) ----------
exports.getAll = async (req, res) => {
  try {
    // Return users as JSON with optional filters for status, role, and search query.
    // This supports admin tools/pages that list and manage accounts.
    const status = (req.query.status || "").trim();
    const role = (req.query.role || "").trim();
    const q = (req.query.q || "").trim();

    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;

    // If q is provided, search by email or name (case-insensitive, partial match).
    // Special characters are escaped to avoid breaking the regex.
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ email: regex }, { name: regex }];
    }

    const users = await User.find(filter)
      .select(safeUserSelect())
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    // Return one user by id (JSON), without sensitive fields.
    const user = await User.findById(req.params.id).select(safeUserSelect());
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (err) {
    // Mongoose throws when the id format is invalid.
    return res.status(400).json({ message: "Invalid user id" });
  }
};

exports.me = async (req, res) => {
  try {
    // Return the currently logged-in user's profile (JSON).
    // Useful for "My Account" screens and frontend role checks.
    const user = await User.findById(req.session.userId).select(safeUserSelect());
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.patchStatus = async (req, res) => {
  try {
    // Admin action: change a user's status (active/inactive/suspended).
    // Includes safety checks to avoid locking the system down.
    const targetId = req.params.id;

    // Prevent changing the current admin’s own status while logged in.
    if (String(targetId) === String(req.session.userId)) {
      return res.status(400).json({ message: "You cannot change your own status." });
    }

    const newStatus = (req.body.status || "").trim();
    const allowed = ["active", "inactive", "suspended"];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status", allowed });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Do not allow deactivating the last active admin.
    if (user.role === "admin" && newStatus !== "active") {
      const activeAdmins = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdmins <= 1) {
        return res.status(400).json({ message: "Cannot deactivate the last active admin." });
      }
    }

    user.status = newStatus;
    await user.save();

    // Return the updated user using the safe field selection.
    const safe = await User.findById(user._id).select(safeUserSelect());
    return res.status(200).json(safe);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};