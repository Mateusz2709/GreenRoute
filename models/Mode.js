// models/Mode.js
const mongoose = require('mongoose');

const modeSchema = new mongoose.Schema(
    {
        // Display name shown in the UI (e.g., "Car", "Bus", "Train").
        // Kept unique so users do not see duplicates in dropdowns.
        name: {
            type : String,
            required: true,
            unique: true,
            trim: true,
        },

        // Emissions factor used to estimate CO2e for journeys using this mode.
        // Value is in grams per kilometre.
        emissionFactor: {
            type: Number,
            required: true,
            min: 0,
        },

        // When inactive, the mode is hidden/blocked for new journeys,
        // but existing journeys can still reference it for history.
        active: {
            type: Boolean,
            default: true,
            required: true,
        },
    },
    {
        // Track when modes were created/updated (useful for admin auditing).
        timestamps: true,
    }
);

module.exports = mongoose.model("Mode", modeSchema);