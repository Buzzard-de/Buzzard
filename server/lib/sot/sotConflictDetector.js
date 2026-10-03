"use strict";

const { ACTORS } = require("./sourceOfTruthRegistry");

const CONFLICT = Object.freeze({
  NO_CONFLICT: "NO_CONFLICT",
  STALE_WRITE: "STALE_WRITE",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  SOURCE_CONFLICT: "SOURCE_CONFLICT",
  OWNERSHIP_CONFLICT: "OWNERSHIP_CONFLICT",
});

function createSotConflictDetector(options = {}) {
  const owners = options.owners || {
    PRODUCT: ACTORS.PRODUCT_ENGINE,
    ORDER: ACTORS.ORDER_ENGINE,
    AVAILABILITY: ACTORS.AVAILABILITY_ENGINE,
    PRICE: ACTORS.PRICING_ENGINE,
  };

  function detectConflict({
    entity,
    sotVersion,
    incomingVersion,
    expectedVersion = null,
    source,
    correlationId = null,
  } = {}) {
    const owner = owners[String(entity || "").toUpperCase()];
    const current = Number(sotVersion);
    const incoming = Number(incomingVersion);
    const expected = expectedVersion == null ? null : Number(expectedVersion);

    if (source && owner && source !== owner && !["supplier_catalog", "supplier_stock", "supplier_price", "marketplace_ingestion", "ai_proposal"].includes(source)) {
      if (["marketplace", "marketplace_catalog", "marketplace_listing"].includes(source)) {
        return {
          type: CONFLICT.OWNERSHIP_CONFLICT,
          entity,
          source,
          owner,
          sotVersion: current,
          incomingVersion: incoming,
          correlationId,
        };
      }
    }

    if (expected != null && Number.isFinite(expected) && expected !== current) {
      return {
        type: CONFLICT.VERSION_CONFLICT,
        entity,
        sotVersion: current,
        expectedVersion: expected,
        incomingVersion: incoming,
        correlationId,
      };
    }

    if (Number.isFinite(incoming) && Number.isFinite(current) && incoming < current) {
      return {
        type: CONFLICT.STALE_WRITE,
        entity,
        source,
        sotVersion: current,
        incomingVersion: incoming,
        correlationId,
      };
    }

    if (source && owner && source !== owner && ["marketplace", "marketplace_catalog"].includes(String(source))) {
      return {
        type: CONFLICT.OWNERSHIP_CONFLICT,
        entity,
        source,
        owner,
        correlationId,
      };
    }

    if (source && owner && source !== owner && incoming > current && !["supplier_stock", "supplier_catalog", "supplier_price"].includes(source)) {
      return {
        type: CONFLICT.SOURCE_CONFLICT,
        entity,
        source,
        owner,
        sotVersion: current,
        incomingVersion: incoming,
        correlationId,
      };
    }

    return {
      type: CONFLICT.NO_CONFLICT,
      entity,
      sotVersion: current,
      incomingVersion: incoming,
      correlationId,
    };
  }

  return Object.freeze({ detectConflict, CONFLICT });
}

module.exports = {
  createSotConflictDetector,
  CONFLICT,
};
