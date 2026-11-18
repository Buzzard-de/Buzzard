// Asks the isolated API, per role, for the routes the admin pages were refused on.
const api = process.env.BUZZARD_API_URL;
const accounts = JSON.parse((await import("node:fs")).readFileSync(process.env.BUZZARD_SYNTHETIC_ADMINS, "utf8"));
const routes = process.argv.slice(2);
for (const role of Object.keys(accounts)) {
  const login = await fetch(`${api}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accounts[role]) });
  const token = (await login.json()).token;
  const row = [];
  for (const route of routes) {
    const res = await fetch(`${api}${route}`, { headers: { Authorization: `Bearer ${token}` } });
    let key = "";
    try { const body = await res.json(); key = body.errorKey || body.error || ""; } catch {}
    row.push(`${res.status}${key ? ` ${key}` : ""}`);
  }
  console.log(role.padEnd(16), row.join(" | "));
}
