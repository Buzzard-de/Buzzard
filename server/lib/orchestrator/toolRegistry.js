const { TOOL_PERMISSIONS } = require("./permissions");

const TOOLS = Object.freeze({
  searchProducts: {
    name: "searchProducts",
    description: "Search the catalog via Product Engine",
    inputSchema: { q: "string" },
    outputSchema: { items: "array" },
    engine: "product",
  },
  getProduct: {
    name: "getProduct",
    description: "Read a product from Product Engine",
    inputSchema: { id: "string" },
    outputSchema: { product: "object" },
    engine: "product",
  },
  getVehicleCompatibility: {
    name: "getVehicleCompatibility",
    description: "Lookup vehicle / TecDoc compatibility",
    inputSchema: { query: "string" },
    outputSchema: { vehicles: "array" },
    engine: "product",
  },
  getPrice: {
    name: "getPrice",
    description: "Quote price from Pricing Engine only",
    inputSchema: { productId: "string" },
    outputSchema: { quote: "object" },
    engine: "pricing",
  },
  getStock: {
    name: "getStock",
    description: "Read stock from Inventory Engine only",
    inputSchema: { productId: "string" },
    outputSchema: { inventory: "object" },
    engine: "inventory",
  },
  getSupplierOffer: {
    name: "getSupplierOffer",
    description: "Read supplier offer; never purchase stock",
    inputSchema: { sku: "string" },
    outputSchema: { offers: "array" },
    engine: "supplier",
  },
  createCartItem: {
    name: "createCartItem",
    description: "Add an item to the customer cart",
    inputSchema: { productId: "string", qty: "number" },
    outputSchema: { cart: "object" },
    engine: "cart",
  },
  createOrder: {
    name: "createOrder",
    description: "Create order via Order Engine — high risk",
    inputSchema: { cartId: "string" },
    outputSchema: { order: "object" },
    engine: "order",
  },
  cancelOrder: {
    name: "cancelOrder",
    description: "Cancel via Order Engine — high risk",
    inputSchema: { orderId: "string" },
    outputSchema: { status: "string" },
    engine: "order",
  },
  getOrderStatus: {
    name: "getOrderStatus",
    description: "Read order status from Order Engine",
    inputSchema: { orderId: "string" },
    outputSchema: { status: "string" },
    engine: "order",
  },
  createReturn: {
    name: "createReturn",
    description: "Open a return via Returns Engine",
    inputSchema: { orderId: "string" },
    outputSchema: { rma: "object" },
    engine: "returns",
  },
  requestRefund: {
    name: "requestRefund",
    description: "Refund — never autonomous",
    inputSchema: { orderId: "string" },
    outputSchema: { approval: "object" },
    engine: "returns",
  },
  sendEmail: {
    name: "sendEmail",
    description: "Queue a notification email",
    inputSchema: { to: "string", template: "string" },
    outputSchema: { queued: "boolean" },
    engine: "notify",
  },
  sendNotification: {
    name: "sendNotification",
    description: "Internal notification",
    inputSchema: { message: "string" },
    outputSchema: { queued: "boolean" },
    engine: "notify",
  },
  initiatePhoneCall: {
    name: "initiatePhoneCall",
    description: "Outbound call via telephony provider",
    inputSchema: { to: "string" },
    outputSchema: { call: "object" },
    engine: "telephony",
  },
  purchaseSupplierStock: {
    name: "purchaseSupplierStock",
    description: "Blocked unless customer order exists",
    inputSchema: { sku: "string" },
    outputSchema: { blocked: "boolean" },
    engine: "supplier",
  },
});

function getTool(name) {
  const tool = TOOLS[name];
  if (!tool) return null;
  return { ...tool, ...TOOL_PERMISSIONS[name] };
}

function listTools() {
  return Object.keys(TOOLS).map(getTool);
}

function validateToolInput(name, input = {}) {
  const tool = getTool(name);
  if (!tool) return { ok: false, code: "UNKNOWN_TOOL" };
  const required = Object.keys(tool.inputSchema);
  for (const key of required) {
    if (input[key] == null || input[key] === "") {
      return { ok: false, code: "INVALID_SCHEMA", field: key };
    }
  }
  return { ok: true, tool };
}

function toolsForIntent(intent) {
  const map = {
    SEARCH_PRODUCT: ["searchProducts", "getVehicleCompatibility", "getStock", "getPrice"],
    PRODUCT_INFORMATION: ["getProduct", "getPrice", "getStock"],
    PRICE_CHECK: ["getPrice"],
    STOCK_CHECK: ["getStock"],
    VEHICLE_LOOKUP: ["getVehicleCompatibility", "searchProducts"],
    ORDER_STATUS: ["getOrderStatus"],
    DELIVERY_STATUS: ["getOrderStatus"],
    ORDER_CANCEL: ["cancelOrder"],
    ORDER_CREATE: ["createOrder"],
    RETURN_REQUEST: ["createReturn"],
    REFUND_STATUS: ["requestRefund"],
    ADD_TO_CART: ["createCartItem"],
    PHONE_CALL_REQUEST: ["initiatePhoneCall"],
    SUPPLIER_QUERY: ["getSupplierOffer"],
  };
  return map[intent] || [];
}

module.exports = {
  TOOLS,
  getTool,
  listTools,
  validateToolInput,
  toolsForIntent,
};
