const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_WMS_INVENTORY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function listWarehouses() {
  return db
    .prepare("SELECT * FROM wms_warehouses ORDER BY code")
    .all()
    .map((warehouse) => ({
      ...warehouse,
      active: Boolean(warehouse.active),
      locations: db.prepare("SELECT COUNT(*) n FROM wms_locations WHERE warehouse_id = ?").get(warehouse.id)
        .n,
      skus: db
        .prepare("SELECT COUNT(DISTINCT product_sku) n FROM wms_inventory WHERE warehouse_id = ?")
        .get(warehouse.id).n,
      lowStock: db
        .prepare(
          "SELECT COUNT(*) n FROM wms_inventory WHERE warehouse_id = ? AND (on_hand - reserved) <= reorder_point"
        )
        .get(warehouse.id).n,
    }));
}

function createWarehouse(body = {}) {
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  if (!code || !name) return { error: "code and name required", status: 400 };
  try {
    const result = db
      .prepare(
        "INSERT INTO wms_warehouses(code, name, country_code, address) VALUES(?,?,?,?)"
      )
      .run(code, name, body.countryCode || body.country_code || "DE", body.address || "");
    const warehouse = db.prepare("SELECT * FROM wms_warehouses WHERE id = ?").get(result.lastInsertRowid);
    return { warehouse: listWarehouses().find((row) => row.id === warehouse.id) || warehouse };
  } catch {
    return { error: "Warehouse code already exists", status: 409 };
  }
}

function createLocation(body = {}) {
  const warehouseId = Number(body.warehouseId || body.warehouse_id);
  const code = String(body.code || "").trim();
  if (!warehouseId || !code) return { error: "warehouseId and code required", status: 400 };
  try {
    db.prepare(
      "INSERT INTO wms_locations(warehouse_id, code, zone, bin_type) VALUES(?,?,?,?)"
    ).run(warehouseId, code, body.zone || "", body.binType || body.bin_type || "standard");
    return { ok: true };
  } catch {
    return { error: "Location exists", status: 409 };
  }
}

function listInventory() {
  return db
    .prepare(`
      SELECT i.*, w.code AS warehouse, l.code AS location
      FROM wms_inventory i
      JOIN wms_warehouses w ON w.id = i.warehouse_id
      LEFT JOIN wms_locations l ON l.id = i.location_id
      ORDER BY i.product_sku
    `)
    .all()
    .map((row) => ({
      ...row,
      available: row.on_hand - row.reserved - row.damaged,
      low_stock: row.on_hand - row.reserved <= row.reorder_point,
    }));
}

