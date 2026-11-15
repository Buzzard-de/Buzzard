const store = new Map();

function withIdempotency(key, payloadHash, produce) {
  if (!key) return { ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" };
  const prev = store.get(key);
  if (prev) {
    if (prev.payloadHash !== payloadHash) {
      return { ok: false, error: "IDEMPOTENCY_PAYLOAD_CONFLICT", idempotencyReplay: false };
    }
    return { ...prev.result, idempotencyReplay: true };
  }
  const result = produce();
  store.set(key, { payloadHash, result });
  return { ...result, idempotencyReplay: false };
}

function resetIdempotency() {
  store.clear();
}

module.exports = { withIdempotency, resetIdempotency };
