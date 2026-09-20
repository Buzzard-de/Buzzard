#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
execSync("node scripts/build-render-operator-assistant-bridge.mjs", { cwd: root, stdio: "pipe" });
const require = createRequire(import.meta.url);
const mod = require("../server/lib/renderOperatorAssistant.bundle.cjs");
const md = mod.buildRenderPersistentDiskOperatorGuideMarkdown();
const out = path.join(root, "docs/BUZZARD_RENDER_PERSISTENT_DISK_OPERATOR_GUIDE.md");
fs.writeFileSync(out, md, "utf8");
console.log(`Wrote ${out}`);
