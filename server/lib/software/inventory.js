/**
 * Inventory reliability + reservation.
 * Estimated/stale/unknown stock cannot reserve. Buzzard never buys stock for itself.
 */

const crypto = require("crypto");
const stockEngine = require("../operations/stockEngine");
const {
  STOCK_SOURCE,
  RESERVATION_STATUS,
  DEFAULT_STALE_STOCK_MS,
} = require("./constants");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function evaluateReliability(input = {}) {
  const evaluated = stockEngine.evaluateStockRecord(
    {
      stock: input.quantity ?? input.stock,
      lastSupplierUpdate: input.lastSupplierUpdate,
      stockUpdatedAt: input.stockUpdatedAt,
      source: input.source || STOCK_SOURCE.UNVERIFIED,
    },
    { lowThreshold: input.lowThreshold, safetyStock: input.safetyStock }
  );

  const last = evaluated.lastSupplierUpdate || evaluated.stockUpdatedAt;
  const staleAfterMs = input.staleAfterMs ?? DEFAULT_STALE_STOCK_MS;
  const requireTimestamp = input.requireTimestamp !== false;
  let stale = false;
  if (!last) {
    stale = requireTimestamp;
  } else {
    const parsed = Date.parse(last);
    stale = Number.isNaN(parsed) || Date.now() - parsed > staleAfterMs;
  }

  const estimated = [STOCK_SOURCE.ESTIMATE, STOCK_SOURCE.FORECAST].includes(evaluated.source);
  const unreliable =
    Boolean(evaluated.blocked) ||
    evaluated.status === stockEngine.STOCK_STATUS.UNKNOWN ||
    evaluated.status === stockEngine.STOCK_STATUS.BLOCKED ||
    stale ||
    estimated;

  let reason = evaluated.reason || null;
  if (!reason && evaluated.status === stockEngine.STOCK_STATUS.UNKNOWN) reason = "UNKNOWN_STOCK";
  if (!reason && stale && !last) reason = "MISSING_STOCK_TIMESTAMP";
  if (!reason && stale) reason = "STALE_STOCK";
  if (!reason && estimated) reason = "ESTIMATED_STOCK";

  return {
    ...evaluated,
    stale,
    estimated,
    unreliable,
    failClosed: unreliable,
    purchaseOwnStock: false,
    reason,
  };
}

function resolveSupplierConflict(offers = []) {
  const rows = Array.isArray(offers) ? offers : [];
  if (rows.length <= 1) {
    return {
      conflict: false,
      failClosed: false,
      selected: rows[0] || null,
      purchaseOwnStock: false,
    };
  }
  const quantities = new Set(rows.map((row) => Number(row.quantity)));
  const sources = new Set(rows.map((row) => String(row.source || "")));
  if (quantities.size > 1 || sources.size > 1) {
    return {
      conflict: true,
      failClosed: true,
      selected: null,
      purchaseOwnStock: false,
      reason: "CONFLICTING_SUPPLIER_OFFERS",
      note: "Conflicting supplier stock is not auto-resolved. Do not buy stock speculatively.",
    };
  }
  return {
    conflict: false,
    failClosed: false,
    selected: rows[0],
    purchaseOwnStock: false,
  };
}

function parseStamp(value) {
  if (value == null || value === "") return NaN;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  const normalized = String(value).trim().replace(" ", "T");
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  return Date.parse(withZone);
}

function writeEvent(db, reservationId, eventType, details) {
  db.prepare(
    `INSERT INTO software_reservation_events(id, reservation_id, event_type, details_json)
     VALUES(?,?,?,?)`
  ).run(newId("srev"), reservationId, eventType, JSON.stringify(details || {}));
}

