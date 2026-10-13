/**
 * Controlled circuit breaker for Pusat-adjacent work.
 * Open circuits fail closed. Financial actions stay blocked.
 */

const crypto = require("crypto");

const STATE = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

const circuits = new Map();

function nowMs() {
  return Date.now();
}

function getCircuit(name) {
  if (!circuits.has(name)) {
    circuits.set(name, {
      name,
      state: STATE.CLOSED,
      failures: 0,
      openedAt: 0,
      successInHalfOpen: 0,
      threshold: 3,
      cooldownMs: 30_000,
    });
  }
  return circuits.get(name);
}

function persist(db, circuit) {
  if (!db) return;
  try {
    db.prepare(
      `INSERT INTO software_circuit_events(id, name, state, details_json) VALUES(?,?,?,?)`
    ).run(
      `cbe_${crypto.randomBytes(6).toString("hex")}`,
      circuit.name,
      circuit.state,
      JSON.stringify({ failures: circuit.failures })
    );
  } catch {
    /* schema may not be migrated yet */
  }
}

function allow(name, { financial = false } = {}) {
  const circuit = getCircuit(name);
  if (financial) {
    return { allowed: false, state: circuit.state, reason: "FINANCIAL_BLOCKED" };
  }
  if (circuit.state === STATE.OPEN) {
    if (nowMs() - circuit.openedAt >= circuit.cooldownMs) {
      circuit.state = STATE.HALF_OPEN;
      return { allowed: true, state: circuit.state, probe: true };
    }
    return { allowed: false, state: circuit.state, reason: "CIRCUIT_OPEN" };
  }
  return { allowed: true, state: circuit.state };
}

function recordSuccess(name, db = null) {
  const circuit = getCircuit(name);
  if (circuit.state === STATE.HALF_OPEN) {
    circuit.state = STATE.CLOSED;
    circuit.failures = 0;
    circuit.successInHalfOpen = 0;
  } else {
    circuit.failures = 0;
  }
  persist(db, circuit);
  return { ...circuit };
}

function recordFailure(name, db = null) {
  const circuit = getCircuit(name);
  circuit.failures += 1;
  if (circuit.state === STATE.HALF_OPEN || circuit.failures >= circuit.threshold) {
    circuit.state = STATE.OPEN;
    circuit.openedAt = nowMs();
  }
  persist(db, circuit);
  return { ...circuit };
}

function reset(name) {
  circuits.delete(name);
}

function snapshot(name) {
  const circuit = getCircuit(name);
  return { name: circuit.name, state: circuit.state, failures: circuit.failures };
}

module.exports = {
  STATE,
  allow,
  recordSuccess,
  recordFailure,
  reset,
  snapshot,
};
