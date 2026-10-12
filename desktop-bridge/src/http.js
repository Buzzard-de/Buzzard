const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

const MAX_BODY = 256 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Request body too large"), { code: "BODY_TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { code: "JSON_INVALID" }));
      }
    });
    req.on("error", reject);
  });
}

function createServer(engine, options = {}) {
  const token = options.token || crypto.randomBytes(24).toString("hex");
  const host = options.host || "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Desktop bridge HTTP must bind to loopback");
  }
  const uiFile = path.join(__dirname, "ui.html");

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}`);
    if (url.pathname === "/health") {
      return json(res, 200, { ok: true, bind: host, authenticated: false, service: "buzzard-desktop-bridge" });
    }
    const provided = req.headers["x-bridge-token"] || url.searchParams.get("token") || "";
    if (provided !== token) {
      return json(res, 401, { error: "Unauthorized", code: "BRIDGE_UNAUTHORIZED" });
    }
    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/ui")) {
        const html = fs.readFileSync(uiFile, "utf8").replaceAll("__BRIDGE_TOKEN__", token);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(html);
      }
      if (req.method === "GET" && url.pathname === "/api/snapshot") {
        return json(res, 200, engine.snapshot());
      }
      if (req.method === "GET" && url.pathname === "/api/audit") {
        return json(res, 200, { events: engine.auditLog(200) });
      }
      if (req.method === "POST" && url.pathname === "/api/workspace") {
        const body = await readBody(req);
        return json(res, 200, { path: engine.addWorkspaceRoot(body.path) });
      }
      if (req.method === "POST" && url.pathname === "/api/tasks") {
        const body = await readBody(req);
        return json(res, 201, engine.createTask(body));
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/tasks/") && url.pathname.endsWith("/export")) {
        const id = url.pathname.split("/")[3];
        return json(res, 200, engine.exportTask(id));
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/tasks/") && url.pathname.endsWith("/transition")) {
        const id = url.pathname.split("/")[3];
        const body = await readBody(req);
        return json(res, 200, engine.transition(id, body.status, body));
      }
      if (req.method === "POST" && url.pathname === "/api/reports") {
        const body = await readBody(req);
        return json(res, 200, engine.importReport(body.path || body.report || body));
      }
      json(res, 404, { error: "Not found" });
    } catch (error) {
      json(res, error.code === "BRIDGE_UNAUTHORIZED" ? 401 : 400, {
        error: error.message,
        code: error.code || "BRIDGE_ERROR",
      });
    }
  });

  return { server, token, host };
}

module.exports = { createServer };
