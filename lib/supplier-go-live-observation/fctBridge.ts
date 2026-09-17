import { getObservationDashboard } from "./admin";

export function buildObservationFctSnapshot() {
  const dash = getObservationDashboard();
  return {
    module: "supplier-go-live-observation",
    version: "346",
    observationState: dash.observationState,
    broaderRollout: dash.broaderRollout,
    controlledGoLive: dash.controlledGoLive,
    criticalIncidents: dash.criticalIncidents,
    blockers: dash.blockers,
    safety: {
      realSupplierHttpCalls: dash.realSupplierHttpCalls,
      realCustomerOrders: dash.realCustomerOrders,
    },
  };
}
