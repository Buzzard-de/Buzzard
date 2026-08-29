/** Demo stats for admin dashboard while sales disabled */
export function getDemoOrderStats() {
  return {
    orders: 0,
    commercialOrders: 0,
    revenue: 0,
    currency: "EUR",
    salesEnabled: false,
    note: "Commerce dry-run — no live sales",
  };
}
