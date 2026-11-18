const rows = require("/tmp/buzzard-final-sprint/sweep-p5.json");
const { can } = require("/tmp/buzzard-final-sprint/work/server/lib/rbac.js");
const W = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ROLES = ["administrator", "admin", "catalog_manager", "order_manager", "staff", "ai_agent", "read_only"];
const key = (r) => `${r.method} ${r.path}`;
const hist = (list, f) => JSON.stringify(list.reduce((m, x) => { const s = f(x); m[s] = (m[s] || 0) + 1; return m; }, {}));
console.log("anon:", hist(rows, (r) => r.anon.status));
const guarded = rows.filter((r) => r.policy && !r.policy.public);
console.log("guarded:", guarded.length, "anon:", hist(guarded, (r) => r.anon.status));
let mismatches = [];
for (const r of guarded) {
  for (const role of ROLES) {
    if (!r[role]) { mismatches.push(`${key(r)} ${role} not swept`); continue; }
    const allowed = r.policy.permission ? can(role, r.policy.permission) : true;
    const st = r[role].status;
    if (allowed && (st === 401 || st === 403)) mismatches.push(`ALLOWED-BUT-REJECTED ${key(r)} ${role} ${st} ${r[role].key} [${r.policy.permission || "auth"}]`);
    if (!allowed && st !== 403) mismatches.push(`DENIED-BUT ${key(r)} ${role} ${st} ${r[role].key}`);
  }
}
console.log("policy mismatches:", mismatches.length); for (const m of mismatches) console.log("  ", m);
const roWrites = guarded.filter((r) => W.has(r.method) && r.read_only && r.read_only.status !== 403 && r.read_only.status !== 401);
console.log("read_only reaches write-method routes:", roWrites.length); for (const r of roWrites) console.log("  ", key(r), r.read_only.status, r.policy.permission || "auth");
const errs = rows.filter((r) => [r.anon, ...ROLES.map((x) => r[x])].some((c) => c && (c.status >= 500 || c.status === 0)));
console.log("5xx/0:", errs.length); for (const r of errs) console.log("  ", key(r), JSON.stringify(Object.fromEntries(["anon", ...ROLES].filter((x) => r[x] && (r[x].status >= 500 || r[x].status === 0)).map((x) => [x, r[x].status + ":" + r[x].key]))));
const open = rows.filter((r) => !(r.policy && !r.policy.public));
const openW = open.filter((r) => W.has(r.method));
console.log("no admin policy:", open.length, "writes:", openW.length, "anon on writes:", hist(openW, (r) => r.anon.status));
if (process.argv[2] === "writes") for (const r of openW) console.log("  ", key(r).padEnd(62), r.anon.status, r.anon.key || "", "|", r.plugin);
if (process.argv[2] === "reads") for (const r of open.filter((r) => !W.has(r.method))) console.log("  ", key(r).padEnd(62), r.anon.status, r.anon.key || "", "|", r.plugin);
