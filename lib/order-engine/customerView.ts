import { getOrder, getOrdersByCustomer } from "./registry";
import { canCustomerAccessOrder } from "./security";
import type { BuzzardOrder, CustomerOrderView } from "./types";

export function toCustomerOrderView(order: BuzzardOrder): CustomerOrderView {
  const pipeline = order.tradeRouteFulfillment;
  const tracking = order.tracking;
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
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
    shippingMethod: pipeline?.carrierServiceLevel,
    carrier: pipeline?.carrierId ?? tracking?.carrier,
    estimatedDelivery: pipeline?.estimatedDelivery ?? tracking?.estimatedDelivery,
    trackingNumber: tracking?.status === "ATTACHED" ? tracking.trackingNumber : undefined,
    trackingStatus: tracking?.trackingStatus ?? tracking?.status,
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
