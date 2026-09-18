import { randomUUID } from "crypto";
import { mapSupplierTrackingStatus, fetchSupplierTracking } from "@/lib/supplier-engine/tracking";
import { isSandboxTrackingId } from "./config";
import { assertTrackingNetworkSafety } from "./safety";
import { saveTrackingEvent, getTrackingEventsByNumber } from "./persistence";
import type { ShipmentState, TrackingEventRecord, TrackingSource } from "./types";

export function normalizeTrackingState(raw: string): ShipmentState {
  const mapped = mapSupplierTrackingStatus(raw);
  switch (mapped) {
    case "LABEL_CREATED":
      return "LABEL_CREATED";
    case "PICKED_UP":
      return "PICKED_UP";
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "OUT_FOR_DELIVERY":
      return "OUT_FOR_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "EXCEPTION":
      return "FAILED_DELIVERY";
    default:
      return "UNKNOWN";
  }
}

export function classifyTrackingSource(trackingNumber: string, sandbox?: boolean): TrackingSource {
  if (isSandboxTrackingId(trackingNumber) || sandbox) return "SANDBOX";
  return "UNKNOWN";
}

export async function pollSupplierTracking(input: {
  supplierId: string;
  supplierOrderId: string;
  trackingNumber: string;
}): Promise<TrackingEventRecord> {
  assertTrackingNetworkSafety();
  const source = classifyTrackingSource(input.trackingNumber);
  if (source === "UNKNOWN" && !isSandboxTrackingId(input.trackingNumber)) {
    return buildBlockedEvent(input, "LIVE_TRACKING_BLOCKED");
  }
  const snapshot = await fetchSupplierTracking(input.supplierId, input.supplierOrderId);
  const state = normalizeTrackingState(snapshot.rawStatus || snapshot.status);
  return persistEvent({
    ...input,
    carrier: snapshot.carrier,
    state,
    source: snapshot.sandbox ? "SANDBOX" : source,
    rawStatus: snapshot.rawStatus || snapshot.status,
  });
}

function buildBlockedEvent(
  input: { supplierId: string; supplierOrderId: string; trackingNumber: string },
  rawStatus: string,
): TrackingEventRecord {
  return persistEvent({ ...input, state: "UNKNOWN", source: "UNKNOWN", rawStatus });
}

function persistEvent(input: {
  supplierId: string;
  supplierOrderId: string;
  trackingNumber: string;
  carrier?: string;
  state: ShipmentState;
  source: TrackingSource;
  rawStatus?: string;
}): TrackingEventRecord {
  const dedupeKey = `${input.trackingNumber}:${input.state}:${input.rawStatus || ""}`;
  const existing = getTrackingEventsByNumber(input.trackingNumber).find((e) => e.dedupeKey === dedupeKey);
  if (existing) return existing;

  const record: TrackingEventRecord = {
    eventId: randomUUID(),
    trackingNumber: input.trackingNumber,
    supplierId: input.supplierId,
    supplierOrderId: input.supplierOrderId,
    carrier: input.carrier,
    state: input.state,
    source: input.source,
    rawStatus: input.rawStatus,
    customerSafeStatus: toCustomerSafeStatus(input.state),
    dedupeKey,
    receivedAt: new Date().toISOString(),
  };
  saveTrackingEvent(record);
  return record;
}

function toCustomerSafeStatus(state: ShipmentState): string {
  if (state === "DELIVERED") return "Delivered";
  if (state === "IN_TRANSIT" || state === "OUT_FOR_DELIVERY") return "In transit";
  if (state === "FAILED_DELIVERY" || state === "LOST") return "Delivery issue";
  if (state === "UNKNOWN" || state === "STALE") return "Status pending";
  return "Processing";
}

export function verifyTrackingWebhookSignature(_payload: string, _signature: string, _secretRef: string): boolean {
  return false;
}
