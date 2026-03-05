// controllers/adminController.js

const Mode = require("../models/Mode");
const Journey = require("../models/Journey");
const User = require("../models/User");

const PAGE_SIZE = 10;

// Make sure the page number is always a safe, positive integer.
// This prevents broken pagination when the URL contains invalid values.
function safePage(value) {
  const p = parseInt(value || "1", 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

// Build pagination details for the EJS views (current page, total pages, etc.).
// The view uses this to show page numbers and disable Next/Prev when needed.
function buildPagination(total, page, limit) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safe = Math.min(page, totalPages);
  return { page: safe, totalPages, total, limit };
}

// Read the current page from either the URL (?page=) or a hidden form field (POST).
// This helps keep the admin on the same page after actions like update/delete.
function pickPageFromReq(req) {
  return safePage(req.query.page || req.body?.page || "1");
}

// ---------- DASHBOARD ----------
exports.getDashboard = async (req, res) => {
  try {
    // Show quick system overview to the admin (counts + latest activity).
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const suspendedUsers = await User.countDocuments({ status: "suspended" });
    const totalJourneys = await Journey.countDocuments();

    const stats = { totalUsers, activeUsers, suspendedUsers, totalJourneys };

    // Latest journeys help the admin quickly spot recent usage and any unusual entries.
    const latestJourneys = await Journey.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userRef", "email name")
      .populate("modeRef", "name emissionFactor");

    // A short list of modes with their emission factors.
    const modeSummary = await Mode.find().sort({ name: 1 }).limit(8);

    return res.render("admin/dashboard", { stats, latestJourneys, modeSummary });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- MODES ----------
exports.getModes = async (req, res) => {
  try {
    // Paginated list of transport modes for the admin to manage.
    const page = pickPageFromReq(req);
    const limit = PAGE_SIZE;
    const skip = (page - 1) * limit;

    const total = await Mode.countDocuments();
    const pagination = buildPagination(total, page, limit);

    const modes = await Mode.find()
      .sort({ name: 1 })
      .skip((pagination.page - 1) * limit)
      .limit(limit);

    return res.render("admin/modes", { modes, errors: [], pagination });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.getNewMode = (req, res) => {
  // Open the "Add mode" form. The view uses formAction and title to stay reusable.
  return res.render("admin/modeForm", {
    mode: null,
    errors: [],
    formAction: "/admin/modes",
    title: "Add Transport Mode",
  });
};

exports.postCreateMode = async (req, res) => {
  try {
    // Create a new transport mode from the admin form input.
    const name = (req.body.name || "").trim();
    const emissionFactor = Number(req.body.emissionFactor);

    // Basic validation so the admin gets friendly form errors instead of a crash.
    const errors = [];
    if (!name) errors.push("Mode name is required.");
    if (!Number.isFinite(emissionFactor) || emissionFactor < 0) {
      errors.push("Emission factor must be 0 or more.");
    }

    if (errors.length) {
      return res.status(400).render("admin/modeForm", {
        mode: { name, emissionFactor },
        errors,
        formAction: "/admin/modes",
        title: "Add Transport Mode",
      });
    }

    // Prevent duplicate mode names to keep the dropdowns clean and unambiguous.
    const existing = await Mode.findOne({ name });
    if (existing) {
      return res.status(400).render("admin/modeForm", {
        mode: { name, emissionFactor },
        errors: ["Mode name already exists."],
        formAction: "/admin/modes",
        title: "Add Transport Mode",
      });
    }

    // New modes start as active so they are available immediately in user journey creation.
    await Mode.create({ name, emissionFactor, active: true });

    // Flash message shown on the next page load.
    req.session.messages = { success: `Mode "${name}" created ✅` };
    return req.session.save(() => res.redirect("/admin/modes?page=1"));
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.getEditMode = async (req, res) => {
  try {
    // Open the "Edit mode" form with the existing mode details pre-filled.
    const mode = await Mode.findById(req.params.id);
    if (!mode) return res.status(404).send("Mode not found");

    return res.render("admin/modeForm", {
      mode,
      errors: [],
      formAction: `/admin/modes/${mode._id}`,
      title: "Edit Transport Mode",
    });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.postUpdateMode = async (req, res) => {
  try {
    // Update a mode based on the admin form submission.
    const mode = await Mode.findById(req.params.id);
    if (!mode) return res.status(404).send("Mode not found");

    const name = (req.body.name || "").trim();
    const emissionFactor = Number(req.body.emissionFactor);

    const errors = [];
    if (!name) errors.push("Mode name is required.");
    if (!Number.isFinite(emissionFactor) || emissionFactor < 0) {
      errors.push("Emission factor must be 0 or more.");
    }

    // Avoid two different modes having the same name.
    const duplicate = await Mode.findOne({ name, _id: { $ne: mode._id } });
    if (duplicate) errors.push("Another mode already uses this name.");

    if (errors.length) {
      // Re-render the same form so the admin can fix mistakes without losing input.
      return res.status(400).render("admin/modeForm", {
        mode: { ...mode.toObject(), name, emissionFactor },
        errors,
        formAction: `/admin/modes/${mode._id}`,
        title: "Edit Transport Mode",
      });
    }

    // Detect "no changes" so the admin gets a helpful message instead of a fake update.
    // This also avoids edge cases where Mongo stores numbers in different formats.
    const currentName = String(mode.name || "").trim();

    const rawCurrentFactor =
      mode.emissionFactor && typeof mode.emissionFactor.toString === "function"
        ? mode.emissionFactor.toString()
        : mode.emissionFactor;

    const currentFactor = Number(rawCurrentFactor);

    const sameName = currentName === name;
    const sameFactor =
      Number.isFinite(currentFactor) && Number.isFinite(emissionFactor)
        ? currentFactor === emissionFactor
        : String(rawCurrentFactor) === String(req.body.emissionFactor);

    if (sameName && sameFactor) {
      const page = pickPageFromReq(req);
      req.session.messages = { info: "No changes detected." };
      return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
    }

    // Save the updated values.
    mode.name = name;
    mode.emissionFactor = emissionFactor;
    await mode.save();

    // Return the admin to the same list page they came from.
    const page = pickPageFromReq(req);
    req.session.messages = { success: `Mode "${mode.name}" updated ✅` };
    return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.postToggleMode = async (req, res) => {
  try {
    // Turn a mode on/off without deleting it.
    const mode = await Mode.findById(req.params.id);
    if (!mode) return res.status(404).send("Mode not found");

    mode.active = !mode.active;
    await mode.save();

    const page = pickPageFromReq(req);
    req.session.messages = {
      success: `Mode "${mode.name}" is now ${mode.active ? "active" : "inactive"} ✅`,
    };

    return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- JOURNEYS (admin monitoring) ----------
exports.getAllJourneys = async (req, res) => {
  try {
    // Admin view for monitoring journeys: search, filter by mode, sort, and paginate.
    const q = (req.query.q || "").trim();
    const mode = (req.query.mode || "").trim();
    const sort = (req.query.sort || "date_desc").trim();
    const page = safePage(req.query.page || "1");

    const filter = {};
    if (mode) filter.modeRef = mode;

    // Sorting options shown in the admin UI.
    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      emissions_desc: { estimatedEmissions: -1 },
      emissions_asc: { estimatedEmissions: 1 },
      distance_desc: { distanceKm: -1 },
      distance_asc: { distanceKm: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.date_desc;

    // Mode list for the filter dropdown.
    const modes = await Mode.find().sort({ name: 1 }).select("_id name");

    // Fetch journeys first, then filter by text after populate.
    // This keeps the logic simple and allows searching by user email and mode name.
    let journeys = await Journey.find(filter)
      .populate("modeRef")
      .populate("userRef")
      .sort(sortObj);

    // Search across origin, destination, user email, and mode name.
    if (q) {
      const qq = q.toLowerCase();
      journeys = journeys.filter((j) => {
        const origin = (j.origin || "").toLowerCase();
        const dest = (j.destination || "").toLowerCase();
        const email = (j.userRef && j.userRef.email ? j.userRef.email : "").toLowerCase();
        const modeName = (j.modeRef && j.modeRef.name ? j.modeRef.name : "").toLowerCase();

        return (
          origin.includes(qq) ||
          dest.includes(qq) ||
          email.includes(qq) ||
          modeName.includes(qq)
        );
      });
    }

    // Pagination is applied after filtering so page counts match what the admin sees.
    const total = journeys.length;
    const pagination = buildPagination(total, page, PAGE_SIZE);

    const start = (pagination.page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pagedJourneys = journeys.slice(start, end);

    return res.render("admin/journeys", {
      journeys: pagedJourneys,
      modes,
      filters: { q, mode, sort },
      pagination,
    });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.postDeleteJourney = async (req, res) => {
  try {
    // Delete a journey from the admin table and return to the same filtered view.
    const journeyId = req.params.id;

    // These values are posted as hidden inputs so the admin keeps the same filters after delete.
    const page = parseInt(req.body.page || "1", 10) || 1;
    const q = (req.body.q || "").trim();
    const mode = (req.body.mode || "").trim();
    const sort = (req.body.sort || "date_desc").trim();

    const qs =
      `page=${encodeURIComponent(page)}` +
      `&q=${encodeURIComponent(q)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&sort=${encodeURIComponent(sort)}`;

    const deleted = await Journey.findByIdAndDelete(journeyId);
    if (!deleted) {
      req.session.messages = { error: "Journey not found." };
      return req.session.save(() => res.redirect(`/admin/journeys?${qs}`));
    }

    req.session.messages = { success: "Journey deleted ✅" };
    return req.session.save(() => res.redirect(`/admin/journeys?${qs}`));
  } catch (err) {
    console.error(err);

    // If something fails, still redirect back to the same list view with an error message.
    const page = parseInt(req.body.page || "1", 10) || 1;
    const q = (req.body.q || "").trim();
    const mode = (req.body.mode || "").trim();
    const sort = (req.body.sort || "date_desc").trim();

    const qs =
      `page=${encodeURIComponent(page)}` +
      `&q=${encodeURIComponent(q)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&sort=${encodeURIComponent(sort)}`;

    req.session.messages = { error: "Server error while deleting journey." };
    return req.session.save(() => res.redirect(`/admin/journeys?${qs}`));
  }
};

// ---------- USERS (status management) ----------
exports.getUsers = async (req, res) => {
  try {
    // Paginated list of users so the admin can review accounts and manage status.
    const page = safePage(req.query.page || "1");
    const limit = PAGE_SIZE;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const pagination = buildPagination(total, page, limit);

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * limit)
      .limit(limit);

    return res.render("admin/users", { users, errors: [], pagination });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

exports.postUpdateUserStatus = async (req, res) => {
  try {
    // Update a user's status (active/inactive/suspended) from the admin UI.
    // The list page is preserved so the admin does not lose their place.
    const page = pickPageFromReq(req);

    // Prevent an admin from disabling their own account while logged in.
    if (req.params.id === req.session.userId) {
      req.session.messages = { error: "You cannot change your own status." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      req.session.messages = { error: "User not found." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    // Only allow known statuses.
    const newStatus = (req.body.status || "").trim();
    const allowed = ["active", "inactive", "suspended"];
    if (!allowed.includes(newStatus)) {
      req.session.messages = { error: "Invalid status." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    // avoid locking the system by disabling the last active admin.
    if (user.role === "admin" && newStatus !== "active") {
      const activeAdmins = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdmins <= 1) {
        req.session.messages = { error: "Cannot deactivate the last active admin." };
        return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
      }
    }

    // If the status is already the same, show a friendly message instead of saving.
    if (user.status === newStatus) {
      req.session.messages = { info: "No changes detected." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    user.status = newStatus;
    await user.save();

    req.session.messages = { success: `User status updated to "${newStatus}" ✅` };
    return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- USERS (admin actions) ----------
exports.postDeleteUser = async (req, res) => {
  try {
    // Delete a user account and also remove their journeys to keep data consistent.
    const page = pickPageFromReq(req);
    const userIdToDelete = req.params.id;

    // Prevent accidental self-deletion while logged in.
    if (userIdToDelete === req.session.userId) {
      req.session.messages = { error: "You cannot delete your own account." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    const user = await User.findById(userIdToDelete);
    if (!user) {
      req.session.messages = { error: "User not found." };
      return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
    }

    // avoid deleting the last active admin account.
    if (user.role === "admin" && user.status === "active") {
      const activeAdmins = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdmins <= 1) {
        req.session.messages = { error: "Cannot delete the last active admin." };
        return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
      }
    }

    // Remove journeys first so there are no orphan records pointing to a deleted user.
    await Journey.deleteMany({ userRef: user._id });
    await User.findByIdAndDelete(user._id);

    req.session.messages = { success: `User "${user.email}" deleted ✅` };
    return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
  } catch (err) {
    console.error(err);
    const page = pickPageFromReq(req);
    req.session.messages = { error: "Server error while deleting user." };
    return req.session.save(() => res.redirect(`/admin/users?page=${page}`));
  }
};

// ---------- DELETE MODE ----------
exports.postDeleteMode = async (req, res) => {
  try {
    // Delete a mode only if it is not used by any journeys.
    // If it was used before, the safer option is to set it inactive.
    const modeId = req.params.id;
    const page = pickPageFromReq(req);

    const usedCount = await Journey.countDocuments({ modeRef: modeId });
    if (usedCount > 0) {
      req.session.messages = {
        error:
          "Cannot delete: this mode is used by existing journeys. Keep it (set inactive) to preserve history.",
      };
      return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
    }

    const deleted = await Mode.findByIdAndDelete(modeId);
    if (!deleted) {
      req.session.messages = { error: "Mode not found." };
      return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
    }

    req.session.messages = { success: "Mode deleted ✅" };
    return req.session.save(() => res.redirect(`/admin/modes?page=${page}`));
  } catch (err) {
    console.error(err);
    req.session.messages = { error: "Server error while deleting mode." };
    return req.session.save(() => res.redirect("/admin/modes?page=1"));
  }
};