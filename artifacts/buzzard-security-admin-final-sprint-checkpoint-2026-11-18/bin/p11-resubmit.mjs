// Submits the same import request again after it was approved, and once more after that.
import fs from "node:fs";
const api = process.env.BUZZARD_API_URL;
const accounts = JSON.parse(fs.readFileSync(process.env.BUZZARD_SYNTHETIC_ADMINS, "utf8"));
async function login(role) {
  const res = await fetch(`${api}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accounts[role]) });
  return (await res.json()).token;
}
async function call(token, method, route, body) {
  const res = await fetch(`${api}${route}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const shape = (json) => JSON.stringify({ pendingApproval: json?.pendingApproval, executed: json?.executed, dryRun: json?.dryRun, approvalId: json?.approval?.id || json?.approvalId, approvalStatus: json?.approval?.status, importJobId: json?.importJobId, job: json?.job === null ? null : json?.job ? Object.keys(json.job) : undefined, keys: json ? Object.keys(json) : null, validation: json?.validation?.overall, errorKey: json?.errorKey });
const manager = await login("catalog_manager");
const admin = await login("administrator");
const spec = { raw: { sku: "BZ-P11-RESUBMIT" }, dryRun: true };
const first = await call(manager, "POST", "/api/admin/pim-core/import", spec);
console.log("1 submit          ", first.status, shape(first.json));
const again = await call(manager, "POST", "/api/admin/pim-core/import", spec);
console.log("2 same, undecided ", again.status, shape(again.json));
await call(admin, "POST", `/api/admin/approvals/${first.json.approval.id}/decide`, { decision: "approve" });
const afterApproval = await call(manager, "POST", "/api/admin/pim-core/import", spec);
console.log("3 same, approved  ", afterApproval.status, shape(afterApproval.json));
const repeat = await call(manager, "POST", "/api/admin/pim-core/import", spec);
console.log("4 same, once more ", repeat.status, shape(repeat.json));
const other = await call(manager, "POST", "/api/admin/pim-core/import", { raw: { sku: "BZ-P11-RESUBMIT-OTHER" }, dryRun: true });
console.log("5 other request   ", other.status, shape(other.json));
const live = await call(manager, "POST", "/api/admin/pim-core/import", { raw: { sku: "BZ-P11-RESUBMIT" }, dryRun: false });
console.log("6 same, not dry   ", live.status, shape(live.json));
const all = await call(admin, "GET", "/api/admin/approvals");
console.log("approvals:", (all.json.approvals || []).map((entry) => `${entry.id.slice(-6)} ${entry.status} consumed=${entry.metadata?.consumed} dryRun=${entry.metadata?.spec?.dryRun ?? entry.metadata?.spec?.payload?.dryRun}`).join(" | "));
const products = await call(admin, "GET", "/api/admin/pim-core/products");
console.log("sku present:", JSON.stringify(products.json).includes("BZ-P11-RESUBMIT"));
