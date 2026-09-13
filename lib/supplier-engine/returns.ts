import { getSupplier } from "./registry";
import { hasCapability } from "./capabilities";

export interface SupplierReturnRequest {
  supplierId: string;
  orderId: string;
  supplierOrderId: string;
  lines: Array<{ supplierSku: string; quantity: number; reason?: string }>;
  returnType: "REFUND" | "CREDIT" | "REPLACEMENT";
}

export interface SupplierReturnResult {
  ok: boolean;
  dryRun: boolean;
  rmaId?: string;
  status: string;
  message: string;
  capabilities: string[];
}

export function listReturnCapabilities(supplierId: string): string[] {
  const supplier = getSupplier(supplierId);
  if (!supplier) return [];
  const caps: string[] = [];
  if (hasCapability(supplier.capabilities, "returnsAPI")) caps.push("RETURN");
  if (supplier.capabilities.refund) caps.push("REFUND");
  if (supplier.capabilities.credit) caps.push("CREDIT");
  if (supplier.capabilities.replacement) caps.push("REPLACEMENT");
  return caps;
}

export async function createSupplierReturn(request: SupplierReturnRequest): Promise<SupplierReturnResult> {
  const supplier = getSupplier(request.supplierId);
  const capabilities = listReturnCapabilities(request.supplierId);
  if (!supplier || !hasCapability(supplier.capabilities, "returnsAPI")) {
    return {
      ok: false,
      dryRun: true,
      status: "CAPABILITY_MISSING",
      message: "returnsAPI not configured",
      capabilities,
    };
  }

  const allowed =
    (request.returnType === "REFUND" && supplier.capabilities.refund) ||
    (request.returnType === "CREDIT" && supplier.capabilities.credit) ||
    (request.returnType === "REPLACEMENT" && supplier.capabilities.replacement);

  if (!allowed) {
    return {
      ok: false,
      dryRun: true,
      status: "RETURN_TYPE_UNSUPPORTED",
      message: `${request.returnType} not supported by supplier`,
      capabilities,
    };
  }

  return {
    ok: true,
    dryRun: true,
    rmaId: `DRY-RMA-${Date.now()}`,
    status: "PREPARED_NOT_SENT",
    message: "Return foundation only — no real supplier dispatch",
    capabilities,
  };
}
