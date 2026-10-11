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
  `);
}

module.exports = { migrateSoftwareSchema };
