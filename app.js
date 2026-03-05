// app.js
require("dotenv").config();

// Fail if the app is missing required settings.
// These values are needed for database access and session security.
if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET missing in .env");

const authRoutes = require("./routes/authRoutes");
const journeyRoutes = require("./routes/journeyRoutes");
const mainRoutes = require("./routes/mainRoutes");
const adminRoutes = require("./routes/adminRoutes");

const apiModeRoutes = require("./routes/apiModeRoutes");
const apiJourneyRoutes = require("./routes/apiJourneyRoutes");
const apiAdminRoutes = require("./routes/apiAdminRoutes");
const apiAuthRoutes = require("./routes/apiAuthRoutes");
const apiUserRoutes = require("./routes/apiUserRoutes");
const apiDashboardRoutes = require("./routes/apiDashboardRoutes");

const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const connectDB = require("./config/db");
const app = express();

// ---------- CORE MIDDLEWARE ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files like CSS and browser-side JavaScript.
app.use(express.static(path.join(__dirname, "public")));

// ---------- VIEW ENGINE ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------- SESSIONS ----------
app.use(
  session({
    // Used to sign the session cookie.
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    // Store sessions in MongoDB so login state survives server restarts.
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),

    // Cookie settings for browser sessions.
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "lax",
      secure: false,
    },
  })
);

// ---------- GLOBAL VIEW DATA ----------
app.use((req, res, next) => {
  // Values used by EJS views/partials (navigation, role checks, etc.).
  res.locals.userId = req.session.userId || null;
  res.locals.role = req.session.role || null;

  res.locals.isAdmin = req.session.role === "admin";
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, role: req.session.role, name: req.session.name }
    : null;

  // One-time flash messages (shown once, then cleared).
  res.locals.messages = req.session.messages || null;
  delete req.session.messages;

  next();
});

// ---------- ROUTES (EJS PAGES) ----------
app.use("/", authRoutes);
app.use("/", journeyRoutes);
app.use("/", mainRoutes);
app.use("/admin", adminRoutes);

// ---------- ROUTES (API / JSON) ----------
app.use("/api", apiModeRoutes);
app.use("/api", apiJourneyRoutes);
app.use("/api", apiAdminRoutes);
app.use("/api", apiAuthRoutes);
app.use("/api", apiUserRoutes);
app.use("/api", apiDashboardRoutes);

const PORT = process.env.PORT || 3000;

// Start the server only when not running automated tests.
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to start server:", err.message);
      process.exit(1);
    });
}

module.exports = app;