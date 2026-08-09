export interface StoreUser {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin";
  created_at?: string;
}

export interface StoreCategory {
  id: number;
  name: string;
}

export interface StoreProduct {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category?: string | null;
  price_eur: number;
  weight_kg: number;
  stock: number;
  active: boolean;
}

export interface StoreCartItem {
  product_id: number;
  quantity: number;
  sku: string;
  name: string;
  price_eur: number;
  weight_kg: number;
}

export interface StoreCart {
  items: StoreCartItem[];
  subtotal: number;
  weight: number;
}

export interface StoreOrder {
  id: number;
  order_number: string;
  country_code: string;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  shipping_status?: string;
  payment_status?: string;
  created_at: string;
  user_id?: number;
}

export interface StoreOrderResult {
  id: number;
  orderId: number;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
}
