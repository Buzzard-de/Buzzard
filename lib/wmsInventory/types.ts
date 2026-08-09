export interface WmsWarehouse {
  id: number;
  code: string;
  name: string;
  country_code: string;
  address: string | null;
  active: boolean;
  created_at: string;
  locations: number;
  skus: number;
  lowStock: number;
}

export interface WmsInventoryRow {
  id: number;
  warehouse_id: number;
  location_id: number | null;
  product_sku: string;
  barcode: string | null;
  on_hand: number;
  reserved: number;
  damaged: number;
  reorder_point: number;
  updated_at: string;
  warehouse: string;
  location: string | null;
  available: number;
  low_stock: boolean;
}

export interface WmsStockMovement {
  id: number;
  warehouse_id: number;
  location_id: number | null;
  product_sku: string;
  barcode: string | null;
  movement_type: string;
  quantity: number;
  reference: string | null;
  user_id: number | null;
  created_at: string;
}

export interface WmsReservation {
  id: number;
  warehouse_id: number;
  location_id: number | null;
  product_sku: string;
  quantity: number;
  order_number: string | null;
  status: string;
  created_at: string;
}

export interface WmsWarehouseJob {
  id: number;
  warehouse_id: number;
  order_number: string | null;
  job_type: string;
  status: string;
  assigned_to: number | null;
  created_at: string;
  finished_at: string | null;
  warehouse: string;
}

export interface WmsTransfer {
  id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_sku: string;
  quantity: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface WmsStocktake {
  id: number;
  warehouse_id: number;
  location_id: number | null;
  product_sku: string;
  system_qty: number;
  counted_qty: number;
  variance: number;
  status: string;
  created_at: string;
}

export interface WmsInventoryStatus {
  version: string;
  enabled: boolean;
  totals: {
    warehouses: number;
    locations: number;
    inventoryRows: number;
    lowStock: number;
    reservations: number;
    warehouseJobs: number;
    transfers: number;
    stocktakes: number;
    movements: number;
  };
}
