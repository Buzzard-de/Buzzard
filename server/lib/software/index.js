/**
 * Read-only facade over engines that already exist.
 * It does not queue work, decide approvals, or enable sales.
 */
function status() {
  const { isSalesEnabled } = require("../salesMode");
  const product = require("../productSot").getStatus();
  return {
    role: "facade",
    orchestrator: false,
    decides: false,
    salesEnabled: isSalesEnabled(),
    productionReady: false,
    product: { target: product.target, active: product.active === true },
    engines: ["productCore", "orderService", "pricing", "supplier", "market"],
  };
}

module.exports = { status };
