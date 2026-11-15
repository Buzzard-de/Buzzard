const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_CRM_CUSTOMER_SERVICE !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function ticketNumber() {
  return `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;
}

function recordEvent(customerId, eventType, reference, message, meta = {}) {
  db.prepare(`
    INSERT INTO crmcs_customer_events(customer_id, event_type, reference, message, metadata_json)
    VALUES(?,?,?,?,?)
  `).run(customerId, eventType, reference, message, JSON.stringify(meta || {}));
}

function createCustomer(body = {}) {
  if (!body.email) return { error: "Email required", status: 400 };

  try {
    const result = db
      .prepare(`
        INSERT INTO crmcs_customers(
          external_user_id, email, first_name, last_name, phone, country_code,
          language, segment, marketing_email, marketing_sms
        )
        VALUES(?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        body.externalUserId || body.external_user_id || null,
        String(body.email).toLowerCase().trim(),
        body.firstName || body.first_name || "",
        body.lastName || body.last_name || "",
        body.phone || "",
        body.countryCode || body.country_code || "DE",
        body.language || "de-DE",
        body.segment || "standard",
        0,
        0
      );

    recordEvent(result.lastInsertRowid, "customer_created", "", "local");
    const customer = db.prepare("SELECT id, marketing_email, marketing_sms FROM crmcs_customers WHERE id = ?").get(result.lastInsertRowid);
    return { customer, created: true, marketingPermission: "BLOCKED", email: null };
  } catch {
    return { error: "Customer already exists", status: 409 };
  }
}

function getCustomer(id) {
  const customer = db.prepare("SELECT * FROM crmcs_customers WHERE id = ?").get(id);
  if (!customer) return { error: "Customer not found", status: 404 };

  return {
    customer: { id: customer.id, status: customer.status, segment: customer.segment, email: null, phone: null, marketing_email: 0, marketing_sms: 0 },
    tags: db.prepare("SELECT tag FROM crmcs_customer_tags WHERE customer_id = ?").all(customer.id),
    events: db
      .prepare("SELECT id, event_type FROM crmcs_customer_events WHERE customer_id = ? ORDER BY id DESC")
      .all(customer.id),
    tickets: db
      .prepare("SELECT id, status, ticket_number FROM crmcs_tickets WHERE customer_id = ? ORDER BY id DESC")
      .all(customer.id),
  };
}

