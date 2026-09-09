import { getOrder, getOrdersByCustomer } from "./registry";
import { canCustomerAccessOrder } from "./security";
import type { BuzzardOrder, CustomerOrderView } from "./types";

export function toCustomerOrderView(order: BuzzardOrder): CustomerOrderView {
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    totalGross: order.totalGross,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitGrossPrice: i.unitGrossPrice,
      lineGross: i.lineGross,
    })),
    shippingAddress: {
      recipientName: order.shippingAddress.recipientName,
      city: order.shippingAddress.city,
      country: order.shippingAddress.country,
      postalCode: order.shippingAddress.postalCode,
    },
  };
}

export function getCustomerOrder(orderId: string, customerId: string): CustomerOrderView | null {
  const order = getOrder(orderId);
  if (!order || !canCustomerAccessOrder(order.customerId, customerId)) return null;
  return toCustomerOrderView(order);
}

export function listCustomerOrders(customerId: string): CustomerOrderView[] {
  return getOrdersByCustomer(customerId).map(toCustomerOrderView);
}
