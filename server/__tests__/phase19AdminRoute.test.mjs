import { describe, expect, it } from "vitest";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { login } = require("../lib/auth.js");
const plugin = require("../plugins/commercialIntegrationsPlugin.js");

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
    const route = routes.find((entry) => entry.method === req.method && entry.routePath === url.pathname);
    res.status = function status(code) {
      this.statusCode = code;
      return this;
    };
    res.json = function json(body) {
      const data = JSON.stringify(body || {});
      this.writeHead(this.statusCode || 200, { "content-type": "application/json" });
      this.end(data);
    };
    if (!route) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    route.handler(req, res);
  });
  plugin.register(app);
  return server;
}

function get(port, token) {
  return new Promise((resolve, reject) => {
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/admin/integrations", method: "GET", headers },
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
    req.end();
  });
}

describe("phase 19 admin integration route", () => {
  it("denies an anonymous caller and a non-admin, then shows sales locked to an administrator", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const seed = require(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/buzzard_admin_users.seed.json"));
    const admin = seed.find((user) => user.role === "administrator");
    const staff = seed.find((user) => user.role === "catalog_manager");
    const server = createApp();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    expect(port).not.toBe(3000);
    expect(port).not.toBe(3001);
    try {
      const anonymous = await get(port);
      expect(anonymous.status).toBe(401);

      const staffLogin = login(staff.email, staff.password);
      expect(staffLogin.success).toBe(true);
      expect(staffLogin.token).toEqual(expect.any(String));
      const denied = await get(port, staffLogin.token);
      expect(denied.status).toBe(403);

      const adminLogin = login(admin.email, admin.password);
      expect(adminLogin.success).toBe(true);
      const allowed = await get(port, adminLogin.token);
      expect(allowed.status).toBe(200);
      expect(allowed.body.salesEnabled).toBe(false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
