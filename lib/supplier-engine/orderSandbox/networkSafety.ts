import { isSupplierNetworkEnabled, isSupplierOrderNetworkEnabled } from "../network";
import { isLiveReadEnabled } from "../liveSupplier/config";

export interface NetworkSafetyReport {
  safe: boolean;
  supplierNetworkEnabled: boolean;
  supplierOrderNetworkEnabled: boolean;
  liveReadEnabled: boolean;
  violations: string[];
}

export function evaluateSupplierOrderNetworkSafety(): NetworkSafetyReport {
  const violations: string[] = [];
  if (isSupplierOrderNetworkEnabled()) {
    violations.push("SUPPLIER_ORDER_NETWORK_ENABLED_MUST_BE_0");
  }
  if (isSupplierNetworkEnabled() && isLiveReadEnabled()) {
    violations.push("LIVE_READ_SHOULD_BE_DISABLED_FOR_ORDER_SANDBOX_TESTS");
  }
  return {
    safe: violations.length === 0,
    supplierNetworkEnabled: isSupplierNetworkEnabled(),
    supplierOrderNetworkEnabled: isSupplierOrderNetworkEnabled(),
    liveReadEnabled: isLiveReadEnabled(),
    violations,
  };
}

export function assertOrderSandboxNetworkSafety(): void {
  const report = evaluateSupplierOrderNetworkSafety();
  if (!report.safe) {
    throw new Error(`NETWORK_SAFETY_VIOLATION:${report.violations.join(",")}`);
  }
}
