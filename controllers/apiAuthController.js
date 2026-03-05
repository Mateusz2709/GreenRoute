// controllers/apiAuthController.js
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetCodeEmail } = require("../services/emailService");

// Generate a 6-digit code as a string (including leading zeros).
// This is used for the password reset flow.
function generate6DigitCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

// ---------- REGISTER (API) ----------
exports.register = async (req, res) => {
  try {
    // Create a new user account using JSON input and return a JSON response.
    const email = (req.body.email || "").toLowerCase().trim();
    const name = (req.body.name || "").trim();
    const password = req.body.password || "";

    // Basic validation to keep error messages clear for the frontend/client.
    const errors = [];
    if (!email) errors.push("Email is required");
    if (!name) errors.push("Name is required");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters");

    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    // Prevent duplicate accounts for the same email address.
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "Email already in use" });

    // Store a hash, not the raw password.
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // Return only safe fields (never return password hashes).
    return res.status(201).json({
      message: "Registered",
      user: {
        id: created._id.toString(),
        email: created.email,
        name: created.name,
        role: created.role,
        status: created.status,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- LOGIN (API) ----------
exports.login = async (req, res) => {
  try {
    // Log in using JSON input and create a session for the user.
    const email = (req.body.email || "").toLowerCase().trim();
    const password = req.body.password || "";

    // Use a generic error message so attackers get less information.
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Block login for inactive or suspended accounts.
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive/suspended" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Save session fields so protected routes can recognise the logged-in user and role.
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.name = user.name;

    return res.status(200).json({ message: "Logged in", role: user.role });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- LOGOUT (API) ----------
exports.logout = async (req, res) => {
  try {
    // Destroy the session so the user is logged out across the whole app.
    req.session.destroy(() => {
      return res.status(200).json({ message: "Logged out" });
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- FORGOT PASSWORD (API) ----------
exports.forgotPassword = async (req, res) => {
  try {
    // Start password reset: generate a short code and email it to the user.
    // The response stays generic so it does not reveal whether the account exists.
    const email = (req.body.email || "").toLowerCase().trim();
    const genericMsg = "If an account exists for this email, a reset code has been sent.";

    if (!email) {
      return res.status(400).json({ message: "Validation failed", errors: ["Email is required"] });
    }

    const user = await User.findOne({ email });

    // Always return the same message for unknown emails (privacy + security).
    if (!user) {
      return res.status(200).json({ message: genericMsg });
    }

    // Store only a hash of the code in the database.
    // If the DB is leaked, the raw code is not exposed.
    const code = generate6DigitCode();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // Code expires after 15 minutes and attempts are tracked to slow brute-force guessing.
    user.resetCodeHash = codeHash;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.resetCodeAttempts = 0;
    await user.save();

    // Send the plain code to the user by email.
    await sendPasswordResetCodeEmail(user.email, code);
    return res.status(200).json({ message: genericMsg });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- RESET PASSWORD (API) ----------
exports.resetPassword = async (req, res) => {
  try {
    // Finish password reset: verify the code, then replace the password with a new hash.
    const email = (req.body.email || "").toLowerCase().trim();
    const code = (req.body.code || "").trim();
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";

    const errors = [];
    if (!email) errors.push("Email is required");
    if (!code || code.length !== 6) errors.push("Reset code must be 6 digits");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters");
    if (password !== confirm) errors.push("Passwords do not match");

    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    // Reject if no reset is in progress for this account.
    const user = await User.findOne({ email });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Reject expired codes.
    if (user.resetCodeExpiresAt <= new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Limit attempts to reduce guessing attacks.
    if ((user.resetCodeAttempts ?? 0) >= 5) {
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    // Compare hashes instead of storing the code in plain text.
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    if (codeHash !== user.resetCodeHash) {
      user.resetCodeAttempts = (user.resetCodeAttempts ?? 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Update password and clear reset fields so the code cannot be reused.
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = 0;
    await user.save();

    // Log the user out after a reset so any old session is not kept active.
    req.session.destroy(() => res.status(200).json({ message: "Password reset successful" }));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};