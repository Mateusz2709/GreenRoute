const { calcEmissions } = require("../utils/emissions");

describe("calcEmissions()", () => {
  test("returns distance * factor for valid inputs", () => {
    // Valid values should calculate a multiplication result.
    expect(calcEmissions(10, 120)).toBe(1200);

    // String numbers should still work if they can be converted safely.
    expect(calcEmissions("2.5", "100")).toBe(250);
  });

  test("returns null for invalid distance", () => {
    // Distance must be a positive number.
    expect(calcEmissions(0, 100)).toBeNull();
    expect(calcEmissions(-5, 100)).toBeNull();

    // Non-numeric inputs should be rejected.
    expect(calcEmissions("abc", 100)).toBeNull();
  });

  test("returns null for invalid factor", () => {
    // Factor must be 0 or higher.
    expect(calcEmissions(10, -1)).toBeNull();

    // Non-numeric inputs should be rejected.
    expect(calcEmissions(10, "x")).toBeNull();
  });
});