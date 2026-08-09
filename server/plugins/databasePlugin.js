const crypto = require("crypto");
const { db } = require("../lib/db");
const { hashPassword, signUser, requireAuth, requireAdmin, ensureAdmin } = require("../lib/dbAuth");
const { calculateShipping } = require("../lib/dbShipping");
const { createPaymentSession } = require("../lib/dbPayments");
const { createShipment } = require("../lib/dbCarriers");

function isEnabled() {
  return process.env.BUZZARD_DB_ENABLED !== "0";
}

function publicProduct(product) {
  return { ...product, active: Boolean(product.active) };
}

function orderNumber() {
  return `BZ-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

module.exports = {
  register(app) {
    if (!isEnabled()) {
      console.log("SQLite database plugin disabled (BUZZARD_DB_ENABLED=0)");
      return;
    }

    ensureAdmin();

    app.get("/api/db/status", (_req, res) => {
      res.json({ ok: true, service: "buzzard-backend", version: "0.3.0", storage: "sqlite" });
    });

    app.post("/api/auth/register", (req, res) => {
      const { email, password, name } = req.body || {};
      if (!email || !password || !name || password.length < 8) {
        return res.status(400).json({
          error: "Name, valid email and password of at least 8 characters are required",
        });
      }
      try {
        const info = db
          .prepare("INSERT INTO users(email, password_hash, name) VALUES(?,?,?)")
          .run(email.toLowerCase(), hashPassword(password), name);
        const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(info.lastInsertRowid);
        return res.status(201).json({ user, token: signUser(user) });
      } catch {
        return res.status(409).json({ error: "Email already exists" });
      }
    });

    app.post("/api/auth/login", (req, res) => {
      const { email, password } = req.body || {};
      const user = db
        .prepare("SELECT id, email, name, role, password_hash FROM users WHERE email = ?")
        .get(String(email || "").toLowerCase());
      if (!user || user.password_hash !== hashPassword(password || "")) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
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
      const { productId, quantity = 1 } = req.body || {};
      const product = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(productId);
      if (!product || quantity < 1 || quantity > product.stock) {
        return res.status(400).json({ error: "Invalid product or quantity" });
      }
      let cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(req.user.sub);
      if (!cart) {
        const created = db.prepare("INSERT INTO carts(user_id) VALUES(?)").run(req.user.sub);
        cart = { id: created.lastInsertRowid };
      }
      db.prepare(`
        INSERT INTO cart_items(cart_id, product_id, quantity) VALUES(?,?,?)
        ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
      `).run(cart.id, productId, quantity);
      return res.json({ ok: true });
    });

    app.get("/api/cart", (req, res) => {
      if (!requireAuth(req, res)) return;
      const cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(req.user.sub);
      if (!cart) return res.json({ items: [], subtotal: 0, weight: 0 });
      const items = db
        .prepare(`
          SELECT ci.product_id, ci.quantity, p.sku, p.name, p.price_eur, p.weight_kg
          FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = ?
        `)
        .all(cart.id);
      return res.json({
        items,
        subtotal: items.reduce((sum, item) => sum + item.price_eur * item.quantity, 0),
        weight: items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0),
      });
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

    app.post("/api/db/orders", async (req, res) => {
      if (!requireAuth(req, res)) return;
      const { countryCode = "DE", currency = "EUR", shippingAddress } = req.body || {};
      const cart = db.prepare("SELECT id FROM carts WHERE user_id = ?").get(req.user.sub);
      if (!cart) return res.status(400).json({ error: "Cart is empty" });
      const items = db
        .prepare(`
          SELECT ci.product_id, ci.quantity, p.sku, p.name, p.price_eur, p.weight_kg, p.stock
          FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = ?
        `)
        .all(cart.id);
      if (!items.length) return res.status(400).json({ error: "Cart is empty" });
      for (const item of items) {
        if (item.quantity > item.stock) {
          return res.status(409).json({ error: `Insufficient stock: ${item.sku}` });
        }
      }
      const subtotal = items.reduce((sum, item) => sum + item.price_eur * item.quantity, 0);
      const weight = items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0);
      const shipping = calculateShipping(countryCode, weight, subtotal);
      const tax = Number((subtotal * 0.19).toFixed(2));
      const total = Number((subtotal + shipping + tax).toFixed(2));
      const number = orderNumber();

      try {
        const orderId = db.transaction(() => {
          const created = db
            .prepare(`
              INSERT INTO orders(
                order_number, user_id, country_code, currency, subtotal, shipping, tax, total, shipping_address
              ) VALUES(?,?,?,?,?,?,?,?,?)
            `)
            .run(
              number,
              req.user.sub,
              countryCode,
              currency,
              subtotal,
              shipping,
              tax,
              total,
              JSON.stringify(shippingAddress || {})
            );
          for (const item of items) {
            db.prepare(`
              INSERT INTO order_items(order_id, product_id, sku, name, unit_price_eur, quantity)
              VALUES(?,?,?,?,?,?)
            `).run(
              created.lastInsertRowid,
              item.product_id,
              item.sku,
              item.name,
              item.price_eur,
              item.quantity
            );
            db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id);
          }
          db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cart.id);
          return created.lastInsertRowid;
        })();

        const payment = await createPaymentSession({ orderNumber: number, total, currency });
        return res.status(201).json({
          orderId,
          orderNumber: number,
          subtotal,
          shipping,
          tax,
          total,
          payment,
        });
      } catch (error) {
        console.error("SQLite order error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/api/db/orders", (req, res) => {
      if (!requireAuth(req, res)) return;
      const rows = db
        .prepare(`
          SELECT id, order_number, country_code, currency, subtotal, shipping, tax, total,
                 status, shipping_status, payment_status, created_at
          FROM orders
          WHERE user_id = ?
          ORDER BY id DESC
        `)
        .all(req.user.sub);
      return res.json(rows);
    });

    app.get("/api/db/admin/orders", (req, res) => {
      if (!requireAdmin(req, res)) return;
      return res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
    });

    app.get("/api/db/admin/products", (req, res) => {
      if (!requireAdmin(req, res)) return;
      return res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
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
