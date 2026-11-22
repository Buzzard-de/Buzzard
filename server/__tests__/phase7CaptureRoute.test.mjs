import http from "node:http";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("../plugins/paymentsFinancePlugin.js");
const paymentsFinance = require("../lib/paymentsFinance.js");
const { sandboxAuthorize } = require("../lib/commerce/paymentSandbox.js");

function matchRoute(routePath, pathname) {
  const routeParts = routePath.split("/");
  const parts = pathname.split("/");
  if (routeParts.length !== parts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(":")) params[routeParts[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (routeParts[i] !== parts[i]) return null;
  }
  return params;
}

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
      const route = routes.find((entry) => entry.method === req.method && matchRoute(entry.routePath, url.pathname));
      if (!route) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      req.params = matchRoute(route.routePath, url.pathname);
      Promise.resolve(route.handler(req, res)).catch((error) => {
        if (!res.writableEnded) res.status(500).json({ error: error.message });
      });
    });
  });
  plugin.register(app);
  return server;
}

function post(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method: "POST", headers: { "content-type": "application/json", "content-length": 2 } },
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
    req.write("{}");
    req.end();
  });
}

describe("phase 7 payment capture route", () => {
  it("refuses capture and refund over HTTP while sales stay locked", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    delete process.env.BUZZARD_PAYMENTS_FINANCE;
    delete process.env.BUZZARD_WEBHOOK_SECRET_PAYMENT;
    delete process.env.BUZZARD_WEBHOOK_SECRET_PAYOUT;
    delete process.env.BUZZARD_WEBHOOK_SECRET_DISPUTE;
    const sandbox = sandboxAuthorize({ amount: 40, currency: "EUR" });
    expect(sandbox.captured).toBe(false);
    expect(sandbox.live).toBe(false);

    const server = createApp();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    expect(port).not.toBe(3000);
    expect(port).not.toBe(3001);
    try {
      const direct = paymentsFinance.confirmPaymentIntent("pay_test");
      expect(direct.code).toBe("PAYMENT_NOT_LIVE");
      expect(direct.captured).toBe(false);
      expect(direct.realMoneyMovement).toBe(false);

      const capture = await post(port, "/api/payments-finance/intents/pay_test/confirm");
      expect(capture.status).toBe(403);
      expect(capture.body.error).toBe("Admin access required");
      expect(capture.body.captured).toBe(false);
      expect(capture.body.realMoneyMovement).toBe(false);

      const refund = await post(port, "/api/payments-finance/intents/pay_test/refunds");
      expect(refund.status).toBe(403);
      expect(refund.body.error).toBe("Admin access required");
      expect(refund.body.refundIssued).toBeUndefined();
      expect(refund.body.realMoneyMovement).toBe(false);

      const intent = await post(port, "/api/payments-finance/intents");
      expect(intent.status).toBe(403);
      expect(intent.body.error).toBe("Admin access required");

      const invoice = await post(port, "/api/payments-finance/invoices");
      expect(invoice.status).toBe(403);
      expect(invoice.body.error).toBe("Admin access required");

      for (const path of [
        "/api/payments-finance/webhook",
        "/api/payments-finance/provider/payout-webhook",
        "/api/payments-finance/provider/dispute-webhook",
      ]) {
        const webhook = await post(port, path);
        expect(webhook.status, path).toBe(503);
        expect(webhook.body.errorKey, path).toBe("webhook.notConfigured");
        expect(webhook.body.realMoneyMovement, path).toBe(false);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
