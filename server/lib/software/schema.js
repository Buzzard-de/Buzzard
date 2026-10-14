/**
 * Software-completion persistence — same SQLite as Buzzard. Never /tmp.
 */

function migrateSoftwareSchema(db) {
  if (!db) throw new Error("database required for software schema migration");

  db.exec(`
    CREATE TABLE IF NOT EXISTS software_inventory_sources (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      source TEXT NOT NULL,
      quantity REAL,
      last_supplier_update TEXT,
      stock_updated_at TEXT,
      reliable INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_inv_sku ON software_inventory_sources(sku);

    CREATE TABLE IF NOT EXISTS software_reservations (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      quantity REAL NOT NULL,
      order_id TEXT,
      customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      source TEXT,
      idempotency_key TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      released_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_res_idem
      ON software_reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sw_res_sku ON software_reservations(sku);
    CREATE INDEX IF NOT EXISTS idx_sw_res_order ON software_reservations(order_id);

    CREATE TABLE IF NOT EXISTS software_reservation_events (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reservation_id) REFERENCES software_reservations(id)
    );

    CREATE TABLE IF NOT EXISTS software_shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      tracking_number TEXT NOT NULL,
      carrier TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED',
      estimated_delivery TEXT,
      last_update TEXT,
      location_type TEXT NOT NULL DEFAULT 'not_available',
      gps_invented INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_ship_track ON software_shipments(tracking_number);
    CREATE INDEX IF NOT EXISTS idx_sw_ship_order ON software_shipments(order_id);
    CREATE INDEX IF NOT EXISTS idx_sw_ship_customer ON software_shipments(customer_id);

    CREATE TABLE IF NOT EXISTS software_shipment_events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      occurred_at TEXT,
      location_type TEXT NOT NULL DEFAULT 'carrier_event',
      gps_invented INTEGER NOT NULL DEFAULT 0,
      raw_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shipment_id) REFERENCES software_shipments(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sw_ship_evt ON software_shipment_events(shipment_id);

    CREATE TABLE IF NOT EXISTS software_audit (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      subject TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_audit_kind ON software_audit(kind);

    CREATE TABLE IF NOT EXISTS software_return_ledger (
      id TEXT PRIMARY KEY,
      rma_id TEXT,
      order_number TEXT,
      customer_id TEXT,
      customer_refund_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
      supplier_credit_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
      customer_refund_executed INTEGER NOT NULL DEFAULT 0,
      supplier_credit_received INTEGER NOT NULL DEFAULT 0,
      assumed_supplier_will_reimburse INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_ret_order ON software_return_ledger(order_number);
    CREATE INDEX IF NOT EXISTS idx_sw_ret_customer ON software_return_ledger(customer_id);

    CREATE TABLE IF NOT EXISTS software_message_drafts (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL DEFAULT 'email',
      locale TEXT,
      customer_id TEXT,
      order_id TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      input_hash TEXT NOT NULL,
      body TEXT NOT NULL,
      classification TEXT,
      sent INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_msg_hash ON software_message_drafts(input_hash);
    CREATE INDEX IF NOT EXISTS idx_sw_msg_customer ON software_message_drafts(customer_id);

    CREATE TABLE IF NOT EXISTS software_marketplace_drafts (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      sku TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      input_hash TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0,
      listing_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_mp_hash ON software_marketplace_drafts(input_hash);
    CREATE INDEX IF NOT EXISTS idx_sw_mp_channel ON software_marketplace_drafts(channel);

    CREATE TABLE IF NOT EXISTS software_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'mock',
      state TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      capture_required INTEGER NOT NULL DEFAULT 1,
      idempotency_key TEXT,
      last_event_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_pay_idem
      ON software_payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sw_pay_order ON software_payments(order_id);

    CREATE TABLE IF NOT EXISTS software_payment_events (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 0,
      applied INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id),
      FOREIGN KEY(payment_id) REFERENCES software_payments(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sw_pay_evt ON software_payment_events(payment_id);

    CREATE TABLE IF NOT EXISTS software_transfers (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      order_id TEXT,
      from_role TEXT NOT NULL DEFAULT 'incoming',
      to_role TEXT NOT NULL DEFAULT 'reserve',
      state TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      idempotency_key TEXT,
      irreversible INTEGER NOT NULL DEFAULT 0,
      executed INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_xfer_idem
      ON software_transfers(idempotency_key) WHERE idempotency_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS software_risk_assessments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      reasons_json TEXT DEFAULT '[]',
      signals_json TEXT DEFAULT '[]',
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_risk_order ON software_risk_assessments(order_id);

    CREATE TABLE IF NOT EXISTS software_confirmations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING',
      notification_state TEXT NOT NULL DEFAULT 'PENDING',
      channel TEXT NOT NULL DEFAULT 'email',
      locale TEXT,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_conf_hash ON software_confirmations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sw_conf_order ON software_confirmations(order_id);

    CREATE TABLE IF NOT EXISTS software_identity_signals (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      declared_json TEXT DEFAULT '{}',
      verified_json TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'UNVERIFIED',
      source TEXT,
      verified_at TEXT,
      limitations TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_ident_order ON software_identity_signals(order_id);

    CREATE TABLE IF NOT EXISTS software_delivery_evidence (
      id TEXT PRIMARY KEY,
      shipment_id TEXT,
      order_id TEXT,
      kind TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      carrier_event_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_ev_dup
      ON software_delivery_evidence(shipment_id, kind, carrier_event_id)
      WHERE carrier_event_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS software_location_records (
      id TEXT PRIMARY KEY,
      shipment_id TEXT,
      order_id TEXT,
      kind TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      occurred_at TEXT,
      source TEXT,
      authorized INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_loc_ship ON software_location_records(shipment_id);

    CREATE TABLE IF NOT EXISTS software_disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_id TEXT,
      shipment_id TEXT,
      kind TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'OPEN',
      event_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_disp_evt
      ON software_disputes(event_id) WHERE event_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sw_disp_order ON software_disputes(order_id);
  `);

  ensureColumn(db, "software_payments", "provider_payment_id", "provider_payment_id TEXT");
  ensureColumn(db, "software_reservations", "consumed_at", "consumed_at TEXT");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_pay_provider_ref
      ON software_payments(provider, provider_payment_id)
      WHERE provider_payment_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS software_price_history (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'direct',
      sale_price REAL NOT NULL,
      net_profit REAL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      sale_approved INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_price_hist_sku ON software_price_history(sku);

    CREATE TABLE IF NOT EXISTS software_supplier_decisions (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      selected_supplier TEXT,
      status TEXT NOT NULL,
      reason TEXT,
      scores_json TEXT DEFAULT '{}',
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_sup_dec_sku ON software_supplier_decisions(sku);

    CREATE TABLE IF NOT EXISTS software_fulfillment_plans (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      live_bound INTEGER NOT NULL DEFAULT 0,
      sent INTEGER NOT NULL DEFAULT 0,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_ff_order ON software_fulfillment_plans(order_id);

    CREATE TABLE IF NOT EXISTS software_circuit_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_cb_name ON software_circuit_events(name);

    CREATE TABLE IF NOT EXISTS software_order_identities (
      canonical_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      details_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS software_order_aliases (
      id TEXT PRIMARY KEY,
      canonical_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      external_ref TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(canonical_id) REFERENCES software_order_identities(canonical_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_ord_alias_ref
      ON software_order_aliases(kind, external_ref);
    CREATE INDEX IF NOT EXISTS idx_sw_ord_alias_canon ON software_order_aliases(canonical_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_ord_alias_value
      ON software_order_aliases(external_ref);

    CREATE TABLE IF NOT EXISTS software_customer_qr (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sw_cqr_customer ON software_customer_qr(customer_id);

    CREATE TABLE IF NOT EXISTS software_package_qr (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      canonical_order_id TEXT NOT NULL,
      package_ref TEXT,
      campaign_id TEXT,
      channel TEXT,
      attribution_source TEXT NOT NULL DEFAULT 'UNKNOWN',
      eligibility_status TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      details_json TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_sw_pqr_order ON software_package_qr(canonical_order_id);

    CREATE TABLE IF NOT EXISTS software_qr_scans (
      id TEXT PRIMARY KEY,
      qr_kind TEXT NOT NULL,
      token TEXT NOT NULL,
      visitor_hash TEXT,
      customer_id TEXT,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      bot_suspect INTEGER NOT NULL DEFAULT 0,
      review_required INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      details_json TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_sw_qrs_token ON software_qr_scans(token);

    CREATE TABLE IF NOT EXISTS software_loyalty_entitlements (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      campaign_code TEXT NOT NULL,
      canonical_first_order_id TEXT,
      canonical_redeem_order_id TEXT,
      state TEXT NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      reserved_checkout_id TEXT,
      reserved_until TEXT,
      idempotency_key TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_loy_customer_campaign
      ON software_loyalty_entitlements(customer_id, campaign_code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sw_loy_idem
      ON software_loyalty_entitlements(idempotency_key) WHERE idempotency_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS software_loyalty_events (
      id TEXT PRIMARY KEY,
      entitlement_id TEXT,
      customer_id TEXT,
      event_type TEXT NOT NULL,
      from_state TEXT,
      to_state TEXT,
      canonical_order_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sw_loy_evt ON software_loyalty_events(entitlement_id);
  `);
}

function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

module.exports = { migrateSoftwareSchema };
