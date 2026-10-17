import { withAdminCredentials } from "@/lib/admin/authTransport";
import type {
  WmsInventoryRow,
  WmsInventoryStatus,
  WmsStockMovement,
  WmsWarehouse,
  WmsWarehouseJob,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("wmsInventory.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "wmsInventory.requestFailed");
  return data;
}

export function isWmsInventoryApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchWmsInventoryStatus(): Promise<WmsInventoryStatus> {
  const base = apiBase();
  if (!base) throw new Error("wmsInventory.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("wmsInventory.requestFailed");
  const data = (await res.json()) as { wmsInventory?: WmsInventoryStatus };
  if (!data.wmsInventory?.enabled) throw new Error("wmsInventory.disabled");
  return data.wmsInventory;
}

export async function fetchWmsWarehouses(): Promise<WmsWarehouse[]> {
  return adminRequest<WmsWarehouse[]>("/api/admin/wms-inventory/warehouses");
}

export async function fetchWmsInventory(): Promise<WmsInventoryRow[]> {
  return adminRequest<WmsInventoryRow[]>("/api/admin/wms-inventory/inventory");
}

export async function fetchWmsLowStock(): Promise<WmsInventoryRow[]> {
  return adminRequest<WmsInventoryRow[]>("/api/admin/wms-inventory/low-stock");
}

export async function fetchWmsMovements(): Promise<WmsStockMovement[]> {
  return adminRequest<WmsStockMovement[]>("/api/admin/wms-inventory/movements");
}

export async function fetchWmsJobs(): Promise<WmsWarehouseJob[]> {
  return adminRequest<WmsWarehouseJob[]>("/api/admin/wms-inventory/jobs");
}

export async function recordWmsMovement(body: {
  warehouseId: number;
  locationId: number;
  productSku: string;
  type: "in" | "out" | "damage";
  quantity: number;
  reference?: string;
}): Promise<WmsInventoryRow> {
  return adminRequest<WmsInventoryRow>("/api/admin/wms-inventory/inventory/movement", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function reserveWmsInventory(body: {
  warehouseId: number;
  locationId: number;
  productSku: string;
  quantity: number;
  orderNumber?: string;
}): Promise<{ id: number }> {
  return adminRequest<{ id: number }>("/api/admin/wms-inventory/inventory/reserve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createWmsJob(body: {
  warehouseId: number;
  orderNumber?: string;
  jobType?: string;
}): Promise<WmsWarehouseJob> {
  return adminRequest<WmsWarehouseJob>("/api/admin/wms-inventory/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
