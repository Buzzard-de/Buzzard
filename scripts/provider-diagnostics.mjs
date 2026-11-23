import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../server/package.json"));
const { isSalesEnabled } = require("./lib/salesMode");
const { inventory } = require("./lib/externalIntegrations");

const report = {
  salesEnabled: isSalesEnabled(),
  productionReady: false,
  network: false,
  ...inventory(),
};
console.log(JSON.stringify(report));
