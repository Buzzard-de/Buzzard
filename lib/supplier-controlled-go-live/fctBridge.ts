import { getControlledGoLiveDashboard } from "./admin";

export function buildControlledGoLiveFctSnapshot() {
  const dash = getControlledGoLiveDashboard();
  return {
    module: "supplier-controlled-go-live",
    version: "345",
    controlledGoLive: dash.controlledGoLive,
    firstOrderOutcome: dash.firstOrderOutcome,
    armingState: dash.armingState,
    productionNetwork: dash.productionNetwork,
    blockers: dash.blockers,
    safety: {
      realSupplierHttpCalls: dash.realSupplierHttpCalls,
      realCustomerOrders: dash.realCustomerOrders,
    },
  };
}
