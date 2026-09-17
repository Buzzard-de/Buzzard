import type { TrackingEventRecord } from "./types";

const events = new Map<string, TrackingEventRecord>();

export function saveTrackingEvent(record: TrackingEventRecord): void {
  events.set(record.eventId, { ...record });
}

export function getTrackingEventsByNumber(trackingNumber: string): TrackingEventRecord[] {
  return [...events.values()].filter((e) => e.trackingNumber === trackingNumber);
}

export function resetTrackingForTests(): void {
  events.clear();
}
