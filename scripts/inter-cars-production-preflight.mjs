#!/usr/bin/env node
/**
 * Inter Cars production preflight — dry-run only, never sends CreateOrder.
 * Alias for supplier-inter-cars-production-access-preflight per access pack spec.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "supplier-inter-cars-production-access-preflight.mjs");
const result = spawnSync(process.execPath, [script], { stdio: "inherit", env: { ...process.env } });
process.exit(result.status ?? 1);
