/**
 * Local textile product scope. A licensed video and a live vision model stay blocked.
 */
const REQUIREMENTS = Object.freeze([
  { id: "textile_homepage", state: "LOCAL", surface: "category_hub" },
  { id: "visual_slides", state: "LOCAL", surface: "text_slide_draft" },
  { id: "promo_video", state: "BLOCKED", code: "VIDEO_LICENSE_REQUIRED" },
  { id: "optional_measurements", state: "LOCAL", surface: "consent_gate" },
  { id: "optional_user_photo", state: "LOCAL", surface: "consent_gate" },
  { id: "age_groups", state: "LOCAL", surface: "rule_recommendation" },
  { id: "profession_outfits", state: "LOCAL", surface: "rule_recommendation" },
  { id: "virtual_try_on", state: "LOCAL_DEMO", code: "VISION_MODEL_BLOCKED" },
  { id: "multi_angle", state: "LOCAL", surface: "angle_allowlist" },
  { id: "privacy_protection", state: "LOCAL", surface: "no_store_without_consent" },
]);

function productScope() {
  const blocked = REQUIREMENTS.filter((row) => row.state === "BLOCKED" || row.code);
  return {
    ok: REQUIREMENTS.length === 10,
    requirements: REQUIREMENTS,
    blocked: blocked.map((row) => row.id),
    live: false,
    completeClaim: false,
    licensedVideo: false,
  };
}

function draftSlides() {
  return {
    ok: true,
    live: false,
    licensedMedia: false,
    slides: [
      { id: "fit", text: "Größe ist eine Schätzung, keine Garantie." },
      { id: "privacy", text: "Foto und Maß werden nur mit Zustimmung gehalten." },
      { id: "work", text: "Beruf und Anlass wählen die Linie." },
    ],
  };
}

module.exports = { REQUIREMENTS, productScope, draftSlides };
