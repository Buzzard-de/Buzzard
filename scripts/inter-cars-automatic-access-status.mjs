#!/usr/bin/env node
/**
 * Inter Cars Automatic Access Pack — final status report (metadata only).
 */
import { createRequire } from "node:module";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SALES_ENABLED = "0";

const require = createRequire(import.meta.url);

try {
  const mod = require("../server/lib/supplierInterCarsProductionAccess.bundle.cjs");
  console.log(mod.formatInterCarsAccessStatusReport());
} catch (err) {
  console.error("Bundle unavailable. Run: npm run build:supplier-inter-cars-production-access-bridge");
  console.error(err.message);
  process.exit(1);
}
