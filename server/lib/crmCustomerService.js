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
        body.marketingEmail || body.marketing_email ? 1 : 0,
        body.marketingSms || body.marketing_sms ? 1 : 0
      );

    recordEvent(result.lastInsertRowid, "customer_created", "", "Customer created");
    return { customer: db.prepare("SELECT * FROM crmcs_customers WHERE id = ?").get(result.lastInsertRowid), created: true };
  } catch {
    return { error: "Customer already exists", status: 409 };
  }
}

function getCustomer(id) {
  const customer = db.prepare("SELECT * FROM crmcs_customers WHERE id = ?").get(id);
  if (!customer) return { error: "Customer not found", status: 404 };

  return {
    customer,
    tags: db.prepare("SELECT tag FROM crmcs_customer_tags WHERE customer_id = ?").all(customer.id),
    events: db
      .prepare("SELECT * FROM crmcs_customer_events WHERE customer_id = ? ORDER BY id DESC")
      .all(customer.id),
    tickets: db
      .prepare("SELECT * FROM crmcs_tickets WHERE customer_id = ? ORDER BY id DESC")
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
    body.phone ?? customer.phone,
    body.countryCode ?? body.country_code ?? customer.country_code,
    body.language ?? customer.language,
    body.segment ?? customer.segment,
    body.status ?? customer.status,
    body.marketingEmail == null && body.marketing_email == null
      ? customer.marketing_email
      : body.marketingEmail || body.marketing_email
        ? 1
        : 0,
    body.marketingSms == null && body.marketing_sms == null
      ? customer.marketing_sms
      : body.marketingSms || body.marketing_sms
        ? 1
        : 0,
    customer.id
  );

  return { customer: db.prepare("SELECT * FROM crmcs_customers WHERE id = ?").get(customer.id) };
}

function addCustomerTag(id, body = {}) {
  const tag = String(body.tag || "").trim();
  if (!tag) return { error: "Tag required", status: 400 };

  db.prepare("INSERT OR IGNORE INTO crmcs_customer_tags(customer_id, tag) VALUES(?,?)").run(id, tag);
  return { ok: true };
}

function listCustomers(query = {}) {
  const search = query.search || "";
  const segment = query.segment || "";
  const status = query.status || "";
  let sql = "SELECT * FROM crmcs_customers WHERE 1=1";
  const args = [];

  if (search) {
    sql += " AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
      body.assignedAgent || body.assigned_agent || "",
      Number(body.slaHours || body.sla_hours || 24),
      body.orderNumber || body.order_number || ""
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
    recordEvent(customer.id, "ticket_created", String(result.lastInsertRowid), body.subject);
  }

  return { ticket: db.prepare("SELECT * FROM crmcs_tickets WHERE id = ?").get(result.lastInsertRowid), created: true };
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

  if (!ticket) return { error: "Ticket not found", status: 404 };

  return {
    ticket,
    messages: db
      .prepare("SELECT * FROM crmcs_ticket_messages WHERE ticket_id = ? ORDER BY id")
      .all(ticket.id),
    notes: db
      .prepare("SELECT * FROM crmcs_ticket_notes WHERE ticket_id = ? ORDER BY id DESC")
      .all(ticket.id),
  };
}

function addTicketMessage(id, body = {}) {
  const ticket = db.prepare("SELECT * FROM crmcs_tickets WHERE id = ?").get(id);
  if (!ticket) return { error: "Ticket not found", status: 404 };

  db.prepare(`
    INSERT INTO crmcs_ticket_messages(ticket_id, sender_type, sender_name, message, internal)
    VALUES(?,?,?,?,?)
  `).run(
    ticket.id,
    body.senderType || body.sender_type || "agent",
    body.senderName || body.sender_name || "Agent",
    body.message || "",
    body.internal ? 1 : 0
  );

  db.prepare("UPDATE crmcs_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(ticket.id);
  return { ok: true };
}

function updateTicket(id, body = {}) {
  const ticket = db.prepare("SELECT * FROM crmcs_tickets WHERE id = ?").get(id);
  if (!ticket) return { error: "Ticket not found", status: 404 };

  db.prepare(`
    UPDATE crmcs_tickets SET
      priority = ?, status = ?, category = ?, assigned_agent = ?, order_number = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.priority ?? ticket.priority,
    body.status ?? ticket.status,
    body.category ?? ticket.category,
    body.assignedAgent ?? body.assigned_agent ?? ticket.assigned_agent,
    body.orderNumber ?? body.order_number ?? ticket.order_number,
    ticket.id
  );

  if (ticket.customer_id && body.status) {
    recordEvent(ticket.customer_id, "ticket_updated", ticket.ticket_number, "Support ticket updated", {
      status: body.status,
    });
  }

  return { ticket: db.prepare("SELECT * FROM crmcs_tickets WHERE id = ?").get(ticket.id) };
}

function addTicketNote(id, body = {}) {
  db.prepare("INSERT INTO crmcs_ticket_notes(ticket_id, note) VALUES(?,?)").run(id, body.note || "");
  return { ok: true };
}

function listTickets(query = {}) {
  const status = query.status || "";
  const priority = query.priority || "";
  const search = query.search || "";
  let sql = `
    SELECT t.*, c.email AS customer_email, c.first_name, c.last_name
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
    sql += " AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR c.email LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
