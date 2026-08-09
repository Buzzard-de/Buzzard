#!/usr/bin/env node
/**
 * Start Next.js frontend and Buzzard API together for local development.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

console.log("Starting Buzzard local stack…");
console.log("  Frontend → http://localhost:3000");
console.log("  API      → http://localhost:3001/api/health");
console.log("  Admin    → http://localhost:3000/admin/");
console.log("Press Ctrl+C to stop both.\n");

const api = run("api", "npm", ["run", "dev:api"], root);
const web = run("web", "npm", ["run", "dev"], root);

function shutdown() {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
