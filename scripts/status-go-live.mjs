#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const r = spawnSync("node", ["scripts/external-access-control-center-cli.mjs", "go-live"], { stdio: "inherit" });
process.exit(r.status ?? 1);