function recordMovement(body = {}, userId) {
  const warehouseId = Number(body.warehouseId || body.warehouse_id);
  const locationId = Number(body.locationId || body.location_id);
  const productSku = String(body.productSku || body.product_sku || "").trim();
  const type = String(body.type || "in");
  const quantity = Number(body.quantity || 0);

  const row = db
    .prepare(
      "SELECT * FROM wms_inventory WHERE warehouse_id = ? AND location_id = ? AND product_sku = ?"
    )
    .get(warehouseId, locationId, productSku);
  if (!row) return { error: "Inventory item not found", status: 404 };

  if (["out", "damage"].includes(type) && row.on_hand - row.reserved < quantity) {
    return { error: "Insufficient available stock", status: 400 };
  }

  db.prepare(`
    INSERT INTO wms_stock_movements(
      warehouse_id, location_id, product_sku, barcode, movement_type, quantity, reference, user_id
    )
    VALUES(?,?,?,?,?,?,?,?)
  `).run(
    warehouseId,
    locationId,
    productSku,
    body.barcode || row.barcode || "",
    type,
    quantity,
    body.reference || "",
    userId || null
  );

  const delta = type === "out" || type === "damage" ? -Math.abs(quantity) : Math.abs(quantity);
  db.prepare(`
    UPDATE wms_inventory
    SET on_hand = MAX(0, on_hand + ?), updated_at = CURRENT_TIMESTAMP
    WHERE warehouse_id = ? AND location_id = ? AND product_sku = ?
  `).run(delta, warehouseId, locationId, productSku);

  if (type === "damage") {
    db.prepare(`
      UPDATE wms_inventory
      SET damaged = damaged + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(Math.abs(quantity), row.id);
  }

  const updated = db.prepare("SELECT * FROM wms_inventory WHERE id = ?").get(row.id);
  return { inventory: updated };
}

function scanBarcode(barcode) {
  const row = db.prepare("SELECT * FROM wms_inventory WHERE barcode = ? LIMIT 1").get(barcode);
  if (!row) return { error: "Barcode not found", status: 404 };
  return {
    item: {
      ...row,
      available: row.on_hand - row.reserved - row.damaged,
    },
  };
}

function reserveInventory(body = {}) {
  const warehouseId = Number(body.warehouseId || body.warehouse_id);
  const locationId = Number(body.locationId || body.location_id);
  const productSku = String(body.productSku || body.product_sku || "").trim();
  const quantity = Number(body.quantity || 0);

  const row = db
    .prepare(
      "SELECT * FROM wms_inventory WHERE warehouse_id = ? AND location_id = ? AND product_sku = ?"
    )
    .get(warehouseId, locationId, productSku);
  if (!row || row.on_hand - row.reserved - row.damaged < quantity) {
    return { error: "Insufficient available stock", status: 400 };
  }

  db.prepare(
    "UPDATE wms_inventory SET reserved = reserved + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(quantity, row.id);

  const result = db
    .prepare(`
      INSERT INTO wms_reservations(warehouse_id, location_id, product_sku, quantity, order_number)
      VALUES(?,?,?,?,?)
    `)
    .run(warehouseId, locationId, productSku, quantity, body.orderNumber || body.order_number || "");

  const reservation = db
    .prepare("SELECT * FROM wms_reservations WHERE id = ?")
    .get(result.lastInsertRowid);
  return { reservation };
}

function createWarehouseJob(body = {}) {
  const warehouseId = Number(body.warehouseId || body.warehouse_id);
  if (!warehouseId) return { error: "warehouseId required", status: 400 };
  const result = db
    .prepare("INSERT INTO wms_warehouse_jobs(warehouse_id, order_number, job_type) VALUES(?,?,?)")
    .run(warehouseId, body.orderNumber || body.order_number || "", body.jobType || body.job_type || "pick");
  const job = db.prepare("SELECT * FROM wms_warehouse_jobs WHERE id = ?").get(result.lastInsertRowid);
  return { job };
}

function listWarehouseJobs() {
  return db
    .prepare(`
      SELECT j.*, w.code AS warehouse
      FROM wms_warehouse_jobs j
      JOIN wms_warehouses w ON w.id = j.warehouse_id
      ORDER BY j.id DESC
      LIMIT 200
    `)
    .all();
}

function createTransfer(body = {}) {
  const fromWarehouseId = Number(body.fromWarehouseId || body.from_warehouse_id);
  const toWarehouseId = Number(body.toWarehouseId || body.to_warehouse_id);
  const productSku = String(body.productSku || body.product_sku || "").trim();
  const quantity = Number(body.quantity || 0);

  const row = db
    .prepare("SELECT * FROM wms_inventory WHERE warehouse_id = ? AND product_sku = ? LIMIT 1")
    .get(fromWarehouseId, productSku);
  if (!row || row.on_hand - row.reserved < quantity) {
    return { error: "Insufficient source stock", status: 400 };
  }

  const result = db
    .prepare(`
      INSERT INTO wms_transfers(from_warehouse_id, to_warehouse_id, product_sku, quantity)
      VALUES(?,?,?,?)
    `)
    .run(fromWarehouseId, toWarehouseId, productSku, quantity);
  const transfer = db.prepare("SELECT * FROM wms_transfers WHERE id = ?").get(result.lastInsertRowid);
  return { transfer };
}

function createStocktake(body = {}) {
  const warehouseId = Number(body.warehouseId || body.warehouse_id);
  const locationId = Number(body.locationId || body.location_id);
  const productSku = String(body.productSku || body.product_sku || "").trim();
  const countedQty = Number(body.countedQty || body.counted_qty || 0);

  const row = db
    .prepare(
      "SELECT * FROM wms_inventory WHERE warehouse_id = ? AND location_id = ? AND product_sku = ?"
    )
    .get(warehouseId, locationId, productSku);
  if (!row) return { error: "Inventory item not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO wms_stocktakes(
        warehouse_id, location_id, product_sku, system_qty, counted_qty, variance, status
      )
      VALUES(?,?,?,?,?,?,?)
    `)
    .run(warehouseId, locationId, productSku, row.on_hand, countedQty, countedQty - row.on_hand, "completed");

  const stocktake = db.prepare("SELECT * FROM wms_stocktakes WHERE id = ?").get(result.lastInsertRowid);
  return { stocktake };
}

function listLowStock() {
  return db
    .prepare(`
      SELECT i.*, w.code AS warehouse, l.code AS location
      FROM wms_inventory i
      JOIN wms_warehouses w ON w.id = i.warehouse_id
      LEFT JOIN wms_locations l ON l.id = i.location_id
      WHERE (i.on_hand - i.reserved) <= i.reorder_point
      ORDER BY (i.on_hand - i.reserved) ASC
    `)
    .all()
    .map((row) => ({
      ...row,
      available: row.on_hand - row.reserved - row.damaged,
    }));
}

function listMovements() {
  return db.prepare("SELECT * FROM wms_stock_movements ORDER BY id DESC LIMIT 200").all();
}

function getWmsInventoryStatus() {
  return {
    version: "1.8.0",
    enabled: isEnabled(),
    totals: {
      warehouses: db.prepare("SELECT COUNT(*) n FROM wms_warehouses WHERE active = 1").get().n,
      locations: db.prepare("SELECT COUNT(*) n FROM wms_locations").get().n,
      inventoryRows: db.prepare("SELECT COUNT(*) n FROM wms_inventory").get().n,
      lowStock: db
        .prepare(
          "SELECT COUNT(*) n FROM wms_inventory WHERE (on_hand - reserved) <= reorder_point"
        )
        .get().n,
      reservations: db.prepare("SELECT COUNT(*) n FROM wms_reservations").get().n,
      warehouseJobs: db
        .prepare("SELECT COUNT(*) n FROM wms_warehouse_jobs WHERE status = 'queued'")
        .get().n,
      transfers: db.prepare("SELECT COUNT(*) n FROM wms_transfers").get().n,
      stocktakes: db.prepare("SELECT COUNT(*) n FROM wms_stocktakes").get().n,
      movements: db.prepare("SELECT COUNT(*) n FROM wms_stock_movements").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  listWarehouses,
  createWarehouse,
  createLocation,
  listInventory,
  recordMovement,
  scanBarcode,
  reserveInventory,
  createWarehouseJob,
  listWarehouseJobs,
  createTransfer,
  createStocktake,
  listLowStock,
  listMovements,
  getWmsInventoryStatus,
};
