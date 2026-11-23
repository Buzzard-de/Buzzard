import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { productScope, draftSlides } = require("../lib/storefront/textileProductScope.js");
const { assessTextile } = require("../lib/storefront/textileProgram.js");
const { runTryOn } = require("../lib/storefront/tryOnPipeline.js");
const { acceptCameraFrame } = require("../lib/storefront/cameraIntake.js");
const { openSchedule, editSchedule, closeSchedule, publishBanner, coverage } = require("../lib/storefront/holidayProgram.js");
const { forwardDrySupplierOrder } = require("../lib/supplier/supplierOrderOrchestrator.js");
const { clientClaim, recordOperatorReview, readAttestation } = require("../lib/security/deviceStandard.js");
const { CHANNELS, prepare, publish } = require("../lib/marketing/adChannelAdapters.js");
const { planBudget, reserve, captureSpend } = require("../lib/marketing/campaignBudget.js");

describe("local surfaces that were not started", () => {
  it("defines the textile product scope without a licensed video", () => {
    const scope = productScope();
    expect(scope.requirements).toHaveLength(10);
    expect(scope.licensedVideo).toBe(false);
    expect(scope.live).toBe(false);
    expect(scope.completeClaim).toBe(false);
    expect(draftSlides().licensedMedia).toBe(false);
    expect(assessTextile().productScope.ok).toBe(true);
    expect(assessTextile().completeClaim).toBe(false);
  });

  it("runs a try-on checklist and does not call a vision model", () => {
    expect(runTryOn({ consentPhoto: false, garmentId: "coat" }).code).toBe("CONSENT_REQUIRED");
    expect(runTryOn({ consentPhoto: true, angles: ["top"], garmentId: "coat" }).code).toBe("ANGLE_NOT_ALLOWED");
    const result = runTryOn({ consentPhoto: true, angles: ["front", "side"], garmentId: "coat" });
    expect(result.ok).toBe(true);
    expect(result.visionRan).toBe(false);
    expect(result.live).toBe(false);
    expect(result.fitGuarantee).toBe(false);
    expect(result.code).toBe("VISION_MODEL_BLOCKED");
  });

  it("accepts a camera frame and stores nothing", () => {
    expect(acceptCameraFrame({ consentPhoto: true, mime: "image/jpeg", byteLength: 10, remoteUrl: "https://x" }).code).toBe("REMOTE_FETCH_DENIED");
    expect(acceptCameraFrame({ consentPhoto: false, mime: "image/jpeg", byteLength: 10 }).code).toBe("CONSENT_REQUIRED");
    expect(acceptCameraFrame({ consentPhoto: true, mime: "image/gif", byteLength: 10 }).code).toBe("MIME_NOT_ALLOWED");
    const frame = acceptCameraFrame({ consentPhoto: true, mime: "image/png", byteLength: 1200 });
    expect(frame.accepted).toBe(true);
    expect(frame.stored).toBe(false);
    expect(frame.live).toBe(false);
  });

  it("previews, edits, and closes a national-day draft without publishing", () => {
    expect(coverage().sourcedCountries).toBe(27);
    const opened = openSchedule({ country: "de" });
    expect(opened.ok).toBe(true);
    expect(opened.draft.published).toBe(false);
    const edited = editSchedule(opened.draft.id, "Tag der Deutschen Einheit");
    expect(edited.draft.status).toBe("edited");
    const closed = closeSchedule(opened.draft.id);
    expect(closed.draft.status).toBe("closed");
    expect(closed.published).toBe(false);
    expect(editSchedule(opened.draft.id, "again").code).toBe("NOT_EDITABLE");
    expect(publishBanner().published).toBe(false);
  });

  it("forwards a supplier order only as a dry queue", async () => {
    const result = await forwardDrySupplierOrder({
      supplierId: "api-supplier-dry",
      items: [{ supplierSku: "DRY-SKU-001", quantity: 1 }],
    });
    expect(result.live).toBe(false);
    expect(result.tracked.live).toBe(false);
    expect(result.tracked.trackingNumber).toBe(null);
    expect(result.submit.live).toBe(false);
  });

  it("does not treat a device checkbox as attestation", () => {
    expect(clientClaim({ bitlocker: true, attestedFromDevice: true }).code).toBe("CLAIM_IS_NOT_ATTESTATION");
    expect(clientClaim({}).code).toBe("NO_ATTESTATION");
    expect(recordOperatorReview({}).code).toBe("REVIEW_INCOMPLETE");
    const review = recordOperatorReview({ deviceId: "desk-1", operatorId: "owner" });
    const attested = readAttestation(review.reviewId);
    expect(attested.attested).toBe(true);
    expect(attested.liveDevice).toBe(false);
    expect(attested.completeClaim).toBe(false);
    expect(readAttestation("missing").code).toBe("NO_ATTESTATION");
    const firstReview = recordOperatorReview({ deviceId: "desk-old", operatorId: "owner" });
    for (let i = 0; i < 64; i += 1) recordOperatorReview({ deviceId: `desk-${i}`, operatorId: "owner" });
    expect(readAttestation(firstReview.reviewId).code).toBe("NO_ATTESTATION");
    const holidays = [];
    for (let i = 0; i < 70; i += 1) holidays.push(openSchedule({ country: "DE", copy: `<script>${i}</script>` }));
    expect(editSchedule(holidays[0].draft.id, "old").code).toBe("NOT_FOUND");
    expect(holidays.at(-1).draft.copy.includes("<")).toBe(false);
  });

  it("keeps the four ad channels local and unpaid", () => {
    expect(CHANNELS).toEqual(["google", "facebook", "tiktok", "youtube"]);
    for (const channel of CHANNELS) {
      expect(prepare(channel).networkCalled).toBe(false);
      const sent = publish(channel);
      expect(sent.code).toBe("CREDENTIALS_REQUIRED");
      expect(sent.networkCalled).toBe(false);
      expect(sent.spent).toBe(0);
    }
    expect(prepare("instagram").code).toBe("UNKNOWN_CHANNEL");
  });

  it("plans a campaign budget and refuses the spend", () => {
    const plan = planBudget({ channel: "google", limitCents: 5000 });
    expect(plan.spentCents).toBe(0);
    expect(reserve(plan, 6000).code).toBe("BUDGET_EXCEEDED");
    const held = reserve(plan, 1000);
    expect(held.reservedCents).toBe(1000);
    expect(held.spentCents).toBe(0);
    expect(captureSpend().code).toBe("ADS_SPEND_LOCKED");
    expect(captureSpend().spentCents).toBe(0);
  });
});
