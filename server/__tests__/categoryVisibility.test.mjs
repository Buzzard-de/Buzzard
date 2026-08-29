import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  computeOverallReadiness,
  getReadinessBlockers,
  canActivateForSale,
  defaultReadiness,
  isVisibleToCustomer,
} = require("../lib/categoryVisibility");
const { READINESS_STATUS, CATEGORY_VISIBILITY } = require("../core/constants");

describe("categoryVisibility readiness", () => {
  it("default readiness is NOT_READY overall", () => {
    const r = defaultReadiness();
    expect(r.overall).toBe(READINESS_STATUS.NOT_READY);
    expect(r.payment).toBe(READINESS_STATUS.BLOCKED);
  });

  it("computeOverallReadiness returns READY when all checks pass", () => {
    const readiness = {
      products: READINESS_STATUS.READY,
      pricing: READINESS_STATUS.READY,
      stock: READINESS_STATUS.READY,
      supplier: READINESS_STATUS.READY,
      shipping: READINESS_STATUS.READY,
      frontend: READINESS_STATUS.READY,
      legal: READINESS_STATUS.READY,
      content: READINESS_STATUS.READY,
    };
    expect(computeOverallReadiness(readiness, CATEGORY_VISIBILITY.ACTIVE)).toBe(READINESS_STATUS.READY);
  });

  it("BLOCKED check forces BLOCKED overall", () => {
    const readiness = { ...defaultReadiness(), legal: READINESS_STATUS.BLOCKED };
    expect(computeOverallReadiness(readiness, CATEGORY_VISIBILITY.ACTIVE)).toBe(READINESS_STATUS.BLOCKED);
  });

  it("getReadinessBlockers lists non-ready checks", () => {
    const { blockers, overall } = getReadinessBlockers(defaultReadiness(), CATEGORY_VISIBILITY.ACTIVE);
    expect(overall).toBe(READINESS_STATUS.NOT_READY);
    expect(blockers.length).toBeGreaterThan(0);
  });

  it("canActivateForSale false when sales disabled", () => {
    const prev = process.env.BUZZARD_SALES_ENABLED;
    process.env.BUZZARD_SALES_ENABLED = "0";
    const ready = {
      products: READINESS_STATUS.READY,
      pricing: READINESS_STATUS.READY,
      stock: READINESS_STATUS.READY,
      supplier: READINESS_STATUS.READY,
      shipping: READINESS_STATUS.READY,
      frontend: READINESS_STATUS.READY,
      legal: READINESS_STATUS.READY,
      content: READINESS_STATUS.READY,
    };
    expect(canActivateForSale(ready, CATEGORY_VISIBILITY.HIDDEN)).toBe(false);
    process.env.BUZZARD_SALES_ENABLED = prev;
  });

  it("customer visibility excludes HIDDEN and DRAFT", () => {
    expect(isVisibleToCustomer(CATEGORY_VISIBILITY.ACTIVE)).toBe(true);
    expect(isVisibleToCustomer(CATEGORY_VISIBILITY.COMING_SOON)).toBe(true);
    expect(isVisibleToCustomer(CATEGORY_VISIBILITY.HIDDEN)).toBe(false);
    expect(isVisibleToCustomer(CATEGORY_VISIBILITY.DRAFT)).toBe(false);
  });
});
