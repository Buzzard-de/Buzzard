import { getMarket } from "@/lib/market-engine/registry";
import { getProduct } from "@/lib/product-engine";
import type { CreateOrderInput, OrderErrorCode } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ code: OrderErrorCode | string; message: string }>;
}

export function validateCreateOrderInput(input: CreateOrderInput): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  if (!input.customerId?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "CUSTOMER_ID_MISSING" });
  }
  if (!input.customerEmail?.trim() || !input.customerEmail.includes("@")) {
    errors.push({ code: "VALIDATION_FAILED", message: "CUSTOMER_EMAIL_INVALID" });
  }
  if (!input.marketId?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "MARKET_ID_MISSING" });
  } else if (!getMarket(input.marketId)) {
    errors.push({ code: "VALIDATION_FAILED", message: "UNKNOWN_MARKET" });
  }
  if (!input.channel?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "CHANNEL_MISSING" });
  }
  if (!input.idempotencyKey?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "IDEMPOTENCY_KEY_MISSING" });
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push({ code: "VALIDATION_FAILED", message: "ITEMS_MISSING" });
  }

  for (const item of input.items ?? []) {
    if (!item.productId?.trim()) {
      errors.push({ code: "VALIDATION_FAILED", message: "PRODUCT_ID_MISSING" });
    } else if (!getProduct(item.productId)) {
      errors.push({ code: "VALIDATION_FAILED", message: `UNKNOWN_PRODUCT:${item.productId}` });
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push({ code: "VALIDATION_FAILED", message: "INVALID_QUANTITY" });
    }
  }

  if (!input.shippingAddress?.recipientName?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "SHIPPING_ADDRESS_MISSING" });
  }
  if (!input.shippingAddress?.country?.trim()) {
    errors.push({ code: "VALIDATION_FAILED", message: "SHIPPING_COUNTRY_MISSING" });
  }

  return { valid: errors.length === 0, errors };
}
