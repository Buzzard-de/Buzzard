/**
 * Local lost-shipment candidate book.
 * No carrier call, customer message, refund, label, or payment.
 */
const NEXT_STEPS = Object.freeze(["confirm_lost", "contact_customer", "refund_review", "reorder_review"]);

function dryFlags() {
  return {
    live: false,
    carrierCalled: false,
    customerNotified: false,
    refundIssued: false,
    labelPurchased: false,
    paymentCaptured: false,
    realMoneyMovement: false,
  };
}

function positiveWindow(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function createLostShipmentDry(options = {}) {
  const flags = dryFlags();
  const staleAfterMs = positiveWindow(options.staleAfterMs, 48 * 60 * 60 * 1000);
  const escalateAfterMs = positiveWindow(options.escalateAfterMs, 72 * 60 * 60 * 1000);
  if (staleAfterMs == null || escalateAfterMs == null || escalateAfterMs < staleAfterMs) {
    return { ok: false, code: "WINDOW_INVALID", ...flags };
  }

  const events = [];
  const actions = [];
  const seenEvents = new Map();
  const candidateByShipment = new Map();
  let sequence = 0;

  function observe(input = {}) {
    const eventId = typeof input.eventId === "string" ? input.eventId.trim() : "";
    if (!eventId) return { ok: false, code: "EVENT_ID_REQUIRED", created: false, ...flags };
    if (seenEvents.has(eventId)) {
      return { ok: true, code: "DUPLICATE_EVENT", created: false, candidate: seenEvents.get(eventId), ...flags };
    }
    const shipmentId = typeof input.shipmentId === "string" ? input.shipmentId.trim() : "";
    if (!shipmentId) return { ok: false, code: "SHIPMENT_ID_REQUIRED", created: false, ...flags };
    const now = input.now;
    const lastProgressAt = input.lastProgressAt;
    if (typeof now !== "number" || typeof lastProgressAt !== "number" || !Number.isFinite(now) || !Number.isFinite(lastProgressAt) || now < lastProgressAt) {
      return { ok: false, code: "TIME_INVALID", created: false, ...flags };
    }

    const status = String(input.status || "").toUpperCase();
    const idleMs = now - lastProgressAt;
    const delivered = status === "DELIVERED";
    const moving = idleMs < staleAfterMs;
    let candidate = candidateByShipment.get(shipmentId) || null;
    let code = delivered ? "DELIVERED" : moving ? "STILL_MOVING" : "LOST_CANDIDATE";
    let created = false;
    if (!delivered && !moving) {
      if (!candidate) {
        sequence += 1;
        candidate = {
          id: `dry-lost-${sequence}`,
          shipmentId,
          status: "LOST_CANDIDATE",
          sourceStatus: status,
          idleMs,
          windowMs: staleAfterMs,
          escalateAfterMs,
          escalated: idleMs >= escalateAfterMs,
          nextSteps: NEXT_STEPS.map((step) => ({ step, requiresHuman: true, executed: false })),
          live: false,
        };
        candidateByShipment.set(shipmentId, candidate);
        created = true;
      } else {
        code = "EXISTING_CANDIDATE";
        candidate = { ...candidate, idleMs, escalated: idleMs >= escalateAfterMs };
        candidateByShipment.set(shipmentId, candidate);
      }
    }

    const event = { eventId, shipmentId, status, idleMs, code, candidateId: candidate ? candidate.id : null };
    events.push(event);
    seenEvents.set(eventId, candidate);
    return { ok: true, code, created, candidate, event, ...flags };
  }

  function recordHumanStep(input = {}) {
    const approverId = typeof input.approverId === "string" ? input.approverId.trim() : "";
    if (!approverId) return { ok: false, code: "ACTOR_REQUIRED", executed: false, ...flags };
    if (String(input.actorType || "").toUpperCase() === "AI") {
      return { ok: false, code: "AI_WRITE_DENIED", executed: false, ...flags };
    }
    if (!NEXT_STEPS.includes(input.step)) return { ok: false, code: "STEP_UNKNOWN", executed: false, ...flags };
    const eventId = typeof input.eventId === "string" ? input.eventId.trim() : "";
    if (!eventId || !seenEvents.has(eventId)) return { ok: false, code: "EVENT_NOT_FOUND", executed: false, ...flags };
    const key = `${eventId}:${input.step}`;
    if (actions.some((row) => row.key === key)) {
      return { ok: false, code: "DUPLICATE_STEP", executed: false, ...flags };
    }
    actions.push({ key, eventId, step: input.step, approverId, requiresHuman: true, executed: false });
    return { ok: false, code: "HUMAN_APPROVAL_REQUIRED", executed: false, ...flags };
  }

  return {
    ok: true,
    ...flags,
    windows: { staleAfterMs, escalateAfterMs },
    observe,
    recordHumanStep,
    events: () => events.map((row) => ({ ...row })),
    candidates: () => [...candidateByShipment.values()].map((row) => ({ ...row, nextSteps: row.nextSteps.map((step) => ({ ...step })) })),
    actions: () => actions.map((row) => ({ ...row })),
  };
}

module.exports = { NEXT_STEPS, createLostShipmentDry };
