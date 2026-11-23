/**
 * Local try-on checklist. No image leaves the process and no vision model runs.
 */
const ANGLES = new Set(["front", "side", "back"]);

function runTryOn({ consentPhoto, angles = ["front"], garmentId } = {}) {
  const refused = { ok: false, visionRan: false, live: false, fitGuarantee: false };
  if (consentPhoto !== true) return { ...refused, code: "CONSENT_REQUIRED" };
  const requested = Array.isArray(angles) ? angles.map((angle) => String(angle)) : [];
  if (requested.length === 0 || requested.some((angle) => !ANGLES.has(angle))) {
    return { ...refused, code: "ANGLE_NOT_ALLOWED" };
  }
  if (typeof garmentId !== "string" || garmentId.trim() === "") {
    return { ...refused, code: "GARMENT_REQUIRED" };
  }
  return {
    ok: true,
    code: "VISION_MODEL_BLOCKED",
    visionRan: false,
    live: false,
    fitGuarantee: false,
    overlay: "DEMO_CHECKLIST",
    angles: requested,
    garmentId: garmentId.trim(),
  };
}

module.exports = { ANGLES, runTryOn };
