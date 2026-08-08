export type AdminRole = "administrator" | "catalog_manager" | "order_manager" | "read_only";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  status: string;
  stock: number;
  stock_status: string;
  supplier_id: string;
  supplier_sku: string;
  supplier_price: { amount: number; currency: string };
  price: { amount: number; currency: string };
  category_id: string;
  updated_at?: string;
}

export interface AdminSupplier {
  supplier_id: string;
  supplier_name: string;
  feed_type: string;
  active: boolean;
  sync_status: string;
  last_sync_at: string | null;
  has_api_secret?: boolean;
}

export interface SyncJob {
  id: string;
  supplier_id: string;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  records_read: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
}

export interface ImportLogEntry {
  id: string;
  supplier_id: string;
  record_reference: string;
  error_type: string;
  error_message: string;
  timestamp: string;
  retry_status: string;
}

export interface AdminOrder {
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  customer: { email: string; firstName: string; lastName: string };
}

export interface AuditEntry {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  field: string | null;
  timestamp: string;
}
