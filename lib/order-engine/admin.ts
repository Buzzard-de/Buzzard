import { getOrder, getOrdersByCustomer, listAllOrders } from "./registry";
import { formatCurrencyIntl } from "@/lib/market-engine/money";
import type { BuzzardOrder, OrderEngineAdminRow } from "./types";

export function buildOrderAdminRow(order: BuzzardOrder): OrderEngineAdminRow {
  const primarySupplier = order.supplierAssignments[0];
  const primarySupplierOrder = order.supplierOrders[0];
  return {
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    marketId: order.marketId,
    channel: order.channel,
    itemCount: order.items.length,
    totalGross: formatCurrencyIntl(order.totalGross, order.currency),
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    supplierId: primarySupplier?.supplierId ?? "N/A",
    supplierOrderStatus: primarySupplierOrder?.status ?? "NOT_CREATED",
    reservationCount: order.reservationIds.length,
    fulfillmentStatus: order.fulfillmentStatus,
    returnStatus: order.returnRefund.returnStatus,
    refundStatus: order.returnRefund.refundStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function getOrderAdminOverview(filter?: { customerId?: string }): OrderEngineAdminRow[] {
  const orders = filter?.customerId ? getOrdersByCustomer(filter.customerId) : listAllOrders();
  return orders.map(buildOrderAdminRow);
}

export function getOrderAdminDetail(orderId: string): OrderEngineAdminRow | null {
  const order = getOrder(orderId);
  return order ? buildOrderAdminRow(order) : null;
}
