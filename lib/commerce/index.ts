import demoOrders from "@/data/buzzard_demo_orders.json";
import type { DemoOrderRecord } from "./orderService";

export { createClientOrder } from "./orderService";
export type { ClientOrderRecord, CreateClientOrderInput, DemoOrderRecord } from "./orderService";
export { createPaymentSession } from "@/lib/payments/session";

export function getDemoOrders(): DemoOrderRecord[] {
  return demoOrders as DemoOrderRecord[];
}

export function getDemoOrderStats() {
  const orders = getDemoOrders();
  return {
    orders: orders.length,
    revenue: orders.reduce((sum, order) => sum + order.totalEUR, 0),
  };
}
