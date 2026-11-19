/**
 * Lists every route the API registers, with its central policy, without
 * opening a listener. Run as a child process with BUZZARD_DATA_DIR and
 * BUZZARD_DB_PATH pointing at a throwaway directory:
 *
 *   node routeInventory.cjs <outFile>
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

for (const name of ["BUZZARD_DATA_DIR", "BUZZARD_DB_PATH"]) {
  const value = process.env[name];
  if (!value || !path.resolve(value).startsWith(fs.realpathSync(os.tmpdir()) + path.sep)) {
    console.error(`[route-inventory] ${name} must point below the OS temp directory`);
    process.exit(64);
  }
}

const serverDir = path.join(__dirname, "..", "..");
const routes = [];
const add = (method) => (routePath) => routes.push({ method, path: routePath });
const app = { get: add("GET"), post: add("POST"), put: add("PUT"), patch: add("PATCH"), delete: add("DELETE") };

const log = console.log;
console.log = () => {};
const pluginDir = path.join(serverDir, "plugins");
for (const file of fs.readdirSync(pluginDir).filter((name) => name.endsWith(".js")).sort()) {
  const before = routes.length;
  const plugin = require(path.join(pluginDir, file));
  if (plugin && typeof plugin.register === "function") plugin.register(app);
  for (let index = before; index < routes.length; index += 1) routes[index].plugin = file;
}
console.log = log;
routes.push({ method: "GET", path: "/api/status", plugin: "server.js" });

const { resolveRoutePermission } = require(path.join(serverDir, "lib", "routePermissions.js"));
for (const route of routes) route.policy = resolveRoutePermission(route.method, route.path);

fs.writeFileSync(process.argv[2], JSON.stringify(routes));
process.exit(0);
