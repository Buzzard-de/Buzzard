const { db } = require("../lib/db");
const { hashPassword, signUser, requireAuth, requireAdmin, ensureAdmin, authenticateUser } = require("../lib/dbAuth");
const { createOrderFromCartWithPayment } = require("../lib/dbOrders");
const { createShipment } = require("../lib/dbCarriers");
const { syncCatalogProducts, findProductBySku } = require("../lib/catalogProductSync");
const {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  isValidName,
  enforceAuthRateLimit,
  logAuthFailure,
} = require("../lib/authSecurity");
const { getLockoutInfo, recordFailure, clearFailures } = require("../lib/accountLockout");
const { getClientIp } = require("../lib/security");

function isEnabled() {
  return process.env.BUZZARD_DB_ENABLED !== "0";
}

function publicProduct(product) {
  return { ...product, active: Boolean(product.active) };
}

function listUserOrders(userId) {
  return db
    .prepare(`
      SELECT id, order_number, country_code, currency, subtotal, shipping, tax, total,
             status, shipping_status, payment_status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
    `)
    .all(userId);
}

function getOrCreateCart(userId) {
  let cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(userId);
  if (!cart) {
    const created = db.prepare("INSERT INTO carts(user_id) VALUES(?)").run(userId);
    cart = { id: created.lastInsertRowid };
  }
  return cart;
}

function readCartPayload(cartId) {
  const items = db
    .prepare(`
      SELECT ci.product_id, ci.quantity, p.sku, p.name, p.price_eur, p.weight_kg
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = ?
    `)
    .all(cartId);
  return {
    items,
    subtotal: items.reduce((sum, item) => sum + item.price_eur * item.quantity, 0),
    weight: items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0),
  };
}

