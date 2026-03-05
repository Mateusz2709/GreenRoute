// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

// ---------- AUTH PAGES (EJS) ----------
// Browser-based authentication flow: register, login, logout, and password reset.

router.get("/register", auth.getRegister);
router.post("/register", auth.postRegister);

router.get("/login", auth.getLogin);
router.post("/login", auth.postLogin);

router.post("/logout", auth.postLogout);

router.get("/forgot-password", auth.getForgotPassword);
router.post("/forgot-password", auth.postForgotPassword);

router.get("/reset-password", auth.getResetPassword);
router.post("/reset-password", auth.postResetPassword);

module.exports = router;