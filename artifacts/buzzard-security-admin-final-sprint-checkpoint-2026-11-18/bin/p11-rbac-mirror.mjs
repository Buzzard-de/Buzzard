import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = process.argv[2];
const { PERMISSIONS } = require(root + "/server/lib/rbac.js");
const nav = await import(root + "/lib/admin/navPermissions.mjs");
const { ADMIN_NAV_GROUPS } = await import(root + "/lib/admin/nav.config.mjs");
const roles = Object.keys(PERMISSIONS);
const all = new Set(Object.values(PERMISSIONS).flat().filter((p) => p !== "*"));
for (const v of Object.values(nav.NAV_SLUG_PERMISSIONS)) all.add(v);
let diffs = 0;
for (const role of roles) {
  const server = (p) => PERMISSIONS[role].includes("*") || PERMISSIONS[role].includes(p);
  for (const p of all) {
    if (server(p) !== nav.canAccess(role, p)) { diffs++; console.log(`DIFF role=${role} permission=${p} server=${server(p)} client=${nav.canAccess(role, p)}`); }
  }
}
console.log("server roles:", roles.join(", "));
const slugs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.slug));
console.log("nav slugs:", slugs.length, "without permission mapping:", slugs.filter((s) => !(s in nav.NAV_SLUG_PERMISSIONS)).join(",") || "none");
console.log("differences:", diffs);
