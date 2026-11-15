/**
 * Separate production runtime risk from developer-toolchain advisories.
 */
function classify() {
  return {
    productionRuntime: ["next", "react", "react-dom"],
    developerToolchain: ["vitest", "tinypool", "@vitest/mocker", "eslint", "@typescript-eslint/*"],
    vitestMajorUpgrade: {
      from: "3.2.7",
      patchedAt: "4.1.11+",
      applied: false,
      reason: "Major upgrade needs separate approval. tinypool 2.2.0 override used instead.",
    },
    tinypoolOverride: "2.2.0",
    next16Applied: false,
  };
}

module.exports = { classify };
