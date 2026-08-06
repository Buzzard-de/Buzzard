export type ProductCategory =
  | "bremsen"
  | "motorenöle"
  | "filter"
  | "zündung"
  | "batterien"
  | "fahrwerk";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  imageKey: string;
  description?: string;
  stock?: number;
}

export interface NavCategory {
  id: string;
  label: string;
  href: string;
  hasMegaMenu?: boolean;
}

export interface MegaMenuGroup {
  title: string;
  icon: string;
  links: { label: string; href: string }[];
}

export interface SidebarCategory {
  id: string;
  label: string;
  icon: string;
}

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
}

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
