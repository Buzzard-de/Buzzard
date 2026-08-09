export type ProductCategory =
  | "bremsen"
  | "motorenöle"
  | "filter"
  | "zündung"
  | "batterien"
  | "fahrwerk";

/** @deprecated Legacy shape – prefer PublicProduct from @/lib/products/types */
export interface Product {
  id: string;
  name: string;
  category?: ProductCategory;
  categoryLabel?: string;
  categoryId: string;
  price: number;
  imageKey?: string;
  description?: string;
  stock?: number;
}

export interface NavCategory {
  id: string;
  label: string;
  href: string;
  hasMegaMenu?: boolean;
}

export interface CategoryTreeNode {
  id: string;
  slug: string;
  label: string;
  icon?: string;
  productFilter?: string;
  children?: CategoryTreeNode[];
}

export interface SidebarCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
}

/** @deprecated Use CategoryTreeNode subcategories instead */
export interface MegaMenuGroup {
  title: string;
  icon: string;
  links: { label: string; href: string }[];
}

/** @deprecated Use CategoryTreeNode hierarchy instead */
export interface MegaMenuContent {
  id: string;
  title: string;
  groups: MegaMenuGroup[];
}

export interface PopularProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  imageKey: string;
}

export interface MainNavLink {
  label: string;
  href: string;
}

/** @deprecated Use CartLineItem from @/lib/cart/types */
export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface SavedVehicle {
  brand: string;
  model: string;
  year: string;
  engine: string;
  /** SQLite vehicle id when loaded from /api/vehicles (TecDoc compatibility) */
  vehicleId?: number;
}

/** @deprecated Use CheckoutPayload from @/lib/checkout/types */
export interface CheckoutData {
  name: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  payment: "paypal" | "card" | "invoice";
}

export interface CategoryCard {
  id: string;
  label: string;
  href: string;
  filter?: string;
}

export type ShopModal = "vehicle" | "vin" | null;
