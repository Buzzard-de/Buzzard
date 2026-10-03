"use strict";

/**
 * Adapter over existing commerce_idempotency. Does not create a third store.
 */
const inFlight = new Map();

function createSotIdempotencyAdapter(options = {}) {
  const commerce = options.commerce || require("../commerce/idempotency");

  async function execute({ operation, idempotencyKey, payload, execute: handler }) {
    if (!idempotencyKey) {
      return { replayed: false, result: await handler() };
    }
    const flightKey = `${operation}:${idempotencyKey}`;
    if (inFlight.has(flightKey)) {
      const error = new Error("An operation with the same idempotency key is already in progress");
      error.code = "IDEMPOTENCY_IN_PROGRESS";
      error.statusCode = 409;
      throw error;
    }

    const existing = commerce.getIdempotency({ key: idempotencyKey, scope: operation });
    if (existing) {
      if (payload != null && existing.payloadHash && existing.payloadHash !== commerce.payloadHash(payload)) {
        const error = new Error("Idempotency key reused with a different payload");
        error.code = "IDEMPOTENCY_CONFLICT";
        error.statusCode = 409;
        throw error;
      }
      return { replayed: true, result: existing.response };
    }

    inFlight.set(flightKey, true);
    try {
      const result = await handler();
      commerce.storeIdempotency({
        key: idempotencyKey,
        scope: operation,
        response: result,
        payload,
      });
      return { replayed: false, result };
    } finally {
      inFlight.delete(flightKey);
    }
  }

  function markInProgress(operation, idempotencyKey) {
    inFlight.set(`${operation}:${idempotencyKey}`, true);
  }

  function clearInProgress(operation, idempotencyKey) {
    inFlight.delete(`${operation}:${idempotencyKey}`);
  }

  return Object.freeze({ execute, markInProgress, clearInProgress });
}

module.exports = { createSotIdempotencyAdapter };
