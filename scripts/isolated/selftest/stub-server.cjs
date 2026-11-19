#!/usr/bin/env node
/**
 * Stand-ins for the isolation self-test. No real data, no real application.
 *
 *   node stub-server.cjs api <port> <mode>          mode: isolated | shared | nonsense
 *   node stub-server.cjs storefront <port> <apiUrl>
 *
 * "api" answers /api/health like an API on throwaway storage (isolated), like
 * the developer API (shared) or with something that is not a health report.
 * It counts every request other than GET /api/health in <port>.writes below
 * the directory named by STUB_STATE_DIR: the self-test expects that count to
 * stay at zero.
 *
 * "storefront" serves a login page with the same form as the admin login,
 * which posts to <apiUrl>.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const [kind, portArg, option] = process.argv.slice(2);
const port = Number(portArg);
const stateDir = process.env.STUB_STATE_DIR || os.tmpdir();

function listen(handler) {
  http.createServer(handler).listen(port, "127.0.0.1", () => console.log(`[stub ${kind}] 127.0.0.1:${port}`));
}

if (kind === "api") {
  const writes = path.join(stateDir, `${port}.writes`);
  fs.writeFileSync(writes, "0");
  listen((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" });
      return res.end();
    }
    if (req.method === "GET" && req.url === "/api/health") {
      if (option === "nonsense") {
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end("<html>not a health report</html>");
      }
      const isolated = option === "isolated";
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: true,
          database: { path: isolated ? path.join(os.tmpdir(), "stub", "catalog.sqlite") : "/srv/app/server/data/buzzard.db" },
          adminData: isolated ? { mode: "custom_path", isolated: true } : undefined,
        })
      );
    }
    fs.writeFileSync(writes, String(Number(fs.readFileSync(writes, "utf8")) + 1));
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end("{}");
  });
} else if (kind === "storefront") {
  const page = `<!doctype html><html><body>
<form class="admin-login-card">
  <input id="email" type="email"><input id="password" type="password">
  <button type="submit">Anmelden</button>
</form>
<script>
  document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    fetch(${JSON.stringify(option)} + "/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
  });
</script></body></html>`;
  listen((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page);
  });
} else {
  console.error("usage: stub-server.cjs api <port> <isolated|shared|nonsense> | storefront <port> <apiUrl>");
  process.exit(64);
}
