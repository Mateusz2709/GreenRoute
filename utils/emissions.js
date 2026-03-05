// utils/emissions.js
function calcEmissions(distanceKm, emissionFactor) {
  // Convert inputs to numbers so the function can accept strings from forms/JSON.
  const d = Number(distanceKm);
  const f = Number(emissionFactor);

  // Distance must be a real number greater than 0 (a journey cannot be 0 km).
  if (!Number.isFinite(d) || d <= 0) return null;

  // Emission factor must be a real number and cannot be negative.
  if (!Number.isFinite(f) || f < 0) return null;

  // calculation used across the app: distance (km) × factor (g/km).
  return d * f;
}

module.exports = { calcEmissions };