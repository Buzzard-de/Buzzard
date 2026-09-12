import { createOrder } from "@/lib/order-engine";
import { buildSingleItemOrderInput, seedOrderEngineFixtures } from "@/lib/order-engine/test-fixtures";
import {
  seedReturnsEngineFixtures,
  createDeliveredOrder,
  buildReturnInput,
  createReturnRequest,
  requestCustomerRefund,
  processCustomerRefund,
} from "@/lib/returns-engine";
import { clearAnalyticsRegistry } from "./registry";
import { clearAnalyticsAuditLog } from "./audit";
import { clearMockProviderEvents } from "./provider";
import { updateConsent } from "./consent";
import { collectAnalyticsEvent, ingestAuthoritativeOrderPurchase } from "./eventCollector";
import type { AnalyticsEventInput, ConsentState } from "./types";

export const FIXTURE_VISITOR_A = "bv_fixture_visitor_a";
export const FIXTURE_VISITOR_B = "bv_fixture_visitor_b";
export const FIXTURE_SESSION_A = "ses_fixture_a";

export function seedAnalyticsFixtures(): void {
  clearAnalyticsRegistry();
  clearAnalyticsAuditLog();
  clearMockProviderEvents();
  seedOrderEngineFixtures();
}

export function seedAnalyticsWithConsent(visitorId: string, market = "DE"): ConsentState {
  return updateConsent(visitorId, market, { ANALYTICS: "GRANTED" });
}

export function grantBulkAnalyticsConsent(prefix: string, count: number, market = "DE"): void {
  for (let i = 0; i < count; i++) {
    seedAnalyticsWithConsent(`${prefix}${i}`, market);
  }
}

export function buildPageView(overrides: Partial<AnalyticsEventInput> = {}): AnalyticsEventInput {
  return {
    eventType: "PAGE_VIEW",
    anonymousVisitorId: FIXTURE_VISITOR_A,
    sessionId: FIXTURE_SESSION_A,
    market: "DE",
    language: "de",
    pagePath: "/",
    ...overrides,
  };
}

export async function createFixtureOrder(productId = "reifen-pilot-sport"): Promise<string> {
  const result = await createOrder(buildSingleItemOrderInput(productId));
  if (!result.ok || !result.order) throw new Error("ORDER_CREATE_FAILED");
  return result.order.orderId;
}

export async function seedFixtureTrafficAndFunnel(): Promise<void> {
  seedAnalyticsWithConsent(FIXTURE_VISITOR_A, "DE");
  grantBulkAnalyticsConsent("bv_fixture_", 100, "DE");

  for (let i = 0; i < 100; i++) {
    collectAnalyticsEvent(buildPageView({
      anonymousVisitorId: `bv_fixture_${i}`,
      sessionId: `ses_fixture_${i}`,
      pagePath: `/page-${i % 10}`,
    }));
  }

  for (let i = 0; i < 120; i++) {
    collectAnalyticsEvent({
      eventType: "SESSION_START",
      anonymousVisitorId: `bv_fixture_${i % 100}`,
      sessionId: `ses_fixture_${i}`,
      market: "DE",
      language: "de",
    });
  }

  for (let i = 0; i < 100; i++) {
    collectAnalyticsEvent({
      eventType: "PRODUCT_VIEW",
      anonymousVisitorId: `bv_fixture_${i % 100}`,
      sessionId: `ses_fixture_${i % 120}`,
      productId: "reifen-pilot-sport",
      market: "DE",
      language: "de",
    });
  }

  for (let i = 0; i < 20; i++) {
    collectAnalyticsEvent({
      eventType: "ADD_TO_CART",
      anonymousVisitorId: `bv_fixture_${i}`,
      sessionId: `ses_fixture_${i}`,
      productId: "reifen-pilot-sport",
      market: "DE",
      language: "de",
    });
  }

  for (let i = 0; i < 10; i++) {
    collectAnalyticsEvent({
      eventType: "CHECKOUT_START",
      anonymousVisitorId: `bv_fixture_${i}`,
      sessionId: `ses_fixture_${i}`,
      market: "DE",
      language: "de",
    });
  }

  for (let i = 0; i < 4; i++) {
    const orderId = await createFixtureOrder();
    ingestAuthoritativeOrderPurchase(orderId, `purchase_${orderId}`);
  }
}

export async function seedFixtureRefund(): Promise<{ returnId: string; orderId: string }> {
  seedReturnsEngineFixtures();
  const orderId = await createDeliveredOrder();
  const created = createReturnRequest(buildReturnInput(orderId));
  if (!created.ok || !created.returnRequest) throw new Error("RETURN_CREATE_FAILED");
  requestCustomerRefund(created.returnRequest.returnId);
  processCustomerRefund({ returnId: created.returnRequest.returnId, approvedAmount: 25 });
  return { returnId: created.returnRequest.returnId, orderId };
}
