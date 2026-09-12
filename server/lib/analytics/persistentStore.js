/**
 * Analytics Foundation — persistent SQLite store adapter.
 * Append-only events; idempotency survives server restart.
 */
const { db } = require("../db");

let eventCounter = 0;

function parseJson(raw, fallback = {}) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return fallback;
  }
}

function rowToEvent(row) {
  if (!row) return undefined;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    eventId: row.event_id,
    eventType: row.event_type,
    timestamp: row.event_timestamp,
    sessionId: row.session_id,
    anonymousVisitorId: row.anonymous_visitor_id,
    market: row.market,
    country: row.country,
    language: row.language,
    currency: row.currency,
    deviceType: row.device_type,
    trafficSource: row.traffic_source,
    trafficMedium: row.traffic_medium ?? undefined,
    trafficCampaign: row.traffic_campaign ?? undefined,
    landingPage: row.landing_page ?? undefined,
    pagePath: row.page_path ?? undefined,
    productId: row.product_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    orderIdReference: row.order_id_reference ?? undefined,
    cartIdReference: row.cart_id_reference ?? undefined,
    value: row.value ?? undefined,
    quantity: row.quantity ?? undefined,
    revenueAuthority: row.revenue_authority,
    correlationId: row.correlation_id ?? undefined,
    sanitized: row.sanitized === 1,
    metadata: parseJson(row.metadata_json, {}),
  };
}

function eventToRow(event) {
  const payload = { ...event };
  delete payload.eventId;
  delete payload.eventType;
  delete payload.timestamp;
  delete payload.sessionId;
  delete payload.anonymousVisitorId;
  delete payload.market;
  delete payload.country;
  delete payload.language;
  delete payload.currency;
  delete payload.deviceType;
  delete payload.trafficSource;
  delete payload.trafficMedium;
  delete payload.trafficCampaign;
  delete payload.landingPage;
  delete payload.pagePath;
  delete payload.productId;
  delete payload.categoryId;
  delete payload.orderIdReference;
  delete payload.cartIdReference;
  delete payload.value;
  delete payload.quantity;
  delete payload.revenueAuthority;
  delete payload.correlationId;
  delete payload.sanitized;
  delete payload.metadata;

  return {
    event_id: event.eventId,
    event_type: event.eventType,
    event_timestamp: event.timestamp,
    session_id: event.sessionId,
    anonymous_visitor_id: event.anonymousVisitorId,
    market: event.market,
    country: event.country,
    language: event.language,
    currency: event.currency,
    device_type: event.deviceType,
    traffic_source: event.trafficSource,
    traffic_medium: event.trafficMedium ?? null,
    traffic_campaign: event.trafficCampaign ?? null,
    landing_page: event.landingPage ?? null,
    page_path: event.pagePath ?? null,
    product_id: event.productId ?? null,
    category_id: event.categoryId ?? null,
    order_id_reference: event.orderIdReference ?? null,
    cart_id_reference: event.cartIdReference ?? null,
    value: event.value ?? null,
    quantity: event.quantity ?? null,
    revenue_authority: event.revenueAuthority,
    correlation_id: event.correlationId ?? null,
    sanitized: event.sanitized ? 1 : 0,
    metadata_json: JSON.stringify(event.metadata ?? {}),
    payload_json: JSON.stringify(payload),
  };
}

function rowToSession(row) {
  if (!row) return undefined;
  return {
    sessionId: row.session_id,
    anonymousVisitorId: row.anonymous_visitor_id,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    endedAt: row.ended_at ?? undefined,
    landingPage: row.landing_page ?? undefined,
    exitPage: row.exit_page ?? undefined,
    pageViews: row.page_views,
    productViews: row.product_views,
    cartEvents: row.cart_events,
    checkoutStarted: row.checkout_started === 1,
    purchaseCompleted: row.purchase_completed === 1,
    trafficSource: row.traffic_source,
    market: row.market,
    language: row.language,
    deviceType: row.device_type,
  };
}

function rowToVisitor(row) {
  if (!row || row.deleted === 1) return undefined;
  return {
    anonymousVisitorId: row.anonymous_visitor_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    sessionCount: row.session_count,
    isReturning: row.is_returning === 1,
  };
}

