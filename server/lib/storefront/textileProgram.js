/**
 * Textile AI program skeleton. Requirements stay approved; not LIVE_VERIFIED.
 */
const REQUIREMENTS = Object.freeze([
  "textile_homepage",
  "visual_slides",
  "promo_video",
  "optional_measurements",
  "optional_user_photo",
  "age_groups",
  "profession_outfits",
  "virtual_try_on",
  "multi_angle",
  "privacy_protection",
]);

function privacyGate({ consentMeasurements = false, consentPhoto = false } = {}) {
  return {
    storeMeasurements: consentMeasurements === true,
    storePhoto: consentPhoto === true,
    note: "No measurement or photo is stored without explicit opt-in.",
  };
}

function recordMeasurement({ consentMeasurements, values } = {}) {
  const gate = privacyGate({ consentMeasurements });
  if (!gate.storeMeasurements) {
    return { ok: false, code: "CONSENT_REQUIRED", stored: false };
  }
  return {
    ok: true,
    stored: true,
    fields: Object.keys(values || {}),
    liveTryOn: false,
  };
}

function assessTextile() {
  return {
    acceptanceStatus: "COMMAND_GIVEN",
    completeClaim: false,
    liveVerified: false,
    virtualTryOn: false,
    requirements: REQUIREMENTS,
    implemented: ["category_tree_cat-01", "textile_ai_roster", "privacy_opt_in_gate"],
    missing: REQUIREMENTS.filter((id) => id !== "privacy_protection"),
  };
}

module.exports = { REQUIREMENTS, privacyGate, recordMeasurement, assessTextile };