module.exports = {
  register(app) {
    if (!isEnabled()) {
      console.log("SQLite database plugin disabled (BUZZARD_DB_ENABLED=0)");
      return;
    }

    ensureAdmin();
    const catalogSync = syncCatalogProducts();
    if (catalogSync.synced) {
      console.log(`SQLite catalog sync: ${catalogSync.synced} SKU rows upserted`);
    }

    app.get("/api/db/status", (_req, res) => {
      res.json({ ok: true, service: "buzzard-backend", version: "0.4.0", storage: "sqlite" });
    });

    app.post("/api/auth/register", (req, res) => {
      const { email, password, name } = req.body || {};
      if (!enforceAuthRateLimit(req, res, { scope: "register", email, path: "/api/auth/register" })) {
        return;
      }
      if (!isValidEmail(email) || !isValidPassword(password) || !isValidName(name)) {
        return res.status(400).json({
          error: "Name, valid email and password of at least 8 characters are required",
        });
      }
      const normalizedEmail = normalizeEmail(email);
      const normalizedName = String(name).trim().slice(0, 100);
      try {
        const info = db
          .prepare("INSERT INTO users(email, password_hash, name) VALUES(?,?,?)")
          .run(normalizedEmail, hashPassword(password), normalizedName);
        const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(info.lastInsertRowid);
        return res.status(201).json({ user, token: signUser(user) });
      } catch {
        logAuthFailure(req, { type: "auth_register_rejected", email: normalizedEmail, path: "/api/auth/register" });
        return res.status(409).json({ error: "Email already exists" });
      }
    });

    app.post("/api/auth/login", (req, res) => {
      const { email, password } = req.body || {};
      const normalizedEmail = normalizeEmail(email);
      const ip = getClientIp(req);
      const lockout = getLockoutInfo("auth", normalizedEmail);
      if (lockout.locked) {
        return res.status(423).json({
          error: "Account temporarily locked",
          errorKey: "auth.locked",
          retryAfterSec: lockout.retryAfterSec,
        });
      }
      if (!enforceAuthRateLimit(req, res, { scope: "login", email, path: "/api/auth/login" })) {
        return;
      }
      if (!isValidEmail(email) || typeof password !== "string" || password.length === 0 || password.length > 128) {
        recordFailure("auth", normalizedEmail, { ip, email: normalizedEmail, path: "/api/auth/login" });
        logAuthFailure(req, { type: "auth_login_failed", email, path: "/api/auth/login" });
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const user = db
        .prepare("SELECT id, email, name, role, password_hash FROM users WHERE email = ?")
        .get(normalizedEmail);
      if (!user || !authenticateUser(user, password)) {
        const failure = recordFailure("auth", normalizedEmail, {
          ip,
          email: normalizedEmail,
          path: "/api/auth/login",
        });
        logAuthFailure(req, { type: "auth_login_failed", email: normalizedEmail, path: "/api/auth/login" });
        if (failure.locked) {
          return res.status(423).json({
            error: "Account temporarily locked",
            errorKey: "auth.locked",
            retryAfterSec: failure.retryAfterSec,
          });
        }
        return res.status(401).json({ error: "Invalid credentials" });
      }
      clearFailures("auth", normalizedEmail);
      delete user.password_hash;
      return res.json({ user, token: signUser(user) });
    });

    app.get("/api/me", (req, res) => {
      if (!requireAuth(req, res)) return;
      const user = db
        .prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
        .get(req.user.sub);
      return res.json(user);
    });

    app.patch("/api/me", (req, res) => {
      if (!requireAuth(req, res)) return;
      const { name } = req.body || {};
      if (name) {
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(String(name).trim(), req.user.sub);
      }
      const user = db
        .prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
        .get(req.user.sub);
      return res.json(user);
    });

    app.get("/api/categories", (_req, res) => {
      return res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
    });

    app.get("/api/products", (req, res) => {
      const { q, category } = req.query || {};
      let sql = `
        SELECT p.*, c.name category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.active = 1
      `;
      const args = [];
      if (q) {
        sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
        args.push(`%${q}%`, `%${q}%`);
      }
      if (category) {
        sql += " AND c.name = ?";
        args.push(category);
      }
      sql += " ORDER BY p.id DESC";
      return res.json(db.prepare(sql).all(...args).map(publicProduct));
    });

    app.get("/api/products/by-sku/:sku", (req, res) => {
      const product = findProductBySku(decodeURIComponent(req.params.sku));
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.json(publicProduct(product));
    });

    app.get("/api/products/:id", (req, res) => {
      const product = db
        .prepare(`
          SELECT p.*, c.name category
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.id = ? AND p.active = 1
        `)
        .get(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.json(publicProduct(product));
    });

    app.post("/api/cart/items", (req, res) => {
      if (!requireAuth(req, res)) return;
      const { productId, sku, quantity = 1 } = req.body || {};
      let product = null;
      if (productId) {
        product = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(productId);
      } else if (sku) {
        product = findProductBySku(String(sku));
      }
      if (!product || quantity < 1 || quantity > product.stock) {
        return res.status(400).json({ error: "Invalid product or quantity" });
      }
      const cart = getOrCreateCart(req.user.sub);
      db.prepare(`
        INSERT INTO cart_items(cart_id, product_id, quantity) VALUES(?,?,?)
        ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
      `).run(cart.id, product.id, quantity);
      return res.json({ ok: true, productId: product.id });
    });

    app.get("/api/cart", (req, res) => {
      if (!requireAuth(req, res)) return;
      const cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(req.user.sub);
      if (!cart) return res.json({ items: [], subtotal: 0, weight: 0 });
      return res.json(readCartPayload(cart.id));
    });

    app.patch("/api/cart/items/:productId", (req, res) => {
      if (!requireAuth(req, res)) return;
      const productId = Number(req.params.productId);
      const { quantity } = req.body || {};
      const cart = db.prepare("SELECT id FROM carts WHERE user_id = ?").get(req.user.sub);
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      if (!Number.isFinite(quantity) || quantity < 1) {
        db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?").run(cart.id, productId);
        return res.json({ ok: true });
      }

      const product = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(productId);
      if (!product || quantity > product.stock) {
        return res.status(400).json({ error: "Invalid product or quantity" });
      }

      db.prepare(`
        INSERT INTO cart_items(cart_id, product_id, quantity) VALUES(?,?,?)
        ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = excluded.quantity
      `).run(cart.id, productId, quantity);
      return res.json({ ok: true });
    });

    app.put("/api/cart/sync", (req, res) => {
      if (!requireAuth(req, res)) return;
      const { items = [] } = req.body || {};
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "items must be an array" });
      }

      const cart = getOrCreateCart(req.user.sub);
      const resolved = [];

      for (const entry of items) {
        const sku = String(entry?.sku || "").trim();
        const quantity = Number(entry?.quantity);
        if (!sku || !Number.isFinite(quantity) || quantity < 1) continue;

        const product = findProductBySku(sku);
        if (!product) continue;
        if (quantity > product.stock) {
          return res.status(409).json({ error: `Insufficient stock: ${sku}` });
        }

        const existing = resolved.find((row) => row.productId === product.id);
        if (existing) {
          existing.quantity += quantity;
          if (existing.quantity > product.stock) {
            return res.status(409).json({ error: `Insufficient stock: ${sku}` });
          }
        } else {
          resolved.push({ productId: product.id, quantity });
        }
      }

      db.transaction(() => {
        db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cart.id);
        const insert = db.prepare(`
          INSERT INTO cart_items(cart_id, product_id, quantity) VALUES(?,?,?)
        `);
        for (const row of resolved) {
          insert.run(cart.id, row.productId, row.quantity);
        }
      })();

      return res.json(readCartPayload(cart.id));
    });

    app.delete("/api/cart/items/:productId", (req, res) => {
      if (!requireAuth(req, res)) return;
      const cart = db.prepare("SELECT id FROM carts WHERE user_id = ?").get(req.user.sub);
      if (cart) {
        db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?").run(
          cart.id,
          req.params.productId
        );
      }
      return res.json({ ok: true });
    });

    async function handleCreateOrder(req, res) {
      if (!requireAuth(req, res)) return;
      const { requireSalesEnabled } = require("../lib/salesMode");
      if (!requireSalesEnabled(req, res)) return;
      const { countryCode = "DE", currency = "EUR", shippingAddress } = req.body || {};
      try {
        const result = await createOrderFromCartWithPayment(req.user.sub, {
          countryCode,
          currency,
          shippingAddress,
        });
        if (result.error) {
          return res.status(result.status || 400).json({ error: result.error });
        }
        return res.status(201).json({
          id: result.orderId,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          subtotal: result.subtotal,
          shipping: result.shipping,
          tax: result.tax,
          total: result.total,
          status: result.status,
          payment: result.payment,
        });
      } catch (error) {
        console.error("SQLite order error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }

    app.post("/api/db/orders", handleCreateOrder);

    function handleListOrders(req, res) {
      if (!requireAuth(req, res)) return;
      return res.json(listUserOrders(req.user.sub));
    }

    app.get("/api/db/orders", handleListOrders);
    app.get("/api/orders", handleListOrders);

    app.get("/api/db/orders/:orderNumber", (req, res) => {
      if (!requireAuth(req, res)) return;
      const order = db
        .prepare(`
          SELECT id, order_number, country_code, currency, subtotal, shipping, tax, total,
                 status, shipping_status, payment_status, created_at
          FROM orders
          WHERE order_number = ? AND user_id = ?
        `)
        .get(req.params.orderNumber, req.user.sub);
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.json(order);
    });

    app.get("/api/db/admin/orders", (req, res) => {
      if (!requireAdmin(req, res)) return;
      return res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
    });

    app.get("/api/db/admin/products", (req, res) => {
      if (!requireAdmin(req, res)) return;
      return res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
    });

    app.get("/api/db/admin/products/:id", (req, res) => {
      if (!requireAdmin(req, res)) return;
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.json(product);
    });

    app.patch("/api/db/admin/products/:id", (req, res) => {
      if (!requireAdmin(req, res)) return;
      const { price_eur, stock, active, name, description } = req.body || {};
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      db.prepare(`
        UPDATE products
        SET price_eur = ?, stock = ?, active = ?, name = ?, description = ?
        WHERE id = ?
      `).run(
        price_eur ?? product.price_eur,
        stock ?? product.stock,
        active ?? product.active,
        name ?? product.name,
        description ?? product.description,
        product.id
      );
      return res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(product.id));
    });

    app.patch("/api/db/admin/orders/:orderNumber/status", (req, res) => {
      if (!requireAdmin(req, res)) return;
      const { status } = req.body || {};
      if (!status) return res.status(400).json({ error: "status required" });
      const order = db
        .prepare("SELECT * FROM orders WHERE order_number = ?")
        .get(req.params.orderNumber);
      if (!order) return res.status(404).json({ error: "Order not found" });
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, order.id);
      return res.json(
        db.prepare(`
          SELECT id, order_number, country_code, currency, subtotal, shipping, tax, total,
                 status, shipping_status, payment_status, created_at
          FROM orders WHERE id = ?
        `).get(order.id)
      );
    });

    app.post("/api/db/admin/shipments", async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const { orderId } = req.body || {};
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      try {
        const shipment = await createShipment({
          orderNumber: order.order_number,
          countryCode: order.country_code,
          weightKg: 0,
          address: JSON.parse(order.shipping_address || "{}"),
        });
        db.prepare("UPDATE orders SET shipping_status = ? WHERE id = ?").run(shipment.status, order.id);
        return res.json(shipment);
      } catch (error) {
        console.error("SQLite shipment error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });
  },
};
