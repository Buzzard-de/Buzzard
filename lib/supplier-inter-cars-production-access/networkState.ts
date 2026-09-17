import { isSupplierNetworkEnabled, isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { isScopedValidationNetworkEnabled } from "@/lib/supplier-engine/network/scopedValidationNetwork";

export function resolveNetworkState() {
  return {
    productionNetwork: isSupplierNetworkEnabled() ? ("ON" as const) : ("OFF" as const),
    supplierOrderNetwork: isSupplierOrderNetworkEnabled() ? ("ON" as const) : ("OFF" as const),
    scopedValidationNetwork: isScopedValidationNetworkEnabled() ? ("ON" as const) : ("OFF" as const),
  };
}
