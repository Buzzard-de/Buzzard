"use strict";

const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sourceOfTruthRegistry");
const { writeBlocked, versionConflict } = require("./sotErrors");
const { createSotAudit } = require("./sotAudit");
const { createSotVersionStore } = require("./sotVersions");
const { newCorrelationId } = require("../operations/correlationContext");

function createOrderSot(options = {}) {
  const registry = options.registry || createSourceOfTruthRegistry({ env: options.env });
  const versions = options.versions || createSotVersionStore();
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit });
  const env = options.env || process.env;
  const orderService = options.orderService || null;

  function salesLocked() {
    return env.BUZZARD_SALES_ENABLED !== "1";
  }

  function assertOrderWrite(input) {
    return registry.assertWriteAuthority({
      entity: ENTITIES.ORDER,
      actor: input.actor,
      operation: input.operation || "order.write",
      correlationId: input.correlationId,
    });
  }

  function getOrder(orderId) {
    if (orderService && typeof orderService.getOrder === "function") {
      return orderService.getOrder(orderId);
    }
    return {
      entity: ENTITIES.ORDER,
      entityId: orderId,
      version: versions.getVersion(ENTITIES.ORDER, orderId),
      source: ACTORS.ORDER_ENGINE,
    };
  }

  function getOrderVersion(orderId) {
    return versions.getVersion(ENTITIES.ORDER, orderId);
  }

  function createOrder(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    assertOrderWrite({ actor: input.actor, operation: "createOrder", correlationId });
    if (input.externalSideEffect && salesLocked()) {
      audit.record({ result: "rejected", entity: ENTITIES.ORDER, actor: input.actor, operation: "createOrder", reason: "SALES_LOCKED", correlationId });
      throw writeBlocked({ entity: ENTITIES.ORDER, reason: "SALES_LOCKED", correlationId });
    }
    const entityId = input.orderId || `ord_${Date.now()}`;
    const version = versions.nextVersion(ENTITIES.ORDER, entityId);
    audit.record({ result: "accepted", entity: ENTITIES.ORDER, entityId, actor: input.actor, source: input.source, operation: "createOrder", version, correlationId });
    return {
      entity: ENTITIES.ORDER,
      entityId,
      version,
      source: ACTORS.ORDER_ENGINE,
      updatedAt: new Date().toISOString(),
      correlationId,
      dryRun: salesLocked(),
    };
  }

  function ingestMarketplaceOrder(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    assertOrderWrite({ actor: ACTORS.ORDER_ENGINE, operation: "ingestMarketplaceOrder", correlationId });
    registry.assertReadSource(ENTITIES.ORDER, "marketplace_ingestion");
    const entityId = input.marketplaceOrderId || input.orderId || `mkt_${Date.now()}`;
    const version = versions.nextVersion(ENTITIES.ORDER, entityId);
    audit.record({ result: "accepted", entity: ENTITIES.ORDER, entityId, actor: ACTORS.ORDER_ENGINE, source: "marketplace_ingestion", operation: "ingestMarketplaceOrder", version, correlationId });
    return {
      ok: true,
      ingested: true,
      live: !salesLocked(),
      entity: ENTITIES.ORDER,
      entityId,
      version,
      source: ACTORS.ORDER_ENGINE,
      correlationId,
      externalSideEffect: false,
    };
  }

  function updateOrderState(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    assertOrderWrite({ actor: input.actor, operation: "updateOrderState", correlationId });
    const current = versions.getVersion(ENTITIES.ORDER, input.orderId);
    if (input.expectedVersion != null && Number(input.expectedVersion) !== current) {
      throw versionConflict({
        entity: ENTITIES.ORDER,
        entityId: input.orderId,
        expectedVersion: input.expectedVersion,
        actualVersion: current,
        correlationId,
      });
    }
    const version = versions.nextVersion(ENTITIES.ORDER, input.orderId);
    return { entity: ENTITIES.ORDER, entityId: input.orderId, version, source: ACTORS.ORDER_ENGINE, correlationId, updatedAt: new Date().toISOString() };
  }

  function reserveOrder(input = {}) {
    return createOrder({ ...input, operation: "reserveOrder" });
  }

  function cancelOrder(input = {}) {
    const correlationId = input.correlationId || newCorrelationId();
    assertOrderWrite({ actor: input.actor, operation: "cancelOrder", correlationId });
    if (input.externalSideEffect && salesLocked()) {
      throw writeBlocked({ entity: ENTITIES.ORDER, reason: "SALES_LOCKED", correlationId });
    }
    return updateOrderState({ ...input, correlationId });
  }

  return Object.freeze({
    getOrder,
    createOrder,
    updateOrderState,
    getOrderVersion,
    reserveOrder,
    cancelOrder,
    ingestMarketplaceOrder,
    assertOrderWrite,
    salesLocked,
  });
}

module.exports = { createOrderSot };
