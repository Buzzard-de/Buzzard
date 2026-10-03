"use strict";

const ENTITIES = Object.freeze({
  PRODUCT: "PRODUCT",
  ORDER: "ORDER",
  AVAILABILITY: "AVAILABILITY",
  PRICE: "PRICE",
});

const ACTORS = Object.freeze({
  PRODUCT_ENGINE: "product_engine",
  ORDER_ENGINE: "order_engine",
  AVAILABILITY_ENGINE: "availability_engine",
  PRICING_ENGINE: "pricing_engine",
  SUPPLIER: "supplier",
  MARKETPLACE: "marketplace",
  AI: "ai",
  PUSAT: "pusat",
  VOICE: "voice",
  ADMIN_UI: "admin_ui",
});

const STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  LOCKED: "LOCKED",
  CONDITIONAL: "CONDITIONAL",
  BLOCKED: "BLOCKED",
});

function createSourceOfTruthRegistry(options = {}) {
  const env = options.env || process.env;
  const productSotActive = env.BUZZARD_PRODUCT_SOT_ACTIVE === "1";
  const salesEnabled = env.BUZZARD_SALES_ENABLED === "1";

  const records = Object.freeze({
    [ENTITIES.PRODUCT]: {
      entity: ENTITIES.PRODUCT,
      owner: ACTORS.PRODUCT_ENGINE,
      writeAuthority: [ACTORS.PRODUCT_ENGINE],
      readSources: [ACTORS.PRODUCT_ENGINE, "supplier_catalog", "marketplace_catalog", "ai_proposal"],
      projections: ["marketplace_catalog"],
      sourceInputs: ["supplier_catalog", "ai_proposal"],
      mutable: productSotActive,
      featureFlag: "BUZZARD_PRODUCT_SOT_ACTIVE",
      safetyState: productSotActive ? STATUSES.ACTIVE : STATUSES.LOCKED,
    },
    [ENTITIES.ORDER]: {
      entity: ENTITIES.ORDER,
      owner: ACTORS.ORDER_ENGINE,
      writeAuthority: [ACTORS.ORDER_ENGINE],
      readSources: [ACTORS.ORDER_ENGINE, "marketplace_ingestion", "ai_proposal"],
      projections: ["supplier_fulfillment"],
      sourceInputs: ["marketplace_ingestion"],
      mutable: true,
      featureFlag: "BUZZARD_SALES_ENABLED",
      safetyState: salesEnabled ? STATUSES.CONDITIONAL : STATUSES.LOCKED,
    },
    [ENTITIES.AVAILABILITY]: {
      entity: ENTITIES.AVAILABILITY,
      owner: ACTORS.AVAILABILITY_ENGINE,
      writeAuthority: [ACTORS.AVAILABILITY_ENGINE],
      readSources: [ACTORS.AVAILABILITY_ENGINE, "supplier_stock", "product_identity"],
      projections: ["marketplace_stock"],
      sourceInputs: ["supplier_stock"],
      mutable: true,
      featureFlag: null,
      safetyState: STATUSES.ACTIVE,
    },
    [ENTITIES.PRICE]: {
      entity: ENTITIES.PRICE,
      owner: ACTORS.PRICING_ENGINE,
      writeAuthority: [ACTORS.PRICING_ENGINE],
      readSources: [ACTORS.PRICING_ENGINE, "supplier_price", "marketplace_intelligence", "ai_proposal"],
      projections: ["marketplace_listing"],
      sourceInputs: ["supplier_price", "ai_proposal"],
      mutable: true,
      featureFlag: null,
      safetyState: STATUSES.ACTIVE,
    },
  });

  function getSoT(entity) {
    const rec = records[String(entity || "").toUpperCase()];
    if (!rec) {
      const err = new Error(`Unknown SoT entity: ${entity}`);
      err.code = "SOT_UNKNOWN_ENTITY";
      throw err;
    }
    return rec;
  }

  function getWriteOwner(entity) {
    return getSoT(entity).owner;
  }

  function isProjection(entity, source) {
    return getSoT(entity).projections.includes(source);
  }

  function isSourceInput(entity, source) {
    return getSoT(entity).sourceInputs.includes(source);
  }

  function assertReadSource(entity, source) {
    const rec = getSoT(entity);
    const allowed = new Set([rec.owner, ...rec.readSources, ...rec.sourceInputs, ...rec.projections]);
    if (!allowed.has(source)) {
      const err = new Error(`Source ${source} is not a read source for ${entity}`);
      err.code = "SOT_READ_SOURCE_DENIED";
      err.metadata = { entity, source };
      throw err;
    }
    return true;
  }

  function assertWriteAuthority({ entity, actor, operation = "write", correlationId = null, authorizedOverride = false } = {}) {
    const rec = getSoT(entity);
    if (rec.writeAuthority.includes(actor)) {
      return { ok: true, entity, actor, owner: rec.owner, operation, correlationId };
    }
    if (actor === ACTORS.ADMIN_UI && authorizedOverride === true) {
      return { ok: true, entity, actor, owner: rec.owner, operation, correlationId, override: true };
    }
    const { writeAuthorityViolation } = require("./sotErrors");
    throw writeAuthorityViolation({ entity, actor, owner: rec.owner, operation, correlationId });
  }

  function getSoTStatus(entity) {
    const rec = getSoT(entity);
    let status = rec.safetyState;
    let writable = rec.writeAuthority.length > 0 && rec.mutable;
    if (entity === ENTITIES.PRODUCT && !productSotActive) {
      status = STATUSES.LOCKED;
      writable = false;
    }
    if (entity === ENTITIES.ORDER && !salesEnabled) {
      status = STATUSES.LOCKED;
    }
    return {
      entity: rec.entity,
      owner: rec.owner,
      status,
      writable,
      writeAuthority: rec.writeAuthority,
      readSources: rec.readSources,
      projections: rec.projections,
      featureFlag: rec.featureFlag,
      safetyState: rec.safetyState,
      productSotActive,
      salesLocked: !salesEnabled,
    };
  }

  function list() {
    return Object.values(ENTITIES).map((entity) => getSoT(entity));
  }

  return Object.freeze({
    ENTITIES,
    ACTORS,
    STATUSES,
    getSoT,
    getWriteOwner,
    isProjection,
    isSourceInput,
    assertReadSource,
    assertWriteAuthority,
    getSoTStatus,
    list,
    productSotActive,
    salesLocked: !salesEnabled,
  });
}

module.exports = {
  createSourceOfTruthRegistry,
  ENTITIES,
  ACTORS,
  STATUSES,
};
