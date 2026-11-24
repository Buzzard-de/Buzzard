import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

process.env.BUZZARD_SALES_ENABLED = "0";
const require = createRequire(import.meta.url);
const { createLostShipmentDry, NEXT_STEPS } = require("../lib/logistics/lostShipmentDry.js");

const hour = 60 * 60 * 1000;

describe("MF-LOG-03 dry lost-shipment book", () => {
  it("rejects a window that is empty or reversed", () => {
    expect(createLostShipmentDry({ staleAfterMs: 0 }).code).toBe("WINDOW_INVALID");
    expect(createLostShipmentDry({ staleAfterMs: 5000, escalateAfterMs: 1000 }).code).toBe("WINDOW_INVALID");
    expect(createLostShipmentDry({ staleAfterMs: 1.5 }).code).toBe("WINDOW_INVALID");
  });

  it("keeps a moving shipment off the candidate list", () => {
    const book = createLostShipmentDry({ staleAfterMs: 2 * hour, escalateAfterMs: 4 * hour });
    const result = book.observe({
      eventId: "evt-moving",
      shipmentId: "dry-ship-1",
      status: "IN_TRANSIT",
      lastProgressAt: 0,
      now: hour,
    });
    expect(result.code).toBe("STILL_MOVING");
    expect(result.created).toBe(false);
    expect(result.carrierCalled).toBe(false);
    expect(result.customerNotified).toBe(false);
    expect(book.candidates()).toHaveLength(0);
    expect(book.events()).toHaveLength(1);
  });

  it("opens one candidate when progress stops past the window and does not repeat the event", () => {
    const book = createLostShipmentDry({ staleAfterMs: 2 * hour, escalateAfterMs: 5 * hour });
    const opened = book.observe({
      eventId: "evt-stale",
      shipmentId: "dry-ship-2",
      status: "IN_TRANSIT",
      lastProgressAt: 0,
      now: 3 * hour,
    });
    const replay = book.observe({
      eventId: "evt-stale",
      shipmentId: "dry-ship-2",
      status: "IN_TRANSIT",
      lastProgressAt: 0,
      now: 9 * hour,
    });
    const again = book.observe({
      eventId: "evt-stale-2",
      shipmentId: "dry-ship-2",
      status: "IN_TRANSIT",
      lastProgressAt: 0,
      now: 6 * hour,
    });
    expect(opened.code).toBe("LOST_CANDIDATE");
    expect(opened.created).toBe(true);
    expect(opened.candidate.escalated).toBe(false);
    expect(opened.candidate.nextSteps.map((step) => step.step)).toEqual([...NEXT_STEPS]);
    expect(opened.candidate.nextSteps.every((step) => step.requiresHuman && step.executed === false)).toBe(true);
    expect(replay.code).toBe("DUPLICATE_EVENT");
    expect(replay.created).toBe(false);
    expect(again.code).toBe("EXISTING_CANDIDATE");
    expect(again.candidate.id).toBe(opened.candidate.id);
    expect(again.candidate.escalated).toBe(true);
    expect(book.candidates()).toHaveLength(1);
    expect(book.events()).toHaveLength(2);
    expect(opened.live).toBe(false);
    expect(opened.refundIssued).toBe(false);
    expect(opened.labelPurchased).toBe(false);
    expect(opened.realMoneyMovement).toBe(false);
  });

  it("does not turn a delivered snapshot into a candidate", () => {
    const book = createLostShipmentDry({ staleAfterMs: 1000, escalateAfterMs: 2000 });
    const result = book.observe({
      eventId: "evt-delivered",
      shipmentId: "dry-ship-3",
      status: "DELIVERED",
      lastProgressAt: 0,
      now: 9000,
    });
    expect(result.code).toBe("DELIVERED");
    expect(book.candidates()).toHaveLength(0);
  });

  it("records a human step without executing it and refuses a repeat, an AI actor, and a missing event", () => {
    const book = createLostShipmentDry({ staleAfterMs: 1000, escalateAfterMs: 2000 });
    book.observe({
      eventId: "evt-human",
      shipmentId: "dry-ship-4",
      status: "DELAYED",
      lastProgressAt: 0,
      now: 3000,
    });
    const missing = book.recordHumanStep({ eventId: "evt-human", step: "confirm_lost" });
    const ai = book.recordHumanStep({ eventId: "evt-human", step: "contact_customer", approverId: "mira", actorType: "AI" });
    const held = book.recordHumanStep({ eventId: "evt-human", step: "refund_review", approverId: "desk@example.invalid", actorType: "HUMAN" });
    const duplicate = book.recordHumanStep({ eventId: "evt-human", step: "refund_review", approverId: "desk@example.invalid", actorType: "HUMAN" });
    const unknown = book.recordHumanStep({ eventId: "missing", step: "confirm_lost", approverId: "desk@example.invalid" });
    expect(missing.code).toBe("ACTOR_REQUIRED");
    expect(ai.code).toBe("AI_WRITE_DENIED");
    expect(held.ok).toBe(false);
    expect(held.code).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(held.executed).toBe(false);
    expect(held.customerNotified).toBe(false);
    expect(held.refundIssued).toBe(false);
    expect(duplicate.code).toBe("DUPLICATE_STEP");
    expect(unknown.code).toBe("EVENT_NOT_FOUND");
    expect(book.actions()).toHaveLength(1);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe("0");
  });
});
