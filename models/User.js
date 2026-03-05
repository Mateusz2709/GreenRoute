// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        // Email is the unique login identifier for the account.
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // Hashed password only.
        passwordHash: {
            type: String,
            required: true,
        },

        // Name is shown in the UI (e.g., greeting in the navbar/admin tables).
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Role controls access (admins can access admin pages and admin API routes).
        role: {
            enum: ["public", "admin"],
            type: String,
            default: "public",
            required: true,
        },

        // Account status controls whether a user can log in.
        // Inactive/suspended accounts are blocked at login.
        status: {
            enum: ["active", "inactive", "suspended"],
            type: String,
            default: "active",
            required: true,
        },

        // Password reset fields:
        // Only a hash of the code is stored for security,
        // along with an expiry time and an attempt counter to limit guessing.
        resetCodeHash: { type: String },
        resetCodeExpiresAt: { type: Date },
        resetCodeAttempts: { type: Number, default: 0 },
    },
    {
        // Track when accounts were created/updated (useful for sorting).
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);