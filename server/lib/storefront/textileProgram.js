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

function recommend({ audience, occasion, profession } = {}) {
  const reasons = [];
  let line = "daily";
  if (occasion === "work" || profession) {
    line = "workwear";
    reasons.push("Beruf/Anlass Arbeit → Berufskleidung");
  } else if (occasion === "formal") {
    line = "formal";
    reasons.push("Festlicher Anlass → formelle Linie");
  } else if (occasion === "sport") {
    line = "sport";
    reasons.push("Sportanlass");
  } else {
    reasons.push("Kein Pflichtfeld gesetzt — Alltagsvorschlag");
  }
  if (audience === "children" || audience === "youth") {
    reasons.push("Jugend/Kinder — kein Erwachsenen-Schnitt");
  }
  return {
    ok: true,
    line,
    audience: audience || null,
    reasons,
    fitGuarantee: false,
    liveTryOn: false,
  };
}

function demoTryOn({ consentPhoto, angles = ["front"] } = {}) {
  const gate = privacyGate({ consentPhoto });
  if (!gate.storePhoto) {
    return { ok: false, code: "CONSENT_REQUIRED", liveTryOn: false };
  }
  return {
    ok: true,
    liveTryOn: false,
    demo: true,
    angles,
    note: "DEMO overlay only. Not a body-fit guarantee. No live image model.",
  };
}

function retentionPolicy() {
  return {
    photoDays: 7,
    measurementDays: 30,
    trainingUse: false,
    deletion: "user_request_or_ttl",
  };
}

function assessTextile() {
  return {
    acceptanceStatus: "CODE_READY",
    completeClaim: false,
    liveVerified: false,
    virtualTryOn: false,
    requirements: REQUIREMENTS,
    implemented: [
      "category_tree_cat-01",
      "textile_ai_hub_ui",
      "privacy_opt_in_gate",
      "optional_fields",
      "rule_recommendations",
      "demo_try_on_adapter",
    ],
    missing: ["promo_video_licensed", "live_image_model"],
  };
}

module.exports = {
  REQUIREMENTS,
  privacyGate,
  recordMeasurement,
  recommend,
  demoTryOn,
  retentionPolicy,
  assessTextile,
};
