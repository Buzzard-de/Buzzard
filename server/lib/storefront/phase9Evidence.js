/**
 * Phase 9 textile evidence. Rule engine and demo overlay only.
 * No image model is called.
 */
const {
  privacyGate,
  recordMeasurement,
  recommend,
  sizeAdvice,
  demoTryOn,
  deletePersonalData,
  imageModelAdapter,
  assessTextile,
} = require("./textileProgram");
const { combineOutfit, runSandboxSession } = require("./textileSandbox");

function runPhase9Evidence() {
  const denied = recordMeasurement({ consentMeasurements: false, values: { chest: 100 } });
  const stored = recordMeasurement({ consentMeasurements: true, values: { chest: 100, waist: 85 } });
  const missingSize = sizeAdvice({});
  const sized = sizeAdvice({ chest: 100, height: 180 });
  const work = recommend({ audience: "professional", occasion: "work", profession: "driver" });
  const unknown = recommend({ occasion: "not-a-product" });
  const outfit = combineOutfit({ pieces: ["formal"], audience: "professional", occasion: "work" });
  const noPhoto = demoTryOn({ consentPhoto: false });
  const demo = demoTryOn({ consentPhoto: true, angles: ["front", "side"] });
  const session = runSandboxSession({
    audience: "professional",
    occasion: "office",
    consentMeasurements: true,
    measurements: { chest: 100, waist: 85 },
    requestTryOn: true,
    consentPhoto: true,
  });
  const forgotten = deletePersonalData({ subject: "phase9-synthetic" });
  const image = imageModelAdapter();
  const assess = assessTextile();
  const privacy = privacyGate({ consentMeasurements: false, consentPhoto: false });
  const ok = denied.ok === false
    && denied.code === "CONSENT_REQUIRED"
    && denied.stored === false
    && stored.ok === true
    && stored.fields.includes("chest")
    && stored.liveTryOn === false
    && missingSize.size === null
    && missingSize.uncertainty === "NO_MEASUREMENTS"
    && sized.size === "M_ESTIMATE"
    && sized.fitGuarantee === false
    && work.line === "workwear"
    && work.reasons.length > 0
    && unknown.line === "daily"
    && outfit.liveTryOn === false
    && outfit.lines.includes("workwear")
    && noPhoto.ok === false
    && demo.ok === true
    && demo.liveTryOn === false
    && demo.demo === true
    && session.ok === true
    && session.liveTryOn === false
    && session.salesEnabled === false
    && session.recommendation.reasons.length > 0
    && forgotten.deleted.includes("photo")
    && forgotten.trainingUse === false
    && image.live === false
    && image.status === "BLOCKED"
    && assess.liveVerified === false
    && assess.completeClaim === false
    && privacy.storeMeasurements === false
    && privacy.storePhoto === false;
  return {
    ok,
    workwear: work.line,
    unknown: unknown.line,
    size: sized.size,
    missing: missingSize.uncertainty,
    image: image.status,
    tryOn: demo.liveTryOn,
    live: false,
    productionReady: false,
  };
}

module.exports = { runPhase9Evidence };
