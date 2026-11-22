import { describe, expect, it } from "vitest";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const plugin = require("../plugins/ordersPlugin.js");

function createApp() {
  const routes = [];
  const app = {
    get(routePath, handler) {
      routes.push({ method: "GET", routePath, handler });
    },
    post(routePath, handler) {
      routes.push({ method: "POST", routePath, handler });
    },
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      req.body = text ? JSON.parse(text) : {};
      res.status = function status(code) {
        this.statusCode = code;
        return this;
      };
      res.json = function json(body) {
        const data = JSON.stringify(body || {});
        this.writeHead(this.statusCode || 200, { "content-type": "application/json" });
        this.end(data);
      };
      const route = routes.find((entry) => entry.method === req.method && entry.routePath === url.pathname);
      if (!route) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      Promise.resolve(route.handler(req, res)).catch((error) => {
        if (!res.writableEnded) res.status(500).json({ error: error.message, live: false });
      });
    });
  });
  plugin.register(app);
  return server;
}

function post(port, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/orders/dry-rehearsal",
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : {} });
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

describe("phase 6 dry order rehearsal route", () => {
  it("returns a non-live rehearsal for a fixture SKU while sales stay locked", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const server = createApp();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    expect(port).not.toBe(3000);
    expect(port).not.toBe(3001);
    try {
      const response = await post(port, {
        rehearsalCatalogBypass: true,
        customer: { email: "dry-rehearsal@example.com" },
        acceptTerms: true,
        acceptPrivacy: true,
        shippingAddress: { country: "DE" },
        lines: [{ sku: "DRY-SKU-001", qty: 1, unitPrice: 40, title: "Bremsbelag Set Vorderachse" }],
      });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rehearsal).toBe(true);
      expect(response.body.live).toBe(false);
      expect(response.body.result.ok).toBe(true);
      expect(response.body.result.live).not.toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
