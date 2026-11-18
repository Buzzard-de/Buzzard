// What exists after an import request was approved: approval record, job queue, products.
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
const manager = await login("catalog_manager");
const admin = await login("administrator");
const productsBefore = (await call(admin, "GET", "/api/admin/pim-core/products")).json;
const jobsBefore = (await call(admin, "GET", "/api/admin/automation/jobs")).json;
const submitted = await call(manager, "POST", "/api/admin/pim-core/import", { raw: { sku: "BZ-P11-AFTER-APPROVAL" }, dryRun: true });
console.log("submit", submitted.status, JSON.stringify({ pendingApproval: submitted.json.pendingApproval, executed: submitted.json.executed, job: submitted.json.job, consumed: submitted.json.approval?.metadata?.consumed }));
const decided = await call(admin, "POST", `/api/admin/approvals/${submitted.json.approval.id}/decide`, { decision: "approve" });
console.log("decide", decided.status, JSON.stringify(decided.json).slice(0, 400));
await new Promise((resolve) => setTimeout(resolve, 3000));
for (const status of ["APPROVED", "PENDING", ""]) {
  const list = await call(admin, "GET", `/api/admin/approvals${status ? `?status=${status}` : ""}`);
  const mine = (list.json.approvals || []).find((entry) => entry.id === submitted.json.approval.id);
  console.log(`approvals ${status || "(all)"}:`, list.status, mine ? JSON.stringify({ status: mine.status, consumed: mine.metadata?.consumed, decidedBy: Boolean(mine.decidedBy || mine.decided_by) }) : "not listed");
}
const jobsAfter = (await call(admin, "GET", "/api/admin/automation/jobs")).json;
console.log("jobs before/after:", (jobsBefore.jobs || []).length, (jobsAfter.jobs || []).length, JSON.stringify((jobsAfter.jobs || []).filter((job) => !(jobsBefore.jobs || []).some((old) => old.id === job.id)).map((job) => ({ id: job.id, jobType: job.jobType, status: job.status }))));
const reserved = await call(admin, "GET", `/api/admin/automation/jobs/${submitted.json.approval.metadata.jobId}`);
console.log("reserved job id:", reserved.status, reserved.json?.job ? JSON.stringify({ status: reserved.json.job.status, jobType: reserved.json.job.jobType }) : "");
const worker = await call(admin, "GET", "/api/admin/automation/worker");
console.log("worker:", worker.status, JSON.stringify(worker.json).slice(0, 200));
const productsAfter = (await call(admin, "GET", "/api/admin/pim-core/products")).json;
console.log("products unchanged:", JSON.stringify(productsBefore) === JSON.stringify(productsAfter), "| imported sku present:", JSON.stringify(productsAfter).includes("BZ-P11-AFTER-APPROVAL"));
