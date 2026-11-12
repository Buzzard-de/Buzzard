const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CUSTOMER_SUPPORT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function ticketNumber() {
  return `BZ-SUP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function localDelivery(extra = {}) {
  return {
    ok: false,
    stored: false,
    sent: false,
    delivered: false,
    delivery: "BLOCKED_EXTERNAL",
    customerNotified: false,
    orderLinked: false,
    orderCreated: false,
    paymentCaptured: false,
    couponApplied: false,
    rewardIssued: false,
    commercial: false,
    callerFlagIgnored: true,
    ...extra,
  };
}

function createTicket(userId, body = {}) {
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  if (!subject || !message) return localDelivery({ error: "UNKNOWN", code: "UNKNOWN", status: 400 });
  const number = ticketNumber();
  const info = db
    .prepare(
      `INSERT INTO tickets(ticket_number, user_id, order_number, subject, category, priority)
       VALUES(?,?,?,?,?,?)`
    )
    .run(number, userId, null, subject, body.category || "general", body.priority || "normal");
  db.prepare(
    `INSERT INTO ticket_messages(ticket_id, user_id, sender_type, message) VALUES(?,?,?,?)`
  ).run(info.lastInsertRowid, userId, "customer", message);
  return localDelivery({
    stored: true,
    id: info.lastInsertRowid,
    ticketNumber: number,
    ticketStatus: "open",
    code: "DELIVERY_BLOCKED",
    status: 200,
  });
}

function listUserTickets(userId) {
  return db.prepare("SELECT * FROM tickets WHERE user_id = ? ORDER BY id DESC").all(userId);
}

function getUserTicket(userId, ticketId) {
  const ticket = db
    .prepare("SELECT * FROM tickets WHERE id = ? AND user_id = ?")
    .get(ticketId, userId);
  if (!ticket) return null;
  const messages = db
    .prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id")
    .all(ticket.id);
  return { ticket, messages };
}

const supportMessageAttempts = new Set();

function addCustomerMessage(userId, ticketId, message) {
  const text = String(message || "").trim();
  if (!text) return localDelivery({ error: "UNKNOWN", code: "UNKNOWN", status: 400 });
  const ticket = db
    .prepare("SELECT id, status FROM tickets WHERE id = ? AND user_id = ?")
    .get(ticketId, userId);
  if (!ticket) return localDelivery({ error: "UNKNOWN", code: "UNKNOWN", status: 404 });
  const key = `${userId}:${ticket.id}:${crypto.createHash("sha256").update(text).digest("hex")}`;
  if (supportMessageAttempts.has(key)) {
    return localDelivery({ code: "DUPLICATE", duplicate: true, idempotent: true, status: 200 });
  }
  supportMessageAttempts.add(key);
  db.prepare(
    `INSERT INTO ticket_messages(ticket_id, user_id, sender_type, message) VALUES(?,?,?,?)`
  ).run(ticket.id, userId, "customer", text);
  return localDelivery({ stored: true, code: "DELIVERY_BLOCKED", duplicate: false, idempotent: true, status: 200 });
}

function listOrderTracking(orderNumber, userId) {
  const owned = userId
    ? db.prepare("SELECT id FROM orders WHERE order_number = ? AND user_id = ?").get(String(orderNumber || ""), userId)
    : null;
  if (!owned) {
    return localDelivery({ code: "ORDER_UNVERIFIED", status: 404, events: [], shipped: false, live: false });
  }
  return localDelivery({ code: "TRACKING_NOT_LIVE", status: 409, events: [], shipped: false, live: false });
}

function listTicketsAdmin() {
  return db
    .prepare(
      `SELECT * FROM tickets
       ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, id DESC`
    )
    .all();
}

function getTicketAdmin(ticketId) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
  if (!ticket) return null;
  const messages = db
    .prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id")
    .all(ticket.id);
  return { ticket, messages };
}

function replyTicketAdmin() {
  return { ok: false, error: "NOTIFICATION_NOT_PERMITTED", code: "NOTIFICATION_NOT_PERMITTED", status: 403, stored: false, sent: false, customerNotified: false, callerFlagIgnored: true };
}

function updateTicketAdmin() {
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, customerNotified: false, callerFlagIgnored: true };
}

function createTrackingEvent(body = {}) {
  if (!body.orderNumber || !body.status) {
    return { error: "orderNumber and status required", status: 400, stored: false };
  }
  return {
    ok: false,
    error: "TRACKING_NOT_LIVE",
    code: "TRACKING_NOT_LIVE",
    status: 409,
    stored: false,
    shipped: false,
    delivered: false,
    live: false,
    events: [],
  };
}

function queueChannelNotification(channel, body = {}) {
  const delivery = require("./notificationHub").deliverNotification({
    channel,
    kind: body.type || body.kind || null,
    idempotencyKey: body.idempotencyKey || null,
    mock: body.mock === true,
    demo: body.demo === true,
    test: body.test === true,
    timeout: body.timeout === true,
    networkError: body.networkError === true,
    sent: body.sent === true,
    delivered: body.delivered === true,
    acknowledged: body.acknowledged === true,
    live: body.live === true,
  });
  return {
    ok: false,
    error: delivery.code,
    code: delivery.code,
    status: 409,
    notificationStatus: delivery.status,
    sent: false,
    queued: false,
    customerNotified: false,
    providerConfigured: false,
    providerAcknowledged: false,
    live: false,
    duplicate: delivery.duplicate === true,
  };
}

function queueEmailNotification(body = {}) {
  if (!body.userId || !body.subject || !body.body) {
    return { error: "userId, subject and body required", status: 400 };
  }
  return queueChannelNotification("email", body);
}

function queueWhatsAppNotification(body = {}) {
  if (!body.userId || !body.body) {
    return { error: "userId and body required", status: 400 };
  }
  return queueChannelNotification("whatsapp", body);
}

function listSupportTemplates() {
  return db.prepare("SELECT * FROM support_templates WHERE active = 1 ORDER BY id").all();
}

function getCustomerSupportStatus() {
  return {
    version: "1.1.0",
    enabled: isEnabled(),
    totals: {
      tickets: db.prepare("SELECT COUNT(*) n FROM tickets").get().n,
      openTickets: db.prepare("SELECT COUNT(*) n FROM tickets WHERE status = 'open'").get().n,
      ticketMessages: db.prepare("SELECT COUNT(*) n FROM ticket_messages").get().n,
      trackingEvents: db.prepare("SELECT COUNT(*) n FROM tracking_events").get().n,
      supportTemplates: db.prepare("SELECT COUNT(*) n FROM support_templates WHERE active = 1").get().n,
      queuedNotifications: db
        .prepare("SELECT COUNT(*) n FROM notifications WHERE status = 'queued'")
        .get().n,
    },
  };
}

module.exports = {
  isEnabled,
  createTicket,
  listUserTickets,
  getUserTicket,
  addCustomerMessage,
  listOrderTracking,
  listTicketsAdmin,
  getTicketAdmin,
  replyTicketAdmin,
  updateTicketAdmin,
  createTrackingEvent,
  queueEmailNotification,
  queueWhatsAppNotification,
  listSupportTemplates,
  getCustomerSupportStatus,
};
