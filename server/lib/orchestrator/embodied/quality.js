const LEVELS = Object.freeze(["HIGH", "MEDIUM", "LOW", "MOBILE"]);

function resolveQuality({ viewportWidth, reducedMotion, world3d } = {}) {
  if (reducedMotion) return "LOW";
  if (!world3d) return "LOW";
  const w = Number(viewportWidth) || 1280;
  if (w < 768) return "MOBILE";
  if (w < 1024) return "MEDIUM";
  return "HIGH";
}

function profile(level) {
  const name = LEVELS.includes(level) ? level : "MEDIUM";
  const table = {
    HIGH: { lod: 1, effects: true, animation: "full", rendererHint: "full" },
    MEDIUM: { lod: 0.7, effects: false, animation: "reduced", rendererHint: "reduced-effects" },
    LOW: { lod: 0.4, effects: false, animation: "minimal", rendererHint: "reduced-animation" },
    MOBILE: { lod: 0.35, effects: false, animation: "minimal", rendererHint: "optimized-fallback" },
  };
  return { level: name, ...table[name] };
}

module.exports = { LEVELS, resolveQuality, profile };