function updateCustomer(id, body = {}) {
  const customer = db.prepare("SELECT * FROM crmcs_customers WHERE id = ?").get(id);
  if (!customer) return { error: "Customer not found", status: 404 };

  db.prepare(`
    UPDATE crmcs_customers SET
      first_name = ?, last_name = ?, phone = ?, country_code = ?, language = ?,
      segment = ?, status = ?, marketing_email = ?, marketing_sms = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.firstName ?? body.first_name ?? customer.first_name,
    body.lastName ?? body.last_name ?? customer.last_name,
    customer.phone,
    body.countryCode ?? body.country_code ?? customer.country_code,
    body.language ?? customer.language,
    body.segment ?? customer.segment,
    body.status ?? customer.status,
    0,
    0,
    customer.id
  );

  return { customer: { id: customer.id, email: null, phone: null, marketing_email: 0, marketing_sms: 0 } };
}

const customerTagAttempts = new Set();

function addCustomerTag(id, body = {}) {
  const customer = db.prepare("SELECT id FROM crmcs_customers WHERE id = ?").get(id);
  if (!customer) {
    return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 404, stored: false, commercial: false, consentVerified: false, customerNotified: false, externalWrite: false, callerFlagIgnored: true };
  }
  const tag = String(body.tag || "").trim().slice(0, 64);
  if (!tag) {
    return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 400, stored: false, commercial: false, consentVerified: false, customerNotified: false, externalWrite: false };
  }
  const key = `${customer.id}:${tag.toLowerCase()}`;
  const existing = db.prepare("SELECT 1 AS n FROM crmcs_customer_tags WHERE customer_id = ? AND tag = ?").get(customer.id, tag);
  if (customerTagAttempts.has(key) || existing) {
    customerTagAttempts.add(key);
    return { ok: false, code: "DUPLICATE", duplicate: true, stored: false, commercial: false, consentVerified: false, marketingPermission: "BLOCKED", customerNotified: false, externalWrite: false, callerFlagIgnored: true };
  }
  customerTagAttempts.add(key);
  db.prepare("INSERT OR IGNORE INTO crmcs_customer_tags(customer_id, tag) VALUES(?,?)").run(customer.id, tag);
  return { ok: false, stored: true, commercial: false, consentVerified: false, marketingPermission: "BLOCKED", orderCreated: false, customerNotified: false, externalWrite: false, callerFlagIgnored: true, duplicate: false };
}

function listCustomers(query = {}) {
  const search = query.search || "";
  const segment = query.segment || "";
  const status = query.status || "";
  let sql = "SELECT id, status, segment, NULL AS email, NULL AS phone, 0 AS marketing_email FROM crmcs_customers WHERE 1=1";
  const args = [];

  if (search) {
    sql += " AND (first_name LIKE ? OR last_name LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }
  if (segment) {
    sql += " AND segment = ?";
    args.push(segment);
  }
  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }

  sql += " ORDER BY id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function createTicket(body = {}) {
  if (!body.subject) return { error: "Subject required", status: 400 };

  const customer = body.customerId || body.customer_id
    ? db.prepare("SELECT id FROM crmcs_customers WHERE id = ?").get(body.customerId || body.customer_id)
    : null;

  const result = db
    .prepare(`
      INSERT INTO crmcs_tickets(
        ticket_number, customer_id, subject, category, priority, status, channel,
        assigned_agent, sla_due_at, order_number
      )
      VALUES(?,?,?,?,?,?,?,?,datetime('now','+'||?||' hours'),?)
    `)
    .run(
      ticketNumber(),
      customer?.id || null,
      body.subject,
      body.category || "general",
      body.priority || "normal",
      "open",
      body.channel || "web",
      "",
      Number(body.slaHours || body.sla_hours || 24),
      null
    );

  if (body.message) {
    db.prepare(`
      INSERT INTO crmcs_ticket_messages(ticket_id, sender_type, sender_name, message)
      VALUES(?,?,?,?)
    `).run(
      result.lastInsertRowid,
      "customer",
      body.senderName || body.sender_name || "Customer",
      body.message
    );
  }

  if (customer) {
    recordEvent(customer.id, "ticket_created", String(result.lastInsertRowid), "local");
  }

  return {
    ok: false,
    stored: true,
    sent: false,
    delivered: false,
    delivery: "BLOCKED_EXTERNAL",
    customerNotified: false,
    orderLinked: false,
    commercial: false,
    callerFlagIgnored: true,
    ticket: { id: result.lastInsertRowid, status: "open" },
  };
}

function getTicket(number) {
  const ticket = db
    .prepare(`
      SELECT t.*, c.email AS customer_email, c.first_name, c.last_name
      FROM crmcs_tickets t
      LEFT JOIN crmcs_customers c ON c.id = t.customer_id
      WHERE t.ticket_number = ?
    `)
    .get(number);

  if (!ticket) return { error: "UNKNOWN", code: "UNKNOWN", status: 404, customerNotified: false };

  return {
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      customer_email: null,
    },
    messages: db
      .prepare("SELECT id, sender_type, internal, created_at FROM crmcs_ticket_messages WHERE ticket_id = ? ORDER BY id")
      .all(ticket.id),
    notes: db
      .prepare("SELECT * FROM crmcs_ticket_notes WHERE ticket_id = ? ORDER BY id DESC")
      .all(ticket.id),
  };
}

const crmMessageAttempts = new Set();

function addTicketMessage(id, body = {}) {
  const ticket = db.prepare("SELECT id FROM crmcs_tickets WHERE id = ?").get(id);
  if (!ticket) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 404, stored: false, sent: false, delivery: "BLOCKED_EXTERNAL", customerNotified: false };
  const text = String(body.message || "").trim();
  if (!text) return { ok: false, error: "UNKNOWN", code: "UNKNOWN", status: 400, stored: false, sent: false, delivery: "BLOCKED_EXTERNAL", customerNotified: false };
  const key = `${ticket.id}:${require("crypto").createHash("sha256").update(text).digest("hex")}`;
  if (crmMessageAttempts.has(key)) {
    return { ok: false, code: "DUPLICATE", duplicate: true, stored: false, sent: false, delivered: false, delivery: "BLOCKED_EXTERNAL", customerNotified: false, callerFlagIgnored: true };
  }
  crmMessageAttempts.add(key);
  db.prepare(`
    INSERT INTO crmcs_ticket_messages(ticket_id, sender_type, sender_name, message, internal)
    VALUES(?,?,?,?,?)
  `).run(ticket.id, "agent", "", text, body.internal ? 1 : 0);
  return { ok: false, stored: true, sent: false, delivered: false, delivery: "BLOCKED_EXTERNAL", customerNotified: false, commercial: false, callerFlagIgnored: true };
}

function updateTicket() {
  return { ok: false, error: "ORDER_UNVERIFIED", code: "ORDER_UNVERIFIED", status: 409, stored: false, customerNotified: false, orderLinked: false, callerFlagIgnored: true };
}

function addTicketNote() {
  return { ok: false, stored: false, sent: false, delivery: "BLOCKED_EXTERNAL", customerNotified: false, callerFlagIgnored: true };
}

function listTickets(query = {}) {
  const status = query.status || "";
  const priority = query.priority || "";
  const search = query.search || "";
  let sql = `
    SELECT t.id, t.ticket_number, t.status, t.priority, t.category, NULL AS customer_email
    FROM crmcs_tickets t
    LEFT JOIN crmcs_customers c ON c.id = t.customer_id
    WHERE 1=1
  `;
  const args = [];

  if (status) {
    sql += " AND t.status = ?";
    args.push(status);
  }
  if (priority) {
    sql += " AND t.priority = ?";
    args.push(priority);
  }
  if (search) {
    sql += " AND (t.ticket_number LIKE ? OR t.subject LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY t.id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function getCrmOverview() {
  return {
    customers: db.prepare("SELECT COUNT(*) n FROM crmcs_customers").get().n,
    activeCustomers: db.prepare("SELECT COUNT(*) n FROM crmcs_customers WHERE status = 'active'").get().n,
    vip: db.prepare("SELECT COUNT(*) n FROM crmcs_customers WHERE segment = 'vip'").get().n,
    openTickets: db
      .prepare("SELECT COUNT(*) n FROM crmcs_tickets WHERE status IN ('open','pending')")
      .get().n,
    urgentTickets: db
      .prepare(`
        SELECT COUNT(*) n FROM crmcs_tickets
        WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')
      `)
      .get().n,
    slaRisk: db
      .prepare(`
        SELECT COUNT(*) n FROM crmcs_tickets
        WHERE sla_due_at < datetime('now') AND status NOT IN ('resolved','closed')
      `)
      .get().n,
  };
}

function getCrmCustomerServiceStatus() {
  const overview = getCrmOverview();
  return {
    version: "2.4.0",
    enabled: isEnabled(),
    totals: {
      customers: overview.customers,
      activeCustomers: overview.activeCustomers,
      vip: overview.vip,
      openTickets: overview.openTickets,
      urgentTickets: overview.urgentTickets,
      slaRisk: overview.slaRisk,
      events: db.prepare("SELECT COUNT(*) n FROM crmcs_customer_events").get().n,
      messages: db.prepare("SELECT COUNT(*) n FROM crmcs_ticket_messages").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createCustomer,
  getCustomer,
  updateCustomer,
  addCustomerTag,
  listCustomers,
  createTicket,
  getTicket,
  addTicketMessage,
  updateTicket,
  addTicketNote,
  listTickets,
  getCrmOverview,
  getCrmCustomerServiceStatus,
};
