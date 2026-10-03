"use strict";

const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sourceOfTruthRegistry");
const { createSotConflictDetector } = require("./sotConflictDetector");
const { createProductSot } = require("./productSot");
const { createOrderSot } = require("./orderSot");
const { createAvailabilitySot } = require("./availabilitySot");
const { createPriceSot } = require("./priceSot");
const { createSotIdempotencyAdapter } = require("./sotIdempotencyAdapter");
const { createSotAudit } = require("./sotAudit");
const { createSotVersionStore } = require("./sotVersions");
const { newCorrelationId } = require("../operations/correlationContext");

function createSourceOfTruthService(options = {}) {
  const env = options.env || process.env;
  const registry = options.registry || createSourceOfTruthRegistry({ env });
  const versions = options.versions || createSotVersionStore();
  const conflicts = options.conflicts || createSotConflictDetector();
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit });
  const idempotency = options.idempotency || createSotIdempotencyAdapter({ commerce: options.commerce });
  const product = options.productSot || createProductSot({ registry, versions, conflicts, audit, env, productService: options.productService, existingProductSot: options.existingProductSot });
  const order = options.orderSot || createOrderSot({ registry, versions, audit, env, orderService: options.orderService });
  const availability = options.availabilitySot || createAvailabilitySot({ registry, versions, conflicts, audit, inventory: options.inventory });
  const price = options.priceSot || createPriceSot({ registry, versions, conflicts, audit, pricing: options.pricing });

  function assertOwnership(entity, actor, operation, correlationId) {
    return registry.assertWriteAuthority({ entity, actor, operation, correlationId });
  }

  function assertWrite(input) {
    return registry.assertWriteAuthority(input);
  }

  function detectConflict(input) {
    return conflicts.detectConflict(input);
  }

  function getStatus(entity) {
    if (entity) return registry.getSoTStatus(entity);
    return {
      product: registry.getSoTStatus(ENTITIES.PRODUCT),
      order: registry.getSoTStatus(ENTITIES.ORDER),
      availability: registry.getSoTStatus(ENTITIES.AVAILABILITY),
      price: registry.getSoTStatus(ENTITIES.PRICE),
      salesLocked: registry.salesLocked,
      productSotActive: registry.productSotActive,
    };
  }

  function publicHealth() {
    const productStatus = registry.getSoTStatus(ENTITIES.PRODUCT);
    const orderStatus = registry.getSoTStatus(ENTITIES.ORDER);
    return {
      status: "ok",
      product: productStatus.status === "ACTIVE" ? "active" : "locked",
      order: orderStatus.status === "ACTIVE" || orderStatus.status === "CONDITIONAL" ? "active" : "locked",
      availability: "active",
      price: "active",
    };
  }

  function adminStatus() {
    const all = getStatus();
    return {
      product: { owner: all.product.owner, status: all.product.status, writable: all.product.writable },
      order: { owner: all.order.owner, status: all.order.status, writable: all.order.writable },
      availability: { owner: all.availability.owner, status: all.availability.status, writable: all.availability.writable },
      price: { owner: all.price.owner, status: all.price.status, writable: all.price.writable },
      salesLocked: all.salesLocked,
      productSotActive: all.productSotActive,
    };
  }

  return Object.freeze({
    ENTITIES,
    ACTORS,
    getProduct: (...args) => product.getProduct(...args),
    getOrder: (...args) => order.getOrder(...args),
    getAvailability: (...args) => availability.getAvailability(...args),
    getPrice: (...args) => price.getPrice(...args),
    assertOwnership,
    assertWrite,
    detectConflict,
    getStatus,
    publicHealth,
    adminStatus,
    product,
    order,
    availability,
    price,
    registry,
    idempotency,
    audit,
    ensureCorrelationId: (id) => id || newCorrelationId(),
  });
}

module.exports = { createSourceOfTruthService };
