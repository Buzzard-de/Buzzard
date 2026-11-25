import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverRoot = fileURLToPath(new URL("..", import.meta.url));

function filesUnder(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(full));
    else if (entry.name.endsWith(".js")) found.push(full);
  }
  return found;
}

describe("route registry", () => {
  it("wraps every registered route in the existing permission handler", () => {
    const server = readFileSync(path.join(serverRoot, "server.js"), "utf8");
    const pushes = server.match(/routes\.push\(/g) || [];
    expect(pushes).toHaveLength(1);
    expect(server).toContain("handler: wrapRouteHandler(method, routePath, handler)");
    const plugins = filesUnder(path.join(serverRoot, "plugins"));
    const bypasses = plugins.filter((file) => readFileSync(file, "utf8").includes("routes.push("));
    expect(bypasses).toEqual([]);
  });
});
