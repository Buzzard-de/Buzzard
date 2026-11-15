/**
 * Transactional notice authority.
 * The commerce database is never opened. An unbound repository fails closed.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const EVENT_STATUS = Object.freeze({
  new_order: new Set(["placed", "created", "confirmed", "new"]),
  payment_confirmed: new Set(["paid", "payment_confirmed"]),
  order_cancelled: new Set(["cancelled", "canceled"]),
  order_shipped: new Set(["shipped"]),
  order_delivered: new Set(["delivered"]),
  return_request: new Set(["return_requested", "return"]),
  refund: new Set(["refunded"]),
});

const ORDER_SCHEMA = `
CREATE TABLE IF NOT EXISTS transactional_orders (
  order_number TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  purpose TEXT
);
`;

let repository = null;

function refusal(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isProtectedOrderPath(candidate) {
  const resolved = path.resolve(candidate);
  const base = path.basename(resolved).toLowerCase();
  if (!base || base === "buzzard.db" || base.startsWith("buzzard_guardian") || base.includes("pusat")) return true;
  const marker = `${path.sep}server${path.sep}data`;
  return resolved.endsWith(marker) || resolved.includes(`${marker}${path.sep}`);
}

function isEphemeralPath(candidate) {
  const resolved = path.resolve(candidate);
  const roots = [path.resolve("/tmp"), path.resolve("/var/tmp"), path.resolve("/private/tmp"), path.resolve(os.tmpdir())];
  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function assertFixturePath(candidate) {
  if (process.env.VITEST !== "true") throw refusal("DATA_PATH_REFUSED");
  if (typeof candidate !== "string" || !candidate.trim() || candidate.includes("\0")) throw refusal("DATA_PATH_REFUSED");
  const resolved = path.resolve(candidate.trim());
  if (isProtectedOrderPath(resolved) || !isEphemeralPath(resolved)) throw refusal("DATA_PATH_REFUSED");
  if (fs.existsSync(resolved)) {
    const listed = fs.lstatSync(resolved);
    if (listed.isSymbolicLink() || !listed.isFile()) throw refusal("DATA_PATH_REFUSED");
  }
  return resolved;
}

function rowFromRecord(row) {
  if (!row) return null;
  return {
    orderNumber: String(row.order_number || row.orderNumber || ""),
    customerId: String(row.customer_id || row.customerId || ""),
    status: String(row.status || "").toLowerCase(),
    purpose: row.purpose == null || row.purpose === "" ? "" : String(row.purpose),
  };
}

function bindOrderRepository(next) {
  if (!next || typeof next.readOrder !== "function") {
    repository = {
      readOrder() {
        throw refusal("repository_unavailable");
      },
    };
    return repository;
  }
  repository = next;
  return repository;
}

function unbindOrderRepository() {
  repository = null;
}

function openIsolatedOrderFixture(dbPath) {
  const resolved = assertFixturePath(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
  const Database = require("better-sqlite3");
  const connection = new Database(resolved);
  connection.pragma("busy_timeout = 2000");
  connection.exec(ORDER_SCHEMA);
  const read = connection.prepare(
    "SELECT order_number, customer_id, status, purpose FROM transactional_orders WHERE order_number = ?"
  );
  const insert = connection.prepare(
    "INSERT INTO transactional_orders(order_number, customer_id, status, purpose) VALUES (?, ?, ?, ?)"
  );
  const fixture = {
    path: resolved,
    readOrder(orderNumber) {
      return rowFromRecord(read.get(String(orderNumber || "")));
    },
    insertOrder(order = {}) {
      insert.run(
        String(order.orderNumber || ""),
        String(order.customerId || ""),
        String(order.status || "").toLowerCase(),
        order.purpose == null ? null : String(order.purpose)
      );
      return fixture.readOrder(order.orderNumber);
    },
    close() {
      if (repository === fixture) repository = null;
      connection.close();
    },
  };
  repository = fixture;
  return fixture;
}

function verifyTransactionalOrder(request, policy, eventType) {
  const payload = request && typeof request === "object" ? request : {};
  if (!repository || typeof repository.readOrder !== "function") {
    return { ok: false, reason: "repository_unavailable" };
  }
  let row;
  try {
    row = repository.readOrder(payload.orderNumber == null ? "" : String(payload.orderNumber));
  } catch {
    return { ok: false, reason: "repository_unavailable" };
  }
  const record = rowFromRecord(row);
  if (!record || !record.orderNumber) return { ok: false, reason: "order_not_found" };
  const customerId = payload.customerId == null ? "" : String(payload.customerId);
  if (!customerId || customerId !== record.customerId) return { ok: false, reason: "customer_order_mismatch" };
  const allowed = EVENT_STATUS[eventType];
  if (!allowed || !allowed.has(record.status)) return { ok: false, reason: "order_status_mismatch" };
  if (payload.purpose && payload.purpose !== policy.purpose) return { ok: false, reason: "purpose_mismatch" };
  if (record.purpose && record.purpose !== policy.purpose) return { ok: false, reason: "purpose_mismatch" };
  return {
    ok: true,
    reason: "transactional_authorized",
    orderNumber: record.orderNumber,
    customerId: record.customerId,
    status: record.status,
  };
}

module.exports = {
  EVENT_STATUS,
  bindOrderRepository,
  unbindOrderRepository,
  openIsolatedOrderFixture,
  verifyTransactionalOrder,
};
