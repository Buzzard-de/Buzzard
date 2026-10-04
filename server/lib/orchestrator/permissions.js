const { RISK } = require("./constants");

const TOOL_PERMISSIONS = Object.freeze({
  searchProducts: { permission: "READ_PRODUCT", risk: RISK.LOW, approval: false },
  getProduct: { permission: "READ_PRODUCT", risk: RISK.LOW, approval: false },
  getVehicleCompatibility: { permission: "READ_PRODUCT", risk: RISK.LOW, approval: false },
  getPrice: { permission: "READ_PRICE", risk: RISK.LOW, approval: false },
  getStock: { permission: "READ_STOCK", risk: RISK.LOW, approval: false },
  getSupplierOffer: { permission: "READ_PRODUCT", risk: RISK.MEDIUM, approval: false },
  createCartItem: { permission: "ADD_CART", risk: RISK.MEDIUM, approval: false },
  createOrder: { permission: "CREATE_ORDER", risk: RISK.HIGH, approval: true },
  cancelOrder: { permission: "CANCEL_ORDER", risk: RISK.HIGH, approval: true },
  getOrderStatus: { permission: "READ_ORDER", risk: RISK.LOW, approval: false },
  createReturn: { permission: "RETURN", risk: RISK.HIGH, approval: true },
  requestRefund: { permission: "REFUND", risk: RISK.CRITICAL, approval: true },
  supplierPayment: { permission: "SUPPLIER_PAYMENT", risk: RISK.CRITICAL, approval: true },
  purchaseSupplierStock: { permission: "STOCK_PURCHASE", risk: RISK.CRITICAL, approval: true },
  sendEmail: { permission: "NOTIFY", risk: RISK.MEDIUM, approval: false },
  sendNotification: { permission: "NOTIFY", risk: RISK.LOW, approval: false },
  initiatePhoneCall: { permission: "PHONE_CALL", risk: RISK.HIGH, approval: true },
  changeAccountSecurity: { permission: "ACCOUNT_SECURITY", risk: RISK.CRITICAL, approval: true },
});

const DEFAULT_GRANTS = Object.freeze([
  "READ_PRODUCT",
  "READ_PRICE",
  "READ_STOCK",
  "READ_ORDER",
  "NOTIFY",
  "ADD_CART",
]);

function canUseTool(toolName, grants = DEFAULT_GRANTS) {
  const meta = TOOL_PERMISSIONS[toolName];
  if (!meta) return { allowed: false, reason: "UNKNOWN_TOOL" };
  if (grants.includes("*")) return { allowed: true, ...meta };
  if (!grants.includes(meta.permission)) {
    return { allowed: false, reason: "PERMISSION_DENIED", ...meta };
  }
  return { allowed: true, ...meta };
}

function isAutonomousForbidden(toolName) {
  return ["requestRefund", "supplierPayment", "purchaseSupplierStock", "changeAccountSecurity"].includes(
    toolName
  );
}

module.exports = {
  TOOL_PERMISSIONS,
  DEFAULT_GRANTS,
  canUseTool,
  isAutonomousForbidden,
};
