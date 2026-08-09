const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CUSTOMER_SUPPORT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function ticketNumber() {
  return `BZ-SUP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function notify(userId, channel, type, subject, body) {
  const status = channel === "in_app" ? "unread" : "queued";
  db.prepare(
    `INSERT INTO notifications(user_id, type, title, message, channel, status, subject, body)
     VALUES(?,?,?,?,?,?,?,?)`
  ).run(userId, type, subject, body, channel, status, subject, body);
}

function createTicket(userId, body = {}) {
  if (!body.subject || !body.message) {
    return { error: "Subject and message required", status: 400 };
  }
  const number = ticketNumber();
  const info = db
    .prepare(
      `INSERT INTO tickets(ticket_number, user_id, order_number, subject, category, priority)
       VALUES(?,?,?,?,?,?)`
    )
    .run(
      number,
      userId,
      body.orderNumber || null,
      body.subject,
      body.category || "general",
      body.priority || "normal"
    );
  db.prepare(
    `INSERT INTO ticket_messages(ticket_id, user_id, sender_type, message) VALUES(?,?,?,?)`
  ).run(info.lastInsertRowid, userId, "customer", body.message);
  notify(userId, "in_app", "ticket_created", "Support request received", `Ticket ${number} was created.`);
  return { id: info.lastInsertRowid, ticketNumber: number, status: "open" };
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

function addCustomerMessage(userId, ticketId, message) {
  if (!message) return { error: "Message required", status: 400 };
  const ticket = db
    .prepare("SELECT * FROM tickets WHERE id = ? AND user_id = ?")
    .get(ticketId, userId);
  if (!ticket) return { error: "Ticket not found", status: 404 };
  db.prepare(
    `INSERT INTO ticket_messages(ticket_id, user_id, sender_type, message) VALUES(?,?,?,?)`
  ).run(ticket.id, userId, "customer", message);
  db.prepare("UPDATE tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    ticket.id
  );
  return { ok: true };
}

function listOrderTracking(orderNumber) {
  const events = db
    .prepare(
      "SELECT * FROM tracking_events WHERE order_number = ? ORDER BY event_time DESC, id DESC"
    )
    .all(orderNumber);
  return { orderNumber, events };
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

function replyTicketAdmin(adminUserId, ticketId, message) {
  if (!message) return { error: "Message required", status: 400 };
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
  if (!ticket) return { error: "Ticket not found", status: 404 };
  db.prepare(
    `INSERT INTO ticket_messages(ticket_id, user_id, sender_type, message) VALUES(?,?,?,?)`
  ).run(ticket.id, adminUserId, "admin", message);
  db.prepare(
    "UPDATE tickets SET status = 'waiting_customer', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(ticket.id);
  if (ticket.user_id) {
    notify(
      ticket.user_id,
      "in_app",
      "ticket_reply",
      "Buzzard Support",
      `A new reply was added to ticket ${ticket.ticket_number}.`
    );
  }
  return { ok: true };
}

function updateTicketAdmin(ticketId, body = {}) {
  db.prepare(
    `UPDATE tickets
     SET status = COALESCE(?, status),
         priority = COALESCE(?, priority),
         category = COALESCE(?, category),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(body.status || null, body.priority || null, body.category || null, ticketId);
  return { ok: true };
}

function createTrackingEvent(body = {}) {
  if (!body.orderNumber || !body.status) {
    return { error: "orderNumber and status required", status: 400 };
  }
  db.prepare(
    `INSERT INTO tracking_events(order_number, carrier, tracking_number, status, location, event_time)
     VALUES(?,?,?,?,?,?)`
  ).run(
    body.orderNumber,
    body.carrier || "",
    body.trackingNumber || "",
    body.status,
    body.location || "",
    body.eventTime || new Date().toISOString()
  );
  return { ok: true };
}

function queueEmailNotification(body = {}) {
  if (!body.userId || !body.subject || !body.body) {
    return { error: "userId, subject and body required", status: 400 };
  }
  notify(body.userId, "email", body.type || "general", body.subject, body.body);
  return { queued: true, providerConfigured: Boolean(process.env.EMAIL_PROVIDER_URL) };
}

function queueWhatsAppNotification(body = {}) {
  if (!body.userId || !body.body) {
    return { error: "userId and body required", status: 400 };
  }
  notify(body.userId, "whatsapp", body.type || "general", "Buzzard WhatsApp", body.body);
  return { queued: true, providerConfigured: Boolean(process.env.WHATSAPP_API_URL) };
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
