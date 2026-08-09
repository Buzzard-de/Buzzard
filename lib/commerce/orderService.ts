export interface DemoOrderRecord {
  id: string;
  date: string;
  customer: string;
  country: string;
  status: string;
  totalEUR: number;
  items: number;
}

export interface CreateClientOrderInput {
  customer: { name: string; email: string; address: string };
  country: string;
  items: Array<{ id: string; name: string; qty: number; priceEUR: number }>;
  subtotal: number;
  shipping: number;
  tax: number;
}

export interface ClientOrderRecord {
  id: string;
  createdAt: string;
  customer: CreateClientOrderInput["customer"];
  country: string;
  items: CreateClientOrderInput["items"];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
}

export function createClientOrder(input: CreateClientOrderInput): ClientOrderRecord {
  return {
    id: `BZ-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customer: input.customer,
    country: input.country,
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    tax: input.tax,
    total: input.subtotal + input.shipping + input.tax,
    status: "Pending payment",
  };
}
