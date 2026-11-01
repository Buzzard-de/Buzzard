#!/usr/bin/env node
/**
 * Local 3-2-1-1-0 restore proof. Never writes /var/data or production DB.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { proveRestore } = require(path.join(root, "server/lib/survival/proveBackupRestore.js"));

const result = proveRestore();
console.log(
  JSON.stringify(
    {
      ok: result.ok,
      consistent: result.consistent,
      productionTouched: result.productionTouched,
      offsite: result.copies.offsite,
      zeroVerifyErrors: result.copies.verification.zeroVerifyErrors,
      workRoot: result.workRoot,
    },
    null,
    2
  )
);
process.exit(result.ok ? 0 : 1);
