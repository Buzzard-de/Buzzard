/**
 * Paths below are copied from official documents fetched for this adapter.
 * A missing operation is omitted on purpose. No placeholder URL is invented.
 */

const MIRAKL_ORDER = Object.freeze({
  WAITING_ACCEPTANCE: "PENDING",
  SHIPPING: "PROCESSING",
  SHIPPED: "SHIPPED",
  RECEIVED: "DELIVERED",
  REFUSED: "CANCELLED",
  CANCELED: "CANCELLED",
  CLOSED: "CLOSED",
});

const MANOMANO_ORDER = Object.freeze({
  WAITING_PAYMENT: "AWAITING_PAYMENT",
  PENDING: "PENDING",
  REFUSED: "REFUSED",
  PREPARATION: "PROCESSING",
  SHIPPED: "SHIPPED",
  REFUNDED: "REFUNDED",
  REFUNDING: "REFUNDING",
});

const FAMILIES = Object.freeze({
  mirakl: {
    auth: "shop-api-key",
    source: "https://developer.mirakl.com/content/product/mmp/rest/seller/openapi3/offers/of24",
    limits: { offers: 1, orders: 20, products: 1 },
    orderStatus: MIRAKL_ORDER,
    operations: {
      readOrders: { method: "GET", path: "/api/orders" },
      updateOffer: { method: "POST", path: "/api/offers" },
      importProducts: { method: "POST", path: "/api/products/imports" },
      updateTracking: { method: "PUT", path: "/api/orders/{orderId}/tracking" },
      shipOrder: { method: "PUT", path: "/api/orders/{orderId}/ship" },
      cancelOrder: { method: "PUT", path: "/api/orders/{orderId}/cancel" },
      refund: { method: "PUT", path: "/api/orders/refund" },
    },
  },
  etsy: {
    auth: "oauth-and-api-key",
    source: "https://developers.etsy.com/documentation/essentials/urlsyntax/",
    baseUrl: "https://api.etsy.com",
    limits: { write: 10 },
    operations: {
      createListing: { method: "POST", path: "/v3/application/shops/{shopId}/listings" },
      updateListing: { method: "PATCH", path: "/v3/application/shops/{shopId}/listings/{listingId}" },
      updateInventory: { method: "PUT", path: "/v3/application/listings/{listingId}/inventory" },
      readOrders: { method: "GET", path: "/v3/application/shops/{shopId}/receipts" },
    },
    unsupported: {
      uploadImage: "IMAGE_ENDPOINT_NOT_CAPTURED",
      updateTracking: "TRACKING_PATH_NOT_CAPTURED",
      cancelOrder: "NOT_IN_CAPTURED_DOC",
      refund: "NOT_IN_CAPTURED_DOC",
    },
  },
  backmarket: {
    auth: "basic-token",
    source: "https://api.backmarket.dev/",
    hosts: {
      stage: "https://preprod.backmarket.fr",
      production: "https://www.backmarket.fr",
    },
    limits: { write: 10 },
    operations: {
      upsertListing: { method: "POST", path: "/ws/listings" },
      readOrders: { method: "GET", path: "/ws/orders" },
      updateOrder: { method: "POST", path: "/ws/orders/{orderId}" },
    },
    unsupported: {
      refund: "CARE_API_PATH_NOT_CAPTURED",
    },
  },
  manomano: {
    auth: "x-api-key",
    source: "https://partnersapi.manomano.com",
    hosts: {
      stage: "https://partnersapi.sandbox.manomano.com",
      production: "https://partnersapi.manomano.com",
    },
    limits: { write: 3 },
    orderStatus: MANOMANO_ORDER,
    operations: {
      readOrders: { method: "GET", path: "/orders/v1/orders" },
      readOrder: { method: "GET", path: "/orders/v1/orders/{orderReference}" },
      acceptOrders: { method: "POST", path: "/orders/v1/accept-orders" },
      refuseOrders: { method: "POST", path: "/orders/v1/refuse-orders" },
      createShipment: { method: "POST", path: "/orders/v1/shippings" },
      refund: { method: "POST", path: "/orders/v1/refunds" },
      readOffers: { method: "GET", path: "/api/v1/offer-information/offers" },
    },
    unsupported: {
      updateOffer: "OFFER_UPDATE_PATH_NOT_CAPTURED",
      createProduct: "PRODUCT_CREATE_PATH_NOT_CAPTURED",
    },
  },
  vinted: {
    auth: "hmac-sha256",
    source: "https://pro-docs.svc.vinted.com/",
    hosts: {
      stage: "https://pro-public-sandbox.svc.vinted.com",
      production: "https://pro.svc.vinted.com",
    },
    limits: { write: 10 },
    operations: {
      createItems: { method: "POST", path: "/api/v1/items" },
      updateItems: { method: "PUT", path: "/api/v1/items" },
      readOrders: { method: "GET", path: "/api/v1/orders" },
      cancelOrder: { method: "POST", path: "/api/v1/orders/{orderId}/cancel" },
      readShipment: { method: "GET", path: "/api/v1/orders/{orderId}/shipment" },
      readOntologies: { method: "GET", path: "/api/v2/ontologies" },
    },
    unsupported: {
      refund: "NOT_IN_CAPTURED_DOC",
      registerWebhook: "WEBHOOK_REGISTRATION_BLOCKED",
    },
  },
  shoepping: {
    auth: "basic-merchant-key",
    source: "https://portal.shoepping.at/ws/v1/orders",
    limits: { write: 10 },
    operations: {
      readOrders: { method: "GET", path: "/ws/v1/orders", baseUrl: "https://portal.shoepping.at" },
      updateOrder: { method: "POST", path: "/ws/v1/orders", baseUrl: "https://portal.shoepping.at" },
      readReturns: { method: "GET", path: "/ws/v1/returnAnnouncements", baseUrl: "https://portal.shoepping.at" },
    },
    unsupported: {
      createProduct: "PRODUCT_FEED_NOT_REST",
      updateOffer: "PRICE_STOCK_FEED_NOT_REST",
    },
  },
  alza: {
    auth: "client-credentials",
    source: "https://www.alza.cz/alzatrade-api",
    tokenUrl: "https://identity.alza.cz/connect/token",
    limits: { write: 10 },
    operations: {
      readOrders: { method: "GET", path: "/orders" },
      readUnshipped: { method: "GET", path: "/orders/unshipped" },
      readCategories: { method: "GET", path: "/listings/categories" },
      readCategoryTree: { method: "GET", path: "/listings/categories/tree" },
      readManufacturers: { method: "GET", path: "/listings/manufacturers" },
      readTemplates: { method: "GET", path: "/listings/templates" },
    },
    unsupported: {
      createProduct: "LISTING_WRITE_PATH_NOT_CAPTURED",
      updateOffer: "PRICE_STOCK_PATH_NOT_CAPTURED",
      updateTracking: "SHIPMENT_WRITE_PATH_NOT_CAPTURED",
      cancelOrder: "NOT_IN_CAPTURED_DOC",
      refund: "NOT_IN_CAPTURED_DOC",
    },
  },
  refurbed: {
    auth: "plain-token",
    source: "https://gitlab.com/refurbed-community/public-apis/-/blob/master/refurbed_merchant_api/refb/merchant/v1/README.md",
    documentedProductionHost: "api.refurbed.com:443",
    protocol: "grpc",
    limits: { write: 10 },
    operations: {
      readOrders: { service: "OrderService", methodName: "ListOrders" },
      readInstance: { service: "InstanceService", methodName: "GetInstance" },
    },
    unsupported: {
      refund: "REFUND_RPC_NAME_NOT_CAPTURED",
      createProduct: "INSTANCES_ARE_MANAGED_BY_REFURBED",
      updateOffer: "OFFER_RPC_NOT_CAPTURED",
    },
  },
  fileExchange: {
    auth: "sftp-credentials-from-merchant-project",
    source: "https://hypamoon.com/connect-to/galaxus",
    operations: {},
    unsupported: {
      createProduct: "FILE_EXCHANGE_ONLY",
      updateOffer: "FILE_EXCHANGE_ONLY",
      readOrders: "FILE_EXCHANGE_ONLY",
      updateTracking: "FILE_EXCHANGE_ONLY",
      cancelOrder: "FILE_EXCHANGE_ONLY",
      refund: "FILE_EXCHANGE_ONLY",
    },
  },
  existing: {
    operations: {},
    unsupported: {
      createProduct: "EXISTING_CONNECTOR_UNTOUCHED",
      updateProduct: "EXISTING_CONNECTOR_UNTOUCHED",
      updateOffer: "EXISTING_CONNECTOR_UNTOUCHED",
      readOrders: "EXISTING_CONNECTOR_UNTOUCHED",
      updateTracking: "EXISTING_CONNECTOR_UNTOUCHED",
      cancelOrder: "EXISTING_CONNECTOR_UNTOUCHED",
      refund: "EXISTING_CONNECTOR_UNTOUCHED",
    },
  },
  closed: {
    operations: {},
    unsupported: {},
  },
});

module.exports = { FAMILIES };
