// Authorization sweep against an isolated API. Prints no tokens or credentials.
const fs = require("fs");
const [api, routesFile, credsFile, outFile] = process.argv.slice(2);
const routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
const creds = JSON.parse(fs.readFileSync(credsFile, "utf8"));
const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const url = (p) => api + p.split("/").map((s) => (s.startsWith(":") ? "x1" : s)).join("/");
async function call(route, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const init = { method: route.method, headers };
  if (WRITE.has(route.method)) { headers["Content-Type"] = "application/json"; init.body = "{}"; }
  try {
    const res = await fetch(url(route.path), init);
    let key = null;
    try { const j = await res.json(); key = j.errorKey || j.code || j.error || null; } catch {}
    return { status: res.status, key: typeof key === "string" ? key.slice(0, 60) : null };
  } catch (e) { return { status: 0, key: String(e.cause?.code || e.message).slice(0, 40) }; }
}
async function login(role) {
  const res = await fetch(api + "/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds[role]) });
  const j = await res.json();
  if (!j.token) throw new Error("login failed for " + role + " " + res.status);
  return j.token;
}
(async () => {
  const roles = (process.env.SWEEP_ROLES || "read_only,catalog_manager,order_manager").split(",");
  const tokens = {};
  for (const r of roles) tokens[r] = await login(r);
  const rows = [];
  for (const route of routes) {
    if (route.path === "/api/admin/logout" || route.path === "/api/admin/login") continue;
    const row = { ...route, anon: await call(route, null) };
    const protectedRoute = row.anon.status === 401 || row.anon.status === 403;
    if (protectedRoute || route.path.startsWith("/api/admin/") || route.path.startsWith("/api/security/admin")) {
      for (const r of roles) row[r] = await call(route, tokens[r]);
    }
    rows.push(row);
  }
  fs.writeFileSync(outFile, JSON.stringify(rows, null, 1));
  const anonOpen = rows.filter((r) => r.anon.status !== 401 && r.anon.status !== 403);
  console.log("routes swept:", rows.length, "| anonymous not rejected (public or own handling):", anonOpen.length);
  const adminOpen = anonOpen.filter((r) => r.path.startsWith("/api/admin/") || r.path.startsWith("/api/security/admin"));
  console.log("ANON reaches /api/admin or /api/security/admin:", adminOpen.map((r) => `${r.method} ${r.path} -> ${r.anon.status}`));
})().catch((e) => { console.error("sweep failed:", e.message); process.exit(1); });
