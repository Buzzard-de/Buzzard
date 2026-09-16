import { getFirstProductionOrderDashboard } from "./admin";

export function buildFirstProductionOrderFctSnapshot() {
  const dash = getFirstProductionOrderDashboard();
  return {
    module: "supplier-first-production-order",
    version: "344",
    firstOrderState: dash.firstOrderState,
    createOrderCapability: dash.createOrderCapability,
    validationEvidence: dash.validationEvidence,
    armingState: dash.armingState,
    productionOrderNetwork: dash.productionOrderNetwork,
    blockers: dash.blockers,
    safety: {
      realSupplierHttpCalls: dash.realSupplierHttpCalls,
      realSupplierOrders: dash.realSupplierOrders,
      realCustomerOrders: dash.realCustomerOrders,
    },
  };
}
