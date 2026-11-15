#!/usr/bin/env node
/**
 * Wrap remaining same-origin fetch() in lib/** client modules with browserFetch.
 * Skips browserFetch.ts itself. Does not expand egress allowlist.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("lib");
const skip = new Set(["security/browserFetch.ts"]);
let changed = 0;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (skip.has(rel)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!/\bfetch\s*\(/.test(src)) continue;
  if (src.includes("from \"@/lib/security/browserFetch\"") || src.includes("from '@/lib/security/browserFetch'")) {
    const next = src.replace(/\bawait fetch\s*\(/g, "await browserFetch(").replace(/(?<!browser)(?<![\w.])fetch\s*\(/g, "browserFetch(");
    if (next !== src) {
      fs.writeFileSync(file, next);
      changed += 1;
    }
    continue;
  }
  const importLine = 'import { browserFetch } from "@/lib/security/browserFetch";\n';
  src = importLine + src.replace(/\bawait fetch\s*\(/g, "await browserFetch(").replace(/(?<!browser)(?<![\w.])fetch\s*\(/g, "browserFetch(");
  fs.writeFileSync(file, src);
  changed += 1;
}

console.log(JSON.stringify({ wrappedFiles: changed }));
