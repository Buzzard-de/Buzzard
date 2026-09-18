const processedKeys = new Set<string>();
const captureKeys = new Set<string>();
const webhookEvents = new Set<string>();

export function checkIdempotencyKey(key: string): boolean {
  if (processedKeys.has(key)) return false;
  processedKeys.add(key);
  return true;
}

export function checkCaptureIdempotency(key: string): boolean {
  if (captureKeys.has(key)) return false;
  captureKeys.add(key);
  return true;
}

export function isWebhookEventProcessed(eventId: string): boolean {
  return webhookEvents.has(eventId);
}

export function markWebhookEventProcessed(eventId: string): void {
  webhookEvents.add(eventId);
}

export function resetIdempotencyForTests(): void {
  processedKeys.clear();
  captureKeys.clear();
  webhookEvents.clear();
}
