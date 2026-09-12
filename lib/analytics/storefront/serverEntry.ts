import { bootstrapAnalyticsPersistence } from "../store/bootstrap";

bootstrapAnalyticsPersistence();

export {
  handleStorefrontAnalyticsEvent,
  handleStorefrontPurchaseSignal,
  parseStorefrontEventBody,
} from "./serverHandler";

export { getAnalyticsPersistenceMode } from "../store/bootstrap";

export {
  getOverview,
  getFunnel,
  getTraffic,
  getRevenue,
  getProducts,
  getMarkets,
  getChannels,
  getBusinessKpiDashboard,
  getBusinessKpiSection,
} from "../dashboard";