function reserve(db, input = {}) {
  if (Array.isArray(input.offers) && input.offers.length) {
    const conflict = resolveSupplierConflict(input.offers);
    if (conflict.failClosed) {
      return {
        ok: false,
        reserved: false,
        failClosed: true,
        reason: conflict.reason,
        purchaseOwnStock: false,
        conflict,
      };
    }
  }
  const reliability = evaluateReliability(input);
  const quantity = Number(input.requestQuantity ?? input.reserveQuantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, reserved: false, failClosed: true, reason: "INVALID_RESERVE_QUANTITY", reliability };
  }
  if (reliability.unreliable) {
    return {
      ok: false,
      reserved: false,
      failClosed: true,
      reason: reliability.reason || "UNRELIABLE_STOCK",
      reliability,
      purchaseOwnStock: false,
    };
  }
  if (reliability.quantity == null || reliability.quantity < quantity) {
    return {
      ok: false,
      reserved: false,
      failClosed: true,
      reason: "INSUFFICIENT_STOCK",
      reliability,
    };
  }

  const sku = String(input.sku || "").trim();
  if (!sku) {
    return { ok: false, reserved: false, failClosed: true, reason: "SKU_REQUIRED", reliability };
  }

  const id = newId("sres");
  const key = input.idempotencyKey || null;

  try {
    const run = db.transaction(() => {
      if (key) {
        const existing = db.prepare("SELECT * FROM software_reservations WHERE idempotency_key = ?").get(key);
        if (existing) {
          return { duplicate: true, reservation: existing };
        }
      }
      const activeReserved = reservedQuantity(db, sku);
      const available = Number(reliability.quantity) - activeReserved;
      if (available < quantity) {
        return {
          insufficient: true,
          available,
          activeReserved,
        };
      }
      db.prepare(
        `INSERT INTO software_reservations(id, sku, quantity, order_id, customer_id, status, source, idempotency_key)
         VALUES(?,?,?,?,?,?,?,?)`
      ).run(
        id,
        sku,
        quantity,
        input.orderId || null,
        input.customerId || null,
        RESERVATION_STATUS.ACTIVE,
        reliability.source,
        key
      );
      writeEvent(db, id, "reserved", { sku, quantity, source: reliability.source, availableAfter: available - quantity });
      return { duplicate: false, reservation: db.prepare("SELECT * FROM software_reservations WHERE id = ?").get(id) };
    });
    const result = run();
    if (result.insufficient) {
      return {
        ok: false,
        reserved: false,
        failClosed: true,
        reason: "INSUFFICIENT_STOCK",
        available: result.available,
        activeReserved: result.activeReserved,
        reliability,
        purchaseOwnStock: false,
      };
    }
    return {
      ok: true,
      reserved: !result.duplicate || result.reservation.status === RESERVATION_STATUS.ACTIVE,
      duplicate: Boolean(result.duplicate),
      failClosed: false,
      purchaseOwnStock: false,
      authority: "commerce_software",
      wmsReservationId: null,
      reservation: result.reservation,
      reliability,
    };
  } catch {
    return { ok: false, reserved: false, failClosed: true, reason: "RESERVE_FAILED" };
  }
}

