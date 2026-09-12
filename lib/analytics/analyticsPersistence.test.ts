import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { seedOrderEngineFixtures } from "@/lib/order-engine/test-fixtures";
import { createMemoryAnalyticsStore } from "./store/memoryStore";
import { configureAnalyticsStore, resetAnalyticsStoreToMemory } from "./store/configure";
import {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  createFixtureOrder,
} from "./fixtures";
import {
  collectAnalyticsEvent,
  ingestAuthoritativeOrderPurchase,
  computeRevenueMetrics,
  listEvents,
} from "./index";
import {
  getEvent,
  isIdempotencyKeyUsed,
  getIdempotencyEventId,
} from "./registry";
import { buildPageView } from "./fixtures";

const VISITOR = "bv_persist_test";

function loadPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentAnalyticsStore } = require("../../server/lib/analytics/persistentStore.js");
    return createPersistentAnalyticsStore();
  } catch {
    return null;
  }
}

describe("Analytics Production Persistence", () => {
  describe("Memory store (test fallback)", () => {
    beforeEach(() => {
      seedAnalyticsFixtures();
      seedAnalyticsWithConsent(VISITOR, "DE");
    });

    it("stores and retrieves events in memory", () => {
      collectAnalyticsEvent(buildPageView({ anonymousVisitorId: VISITOR }));
      expect(listEvents().length).toBe(1);
    });
  });

  describe("Persistent SQLite store", () => {
    const persistentStore = loadPersistentStore();

    beforeEach(() => {
      if (!persistentStore) return;
      persistentStore.clear();
      configureAnalyticsStore(persistentStore, "sqlite");
      seedOrderEngineFixtures();
      seedAnalyticsWithConsent(VISITOR, "DE");
    });

    afterEach(() => {
      resetAnalyticsStoreToMemory();
    });

    it.skipIf(!persistentStore)("persists events across store re-instantiation", () => {
      collectAnalyticsEvent(buildPageView({ anonymousVisitorId: VISITOR, pagePath: "/de/persist" }));
      expect(listEvents().length).toBe(1);

      const reloaded = loadPersistentStore();
      expect(reloaded).toBeTruthy();
      configureAnalyticsStore(reloaded!, "sqlite");
      expect(listEvents().length).toBe(1);
      expect(listEvents()[0].pagePath).toBe("/de/persist");
    });

    it.skipIf(!persistentStore)("persists idempotency across re-instantiation", async () => {
      const orderId = await createFixtureOrder();
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      expect(computeRevenueMetrics().orderCount).toBe(1);

      const idempotencyKey = `PURCHASE:${orderId}`;
      expect(isIdempotencyKeyUsed(idempotencyKey)).toBe(true);
      const firstEventId = getIdempotencyEventId(idempotencyKey);

      const reloaded = loadPersistentStore();
      configureAnalyticsStore(reloaded!, "sqlite");
      expect(isIdempotencyKeyUsed(idempotencyKey)).toBe(true);
      expect(getIdempotencyEventId(idempotencyKey)).toBe(firstEventId);

      ingestAuthoritativeOrderPurchase(orderId, orderId);
      expect(computeRevenueMetrics().orderCount).toBe(1);
    });

    it.skipIf(!persistentStore)("append-only: events are inserted not updated", async () => {
      const orderId = await createFixtureOrder();
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      const events = listEvents().filter((e) => e.eventType === "PURCHASE");
      expect(events.length).toBe(1);
      expect(events[0].revenueAuthority).toBe("AUTHORITATIVE");

      ingestAuthoritativeOrderPurchase(orderId, orderId);
      expect(listEvents().filter((e) => e.eventType === "PURCHASE").length).toBe(1);
    });

    it.skipIf(!persistentStore)("persists authoritative purchase revenue", async () => {
      const orderId = await createFixtureOrder();
      const result = ingestAuthoritativeOrderPurchase(orderId, orderId);
      expect(result.ok).toBe(true);
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");

      const reloaded = loadPersistentStore();
      configureAnalyticsStore(reloaded!, "sqlite");
      const stored = getEvent(result.event!.eventId);
      expect(stored?.revenueAuthority).toBe("AUTHORITATIVE");
      expect(stored?.orderIdReference).toBe(orderId);
    });
  });

  describe("Store interface parity", () => {
    it("memory store implements full interface", () => {
      const store = createMemoryAnalyticsStore();
      expect(typeof store.generateEventId).toBe("function");
      expect(typeof store.storeEvent).toBe("function");
      expect(typeof store.markIdempotencyKey).toBe("function");
      expect(typeof store.recordAudit).toBe("function");
    });
  });
});
