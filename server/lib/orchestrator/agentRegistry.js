const { INTENTS } = require("./constants");

const AGENTS = Object.freeze({
  product: {
    id: "product",
    name: "Product Assistant",
    intents: [INTENTS.SEARCH_PRODUCT, INTENTS.PRODUCT_INFORMATION, INTENTS.VEHICLE_LOOKUP],
  },
  pricing: {
    id: "pricing",
    name: "Price Assistant",
    intents: [INTENTS.PRICE_CHECK],
  },
  stock: {
    id: "stock",
    name: "Stock Assistant",
    intents: [INTENTS.STOCK_CHECK],
  },
  order: {
    id: "order",
    name: "Order Assistant",
    intents: [INTENTS.ORDER_STATUS, INTENTS.ORDER_CREATE, INTENTS.ORDER_CANCEL, INTENTS.DELIVERY_STATUS],
  },
  customer: {
    id: "customer",
    name: "Customer Assistant",
    intents: [INTENTS.CUSTOMER_SUPPORT, INTENTS.ACCOUNT_QUERY, INTENTS.ADD_TO_CART, INTENTS.REMOVE_FROM_CART],
  },
  returns: {
    id: "returns",
    name: "Returns Assistant",
    intents: [INTENTS.RETURN_REQUEST, INTENTS.REFUND_STATUS],
  },
  supplier: {
    id: "supplier",
    name: "Supplier Assistant",
    intents: [INTENTS.SUPPLIER_QUERY],
  },
  marketplace: {
    id: "marketplace",
    name: "Marketplace Assistant",
    intents: [INTENTS.MARKETPLACE_QUERY],
  },
  category: {
    id: "category",
    name: "Category Assistant",
    intents: [INTENTS.CATEGORY_QUERY],
  },
  sales: {
    id: "sales",
    name: "Sales Analysis Assistant",
    intents: [INTENTS.PAYMENT_QUERY],
  },
  support: {
    id: "support",
    name: "Support Assistant",
    intents: [INTENTS.COMPLAINT, INTENTS.HUMAN_AGENT_REQUEST, INTENTS.GENERAL_QUERY],
  },
  research: {
    id: "research",
    name: "Research Assistant",
    intents: [],
  },
  seo: {
    id: "seo",
    name: "SEO Assistant",
    intents: [],
  },
  customs: {
    id: "customs",
    name: "Customs Assistant",
    intents: [],
  },
  security: {
    id: "esat_bey",
    name: "Esat Bey",
    role: "AI SECURITY / GUARD",
    intents: [INTENTS.SECURITY_EVENT, INTENTS.APPROVAL_REQUIRED, INTENTS.PHONE_CALL_REQUEST],
  },
});

function listAgents() {
  return Object.values(AGENTS);
}

function routeAgent(intent, { risk } = {}) {
  if (risk === "CRITICAL" || intent === INTENTS.SECURITY_EVENT) {
    return AGENTS.security;
  }
  const match = listAgents().find((agent) => agent.intents.includes(intent));
  return match || AGENTS.support;
}

module.exports = {
  AGENTS,
  listAgents,
  routeAgent,
};
