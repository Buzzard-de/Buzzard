import type { AnalyticsEvent, AttributionModel, TrafficSourceType } from "./types";
import { listEvents } from "./registry";

export interface AttributionTouch {
  anonymousVisitorId: string;
  source: TrafficSourceType;
  timestamp: string;
  model: AttributionModel;
}

export function buildAttributionTouches(
  anonymousVisitorId: string,
  model: AttributionModel = "lastTouch"
): AttributionTouch[] {
  const events = listEvents()
    .filter((e) => e.anonymousVisitorId === anonymousVisitorId)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  if (!events.length) return [];

  const pick = model === "firstTouch" ? events[0] : events[events.length - 1];
  return [{
    anonymousVisitorId,
    source: pick.trafficSource,
    timestamp: pick.timestamp,
    model,
  }];
}

export function attributeOrderToChannel(
  orderEvent: AnalyticsEvent,
  model: AttributionModel = "sessionTouch"
): TrafficSourceType {
  const touches = buildAttributionTouches(orderEvent.anonymousVisitorId, model);
  return touches[0]?.source ?? orderEvent.trafficSource ?? "DIRECT";
}
