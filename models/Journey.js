// models/Journey.js
const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema(
  {
    // Owner of this journey entry (the logged-in user who created it).
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Start and end points entered by the user.
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },

    // Distance in kilometres (must be greater than 0).
    distanceKm: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // The transport mode selected by the user (e.g., Car, Bus, Train).
    modeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mode",
      required: true,
    },

    // Emission factor used at the time of creation.
    // This keeps old journeys consistent even if the mode factor changes later.
    emissionFactorUsed: {
      type: Number,
      required: true,
      min: 0,
    },

    // Calculated result for this journey:
    // distanceKm × emissionFactorUsed
    estimatedEmissions: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    // Automatically store created/updated timestamps for reporting and sorting.
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

module.exports = mongoose.model("Journey", journeySchema);