function reservedQuantity(db, sku) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS n
       FROM software_reservations
       WHERE sku = ? AND status = ?`
    )
    .get(sku, RESERVATION_STATUS.ACTIVE);
  return Number(row?.n || 0);
}

function consume(db, reservationId, input = {}) {
  if (!reservationId) return { ok: false, consumed: false, reason: "RESERVATION_REQUIRED" };
  try {
    const run = db.transaction(() => {
      const row = db.prepare("SELECT * FROM software_reservations WHERE id = ?").get(reservationId);
      if (!row) return { missing: true };
      if (row.status === RESERVATION_STATUS.CONSUMED) {
        return { duplicate: true, reservation: row };
      }
      if (row.status !== RESERVATION_STATUS.ACTIVE) {
        return { invalid: true, reservation: row };
      }
      if (input.orderId && row.order_id && String(row.order_id) !== String(input.orderId)) {
        return { mismatch: true, reservation: row };
      }
      db.prepare(
        "UPDATE software_reservations SET status = ?, consumed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(RESERVATION_STATUS.CONSUMED, reservationId);
      writeEvent(db, reservationId, "consumed", {
        sku: row.sku,
        quantity: row.quantity,
        orderId: row.order_id,
        retry: Boolean(input.retry),
      });
      return { reservation: db.prepare("SELECT * FROM software_reservations WHERE id = ?").get(reservationId) };
    });
    const result = run();
    if (result.missing) return { ok: false, consumed: false, reason: "NOT_FOUND" };
    if (result.duplicate) {
      return { ok: true, consumed: true, duplicate: true, reservation: result.reservation };
    }
    if (result.mismatch) {
      return { ok: false, consumed: false, failClosed: true, reason: "ORDER_MISMATCH", reservation: result.reservation };
    }
    if (result.invalid) {
      return {
        ok: false,
        consumed: false,
        failClosed: true,
        reason: result.reservation.status === RESERVATION_STATUS.RELEASED ? "ALREADY_RELEASED" : "INVALID_STATUS",
        reservation: result.reservation,
      };
    }
    return { ok: true, consumed: true, duplicate: false, reservation: result.reservation };
  } catch {
    return { ok: false, consumed: false, failClosed: true, reason: "CONSUME_FAILED" };
  }
}

function commit(db, reservationId, input = {}) {
  return consume(db, reservationId, input);
}

function release(db, reservationId) {
  const row = db.prepare("SELECT * FROM software_reservations WHERE id = ?").get(reservationId);
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.status === RESERVATION_STATUS.CONSUMED) {
    return { ok: false, reason: "ALREADY_CONSUMED", reservation: row };
  }
  if (row.status === RESERVATION_STATUS.RELEASED) {
    return { ok: true, alreadyReleased: true, reservation: row };
  }
  db.prepare(
    "UPDATE software_reservations SET status = ?, released_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(RESERVATION_STATUS.RELEASED, reservationId);
  writeEvent(db, reservationId, "released", {});
  return { ok: true, reservation: db.prepare("SELECT * FROM software_reservations WHERE id = ?").get(reservationId) };
}

function expireDue(db, { olderThanMs = 30 * 60 * 1000, sku = null, orderId = null } = {}) {
  if (!sku && !orderId) {
    return { ok: false, reason: "SKU_OR_ORDER_REQUIRED", expired: 0 };
  }
  const cutoffMs = Date.now() - olderThanMs;
  const candidates = sku
    ? db
        .prepare(`SELECT * FROM software_reservations WHERE status = ? AND sku = ?`)
        .all(RESERVATION_STATUS.ACTIVE, sku)
    : db
        .prepare(`SELECT * FROM software_reservations WHERE status = ? AND order_id = ?`)
        .all(RESERVATION_STATUS.ACTIVE, orderId);
  const due = candidates.filter((row) => {
    const created = parseStamp(row.created_at);
    return !Number.isNaN(created) && created <= cutoffMs;
  });
  const expired = [];
  for (const row of due) {
    db.prepare(
      "UPDATE software_reservations SET status = ?, released_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(RESERVATION_STATUS.EXPIRED, row.id);
    writeEvent(db, row.id, "expired", { cutoffMs });
    expired.push(row.id);
  }
  return { ok: true, scanned: candidates.length, expired: expired.length, ids: expired };
}

function recoverOrphanReservations(db, { olderThanMs = 30 * 60 * 1000, sku = null, orderId = null } = {}) {
  if (!sku && !orderId) {
    return { ok: false, reason: "SKU_OR_ORDER_REQUIRED", released: 0 };
  }
  const cutoffMs = Date.now() - olderThanMs;
  const orphans = (sku
    ? db
        .prepare(`SELECT * FROM software_reservations WHERE status = ? AND sku = ?`)
        .all(RESERVATION_STATUS.ACTIVE, sku)
    : db
        .prepare(`SELECT * FROM software_reservations WHERE status = ? AND order_id = ?`)
        .all(RESERVATION_STATUS.ACTIVE, orderId)
  ).filter((row) => {
    const created = parseStamp(row.created_at);
    return !Number.isNaN(created) && created <= cutoffMs;
  });
  const released = [];
  for (const row of orphans) {
    const result = release(db, row.id);
    if (result.ok) released.push(row.id);
  }
  return { ok: true, scanned: orphans.length, released: released.length, ids: released };
}

function history(db, sku) {
  return db
    .prepare(
      `SELECT e.*, r.sku, r.order_id
       FROM software_reservation_events e
       JOIN software_reservations r ON r.id = e.reservation_id
       WHERE r.sku = ?
       ORDER BY e.created_at DESC
       LIMIT 100`
    )
    .all(sku);
}

function withTransaction(db, fn) {
  return db.transaction(fn)();
}

function tableExists(db, name) {
  try {
    return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name));
  } catch {
    return false;
  }
}

function recordWmsReservationAudit(db, wmsReservation = {}) {
  const sku = String(wmsReservation.product_sku || wmsReservation.productSku || wmsReservation.sku || "").trim();
  db.prepare(`INSERT INTO software_audit(id, kind, subject, details_json) VALUES(?,?,?,?)`).run(
    newId("saud"),
    "wms_reservation",
    sku || "unknown",
    JSON.stringify({
      wmsReservationId: wmsReservation.id || null,
      quantity: wmsReservation.quantity || null,
      orderNumber: wmsReservation.order_number || wmsReservation.orderNumber || null,
      commercialPath: "software.inventory",
      secondReservationCreated: false,
    })
  );
  return { ok: true, recorded: true, secondReservationCreated: false };
}

function inspectReservationTables(db, sku) {
  const softwareRows = sku
    ? db.prepare("SELECT * FROM software_reservations WHERE sku = ?").all(sku)
    : [];
  let wmsRows = [];
  if (tableExists(db, "wms_reservations") && sku) {
    wmsRows = db.prepare("SELECT * FROM wms_reservations WHERE product_sku = ?").all(sku);
  }
  return {
    sku,
    softwareReservations: softwareRows,
    wmsReservations: wmsRows,
    sharedAuthority: false,
    commercialPath: "software.inventory",
    purchaseOwnStock: false,
    note: "WMS warehouse reservations stay separate. Commercial fail-closed uses software.inventory.",
  };
}

module.exports = {
  evaluateReliability,
  resolveSupplierConflict,
  reserve,
  consume,
  commit,
  release,
  reservedQuantity,
  recoverOrphanReservations,
  expireDue,
  history,
  withTransaction,
  recordWmsReservationAudit,
  inspectReservationTables,
};