function createPersistentAnalyticsStore() {
  const insertEventStmt = db.prepare(`
    INSERT INTO analytics_foundation_events (
      event_id, event_type, event_timestamp, session_id, anonymous_visitor_id,
      market, country, language, currency, device_type, traffic_source,
      traffic_medium, traffic_campaign, landing_page, page_path,
      product_id, category_id, order_id_reference, cart_id_reference,
      value, quantity, revenue_authority, correlation_id, sanitized,
      metadata_json, payload_json
    ) VALUES (
      @event_id, @event_type, @event_timestamp, @session_id, @anonymous_visitor_id,
      @market, @country, @language, @currency, @device_type, @traffic_source,
      @traffic_medium, @traffic_campaign, @landing_page, @page_path,
      @product_id, @category_id, @order_id_reference, @cart_id_reference,
      @value, @quantity, @revenue_authority, @correlation_id, @sanitized,
      @metadata_json, @payload_json
    )
  `);

  const upsertSessionStmt = db.prepare(`
    INSERT INTO analytics_foundation_sessions (
      session_id, anonymous_visitor_id, started_at, last_activity_at, ended_at,
      landing_page, exit_page, page_views, product_views, cart_events,
      checkout_started, purchase_completed, traffic_source, market, language, device_type
    ) VALUES (
      @session_id, @anonymous_visitor_id, @started_at, @last_activity_at, @ended_at,
      @landing_page, @exit_page, @page_views, @product_views, @cart_events,
      @checkout_started, @purchase_completed, @traffic_source, @market, @language, @device_type
    )
    ON CONFLICT(session_id) DO UPDATE SET
      anonymous_visitor_id = excluded.anonymous_visitor_id,
      last_activity_at = excluded.last_activity_at,
      ended_at = excluded.ended_at,
      landing_page = excluded.landing_page,
      exit_page = excluded.exit_page,
      page_views = excluded.page_views,
      product_views = excluded.product_views,
      cart_events = excluded.cart_events,
      checkout_started = excluded.checkout_started,
      purchase_completed = excluded.purchase_completed,
      traffic_source = excluded.traffic_source,
      market = excluded.market,
      language = excluded.language,
      device_type = excluded.device_type,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertVisitorStmt = db.prepare(`
    INSERT INTO analytics_foundation_visitors (
      anonymous_visitor_id, first_seen_at, last_seen_at, session_count, is_returning, deleted
    ) VALUES (
      @anonymous_visitor_id, @first_seen_at, @last_seen_at, @session_count, @is_returning, 0
    )
    ON CONFLICT(anonymous_visitor_id) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      session_count = excluded.session_count,
      is_returning = excluded.is_returning,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertConsentStmt = db.prepare(`
    INSERT INTO analytics_foundation_consent (anonymous_visitor_id, consent_json)
    VALUES (?, ?)
    ON CONFLICT(anonymous_visitor_id) DO UPDATE SET
      consent_json = excluded.consent_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertIdempotencyStmt = db.prepare(`
    INSERT OR IGNORE INTO analytics_foundation_idempotency (idempotency_key, event_id)
    VALUES (?, ?)
  `);

  const insertAuditStmt = db.prepare(`
    INSERT INTO analytics_foundation_audit (audit_id, audit_timestamp, action, actor_id, detail_json)
    VALUES (@audit_id, @audit_timestamp, @action, @actor_id, @detail_json)
  `);

  return {
    generateEventId() {
      eventCounter += 1;
      return `evt_${Date.now()}_${eventCounter}`;
    },

    storeEvent(event) {
      insertEventStmt.run(eventToRow(event));
    },

    listEvents() {
      const rows = db.prepare(
        "SELECT * FROM analytics_foundation_events ORDER BY event_timestamp ASC"
      ).all();
      return rows.map(rowToEvent);
    },

    getEvent(eventId) {
      const row = db.prepare(
        "SELECT * FROM analytics_foundation_events WHERE event_id = ?"
      ).get(eventId);
      return rowToEvent(row);
    },

    getSession(sessionId) {
      const row = db.prepare(
        "SELECT * FROM analytics_foundation_sessions WHERE session_id = ?"
      ).get(sessionId);
      return rowToSession(row);
    },

    upsertSession(session) {
      upsertSessionStmt.run({
        session_id: session.sessionId,
        anonymous_visitor_id: session.anonymousVisitorId,
        started_at: session.startedAt,
        last_activity_at: session.lastActivityAt,
        ended_at: session.endedAt ?? null,
        landing_page: session.landingPage ?? null,
        exit_page: session.exitPage ?? null,
        page_views: session.pageViews,
        product_views: session.productViews,
        cart_events: session.cartEvents,
        checkout_started: session.checkoutStarted ? 1 : 0,
        purchase_completed: session.purchaseCompleted ? 1 : 0,
        traffic_source: session.trafficSource,
        market: session.market,
        language: session.language,
        device_type: session.deviceType,
      });
    },

    listSessions() {
      return db.prepare("SELECT * FROM analytics_foundation_sessions").all().map(rowToSession);
    },

    getVisitor(anonymousVisitorId) {
      const row = db.prepare(
        "SELECT * FROM analytics_foundation_visitors WHERE anonymous_visitor_id = ? AND deleted = 0"
      ).get(anonymousVisitorId);
      return rowToVisitor(row);
    },

    upsertVisitor(visitor) {
      upsertVisitorStmt.run({
        anonymous_visitor_id: visitor.anonymousVisitorId,
        first_seen_at: visitor.firstSeenAt,
        last_seen_at: visitor.lastSeenAt,
        session_count: visitor.sessionCount,
        is_returning: visitor.isReturning ? 1 : 0,
      });
    },

    listVisitors() {
      return db
        .prepare("SELECT * FROM analytics_foundation_visitors WHERE deleted = 0")
        .all()
        .map(rowToVisitor)
        .filter(Boolean);
    },

    getConsent(anonymousVisitorId) {
      const row = db.prepare(
        "SELECT consent_json FROM analytics_foundation_consent WHERE anonymous_visitor_id = ?"
      ).get(anonymousVisitorId);
      return row ? parseJson(row.consent_json) : undefined;
    },

    setConsent(anonymousVisitorId, consent) {
      upsertConsentStmt.run(anonymousVisitorId, JSON.stringify(consent));
    },

    isIdempotencyKeyUsed(key) {
      return Boolean(
        db.prepare("SELECT 1 FROM analytics_foundation_idempotency WHERE idempotency_key = ?").get(key)
      );
    },

    markIdempotencyKey(key, eventId) {
      insertIdempotencyStmt.run(key, eventId);
    },

    getIdempotencyEventId(key) {
      const row = db.prepare(
        "SELECT event_id FROM analytics_foundation_idempotency WHERE idempotency_key = ?"
      ).get(key);
      return row?.event_id;
    },

    markVisitorDeleted(anonymousVisitorId) {
      db.prepare(`
        UPDATE analytics_foundation_visitors SET deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE anonymous_visitor_id = ?
      `).run(anonymousVisitorId);
      db.prepare(
        "DELETE FROM analytics_foundation_consent WHERE anonymous_visitor_id = ?"
      ).run(anonymousVisitorId);
    },

    isVisitorDeleted(anonymousVisitorId) {
      const row = db.prepare(
        "SELECT deleted FROM analytics_foundation_visitors WHERE anonymous_visitor_id = ?"
      ).get(anonymousVisitorId);
      return row?.deleted === 1;
    },

    clear() {
      db.exec(`
        DELETE FROM analytics_foundation_idempotency;
        DELETE FROM analytics_foundation_events;
        DELETE FROM analytics_foundation_sessions;
        DELETE FROM analytics_foundation_visitors;
        DELETE FROM analytics_foundation_consent;
        DELETE FROM analytics_foundation_audit;
      `);
      eventCounter = 0;
    },

    removeEventsForVisitor(anonymousVisitorId) {
      const result = db.prepare(
        "DELETE FROM analytics_foundation_events WHERE anonymous_visitor_id = ?"
      ).run(anonymousVisitorId);
      db.prepare(
        "DELETE FROM analytics_foundation_sessions WHERE anonymous_visitor_id = ?"
      ).run(anonymousVisitorId);
      return result.changes;
    },

    anonymizeEventsForVisitor(anonymousVisitorId) {
      const rows = db.prepare(
        "SELECT event_id FROM analytics_foundation_events WHERE anonymous_visitor_id = ?"
      ).all(anonymousVisitorId);
      const update = db.prepare(`
        UPDATE analytics_foundation_events SET
          anonymous_visitor_id = 'anon_deleted',
          metadata_json = '{}'
        WHERE event_id = ?
      `);
      for (const row of rows) {
        update.run(row.event_id);
      }
      return rows.length;
    },

    recordAudit(entry) {
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const auditTimestamp = new Date().toISOString();
      insertAuditStmt.run({
        audit_id: auditId,
        audit_timestamp: auditTimestamp,
        action: entry.action,
        actor_id: entry.actor ?? null,
        detail_json: JSON.stringify(entry.metadata ?? {}),
      });
      return {
        auditId,
        timestamp: auditTimestamp,
        action: entry.action,
        actor: entry.actor,
        metadata: entry.metadata,
      };
    },

    getAuditLog(filter) {
      const rows = filter?.action
        ? db.prepare(
            "SELECT * FROM analytics_foundation_audit WHERE action = ? ORDER BY audit_timestamp ASC"
          ).all(filter.action)
        : db.prepare(
            "SELECT * FROM analytics_foundation_audit ORDER BY audit_timestamp ASC"
          ).all();
      return rows.map((row) => ({
        auditId: row.audit_id,
        timestamp: row.audit_timestamp,
        action: row.action,
        actor: row.actor_id ?? "SYSTEM",
        metadata: parseJson(row.detail_json),
      }));
    },

    clearAudit() {
      db.prepare("DELETE FROM analytics_foundation_audit").run();
    },
  };
}

module.exports = { createPersistentAnalyticsStore };
