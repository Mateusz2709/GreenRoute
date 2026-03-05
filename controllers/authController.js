// controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const crypto = require("crypto");
const { sendPasswordResetCodeEmail } = require("../services/emailService");
const { type } = require("os");

// ---------- REGISTER ----------
exports.getRegister = (req, res) => {
  // Show the registration form (EJS).
  res.render("auth/register", { errors: [] });
};

exports.postRegister = async (req, res) => {
  try {
    // Create a new account from the registration form.
    const email = (req.body.email || "").toLowerCase().trim();
    const name = (req.body.name || "").trim();
    const password = req.body.password || "";

    // Validate input and show friendly errors without losing typed values.
    const errors = [];
    if (!email) errors.push("Email is required");
    if (!name) errors.push("Name is required");
    if (!password || password.length < 6)
      errors.push("Password must be at least 6 characters");

    if (errors.length) {
      return res.status(400).render("auth/register", {
        errors,
        values: { name, email },
      });
    }

    // Prevent duplicate accounts for the same email.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render("auth/register", {
        errors: ["Email already in use"],
        values: { name, email },
      });
    }

    // Store a hash, not the raw password.
    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      email,
      name,
      passwordHash,
      role: "public",
      status: "active",
    });

    // One-time message shown after redirect.
    req.session.messages = {
      success: "Account created successfully. You can now log in.",
    };

    return req.session.save(() => res.redirect("/login"));
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- LOGIN ----------
exports.getLogin = (req, res) => {
  // If the user just reset their password, show a success message on the login page.
  if (req.query.reset === "success") {
    req.session.messages = {
      success: "Password has been reset. You can now log in.",
    };
    return req.session.save(() => res.redirect("/login"));
  }

  // Show the login form (EJS) with no validation errors.
  return res.render("auth/login", { errors: [] });
};

exports.postLogin = async (req, res) => {
  try {
    // Log in from the form and create a session so protected pages can be accessed.
    const email = (req.body.email || "").toLowerCase().trim();
    const password = req.body.password || "";

    const user = await User.findOne({ email });

    // Keep the message generic so it does not reveal whether the email exists.
    if (!user) {
      return res.status(400).render("auth/login", {
        errors: ["Invalid email or password"],
        values: { email },
      });
    }

    // Block login for inactive or suspended accounts.
    if (user.status !== "active") {
      return res.status(403).render("auth/login", {
        errors: ["Account is inactive/suspended"],
        values: { email },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(400).render("auth/login", {
        errors: ["Invalid email or password"],
        values: { email },
      });
    }

    // Save key user info in the session (used by auth middleware and nav UI).
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.name = user.name;

    // One-time welcome message shown after redirect.
    req.session.messages = {
      success:
        user.role === "admin"
          ? "Welcome back, Admin ✅"
          : "Logged in successfully ✅",
    };

    // Save the session before redirecting (important when using MongoDB session store).
    return req.session.save(() => {
      // Admins go to the admin dashboard; regular users go to their dashboard.
      if (user.role === "admin") return res.redirect("/admin/dashboard");
      return res.redirect("/dashboard");
    });
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
};

// ---------- LOGOUT ----------
exports.postLogout = (req, res) => {
  // Log out by clearing session auth fields, then redirect back to login.
  const wasAdmin = req.session.role === "admin";

  req.session.userId = null;
  req.session.role = null;
  req.session.name = null;

  // One-time message shown on the next page load.
  req.session.messages = {
    success: wasAdmin
      ? "You have been logged out (Admin) ✅"
      : "You have been logged out ✅",
  };

  return req.session.save(() => {
    res.redirect("/login");
  });
};

// ---------- PASSWORD RESET FLOW (CODE) ----------
function generate6DigitCode() {
  // Create a short numeric code as a string (including leading zeros).
  // This makes it easy for users to type from an email.
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

exports.getForgotPassword = (req, res) => {
  // Show the "Forgot password" form.
  // Any success/error messages are displayed via flash messages in the layout.
  return res.render("auth/forgotPassword", { errors: [], values: {} });
};

exports.postForgotPassword = async (req, res) => {
  try {
    // Start the reset process: generate a code (if the user exists) and email it.
    // The success message stays generic so it does not reveal whether the email is registered.
    const email = (req.body.email || "").toLowerCase().trim();
    const genericMsg =
      "If an account exists for this email, a reset code has been sent.";

    const errors = [];
    if (!email) errors.push("Email is required");

    if (errors.length) {
      return res.status(400).render("auth/forgotPassword", {
        errors,
        values: { email },
      });
    }

    const user = await User.findOne({ email });

    // Only run the code/email step for real users, but always respond the same way.
    if (user) {
      // Store only a hash of the code in the database.
      const code = generate6DigitCode();
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");

      // Codes expire quickly and attempts are tracked to reduce guessing.
      user.resetCodeHash = codeHash;
      user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      user.resetCodeAttempts = 0;
      await user.save();

      await sendPasswordResetCodeEmail(user.email, code);
    }

    // Post/Redirect/Get: set a one-time message and move to the reset form (with email prefilled).
    req.session.messages = { success: genericMsg };
    const qs = `?email=${encodeURIComponent(email)}`;

    return req.session.save(() => res.redirect(`/reset-password${qs}`));
  } catch (err) {
    console.error(err);
    req.session.messages = { error: "Server error. Please try again." };
    return req.session.save(() => res.redirect("/forgot-password"));
  }
};

exports.getResetPassword = (req, res) => {
  // Show the reset form and prefill the email when coming from the forgot-password step.
  const email = (req.query.email || "").toLowerCase().trim();

  return res.render("auth/resetPasswordCode", {
    errors: [],
    values: { email },
  });
};

exports.postResetPassword = async (req, res) => {
  try {
    // Finish the reset: verify the code, then replace the password with a new hash.
    const email = (req.body.email || "").toLowerCase().trim();
    const code = (req.body.code || "").trim();
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";

    const errors = [];
    if (!email) errors.push("Email is required");
    if (!code || code.length !== 6) errors.push("Reset code must be 6 digits");
    if (!password || password.length < 6)
      errors.push("Password must be at least 6 characters");
    if (password !== confirm) errors.push("Passwords do not match");

    if (errors.length) {
      return res.status(400).render("auth/resetPasswordCode", {
        errors,
        values: { email },
      });
    }

    const user = await User.findOne({ email });

    // Keep the message generic so attackers cannot confirm which emails are registered.
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      return res.status(400).render("auth/resetPasswordCode", {
        errors: ["Invalid or expired code"],
        values: { email },
      });
    }

    if (user.resetCodeExpiresAt <= new Date()) {
      return res.status(400).render("auth/resetPasswordCode", {
        errors: ["Invalid or expired code"],
        values: { email },
      });
    }

    if (user.resetCodeAttempts >= 5) {
      return res.status(429).render("auth/resetPasswordCode", {
        errors: ["Too many attempts. Request a new code."],
        values: { email },
      });
    }

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    if (codeHash !== user.resetCodeHash) {
      // Track failed attempts so repeated guessing is limited.
      user.resetCodeAttempts += 1;
      await user.save();

      return res.status(400).render("auth/resetPasswordCode", {
        errors: ["Invalid or expired code"],
        values: { email },
      });
    }

    // Save the new password and clear reset fields so the code cannot be reused.
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = 0;
    await user.save();

    // After a reset, remove any existing session and send the user back to login.
    req.session.destroy(() => res.redirect("/login?reset=success"));
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error: " + err.message);
  }
};