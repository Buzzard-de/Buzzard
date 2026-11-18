import fs from "node:fs";
const api = process.env.BUZZARD_API_URL;
const creds = JSON.parse(fs.readFileSync(process.env.BUZZARD_SYNTHETIC_ADMINS, "utf8"));
async function login(role) {
  const r = await fetch(`${api}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds[role]) });
  return (await r.json()).token;
}
const mask = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "string" && /@/.test(v) ? "<email>" : v)));
for (const role of ["administrator", "catalog_manager", "admin", "read_only"]) {
  const token = await login(role);
  const r = await fetch(`${api}/api/admin/pim-core/import`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ raw: { sku: "BZ-IMPORT-DRY-001" }, dryRun: true }) });
  const body = await r.json();
  console.log(role, r.status, JSON.stringify(mask(body)).slice(0, 900));
  if (role === "administrator" && body.approval?.id) {
    const d = await fetch(`${api}/api/admin/approvals/${body.approval.id}/decide`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision: "approve" }) });
    console.log("  decide ->", d.status, JSON.stringify(mask(await d.json())).slice(0, 700));
    const list = await fetch(`${api}/api/admin/pim-core/products`, { headers: { Authorization: `Bearer ${token}` } });
    const products = (await list.json()).products || [];
    console.log("  products after approval:", products.length, products.some((p) => p.sku === "BZ-IMPORT-DRY-001") ? "IMPORTED" : "not imported");
  }
}
