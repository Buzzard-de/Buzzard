import type { LiveSupplierProfile } from "../../liveSupplier/types";
import type { SupplierOrderRequest } from "../../types";

/** Flatten Inter Cars catalog product into generic supplier record before field mapping. */
export function preprocessInterCarsProduct(raw: Record<string, unknown>): Record<string, unknown> {
  const eans = raw.eans;
  const primaryEan = Array.isArray(eans) && eans.length ? String(eans[0]) : undefined;

  const genericRefs = raw.genericArticleReferences as Array<{ genericArticleId?: string; name?: Record<string, string> }> | undefined;
  const primaryRef = genericRefs?.find((r) => r.genericArticleId) || genericRefs?.[0];
  const categoryLabel =
    primaryRef?.genericArticleId ||
    primaryRef?.name?.de ||
    primaryRef?.name?.en ||
    primaryRef?.name?.pl ||
    undefined;

  return {
    ...raw,
    ean: primaryEan,
    gtin: primaryEan,
    supplierCategory: categoryLabel,
    mpn: raw.index || raw.articleNumber,
    tecdocId: raw.tecDoc,
    oem: raw.articleNumber,
    brand: typeof raw.brand === "string" ? raw.brand : (raw.brandReference as { name?: string })?.name,
    stock: raw.availability,
  };
}

/** Flatten Inter Cars stock row. availability = purchasable quantity per IC docs. */
export function preprocessInterCarsStock(raw: Record<string, unknown>): Record<string, unknown> {
  const availability = raw.availability;
  const qty = availability != null && Number.isFinite(Number(availability)) ? Number(availability) : undefined;
  return {
    ...raw,
    supplierSku: raw.sku,
    stock: qty,
    stock_status: qty != null && qty > 0 ? "available" : "unavailable",
    discontinued: false,
    backorder: qty === 0 && raw.latestDeliveryDate ? true : undefined,
    lead_time: raw.latestDeliveryDate,
  };
}

/** Flatten Inter Cars pricing quote line — customerPriceNet is buying price (net). */
export function preprocessInterCarsPrice(raw: Record<string, unknown>, currency: string): Record<string, unknown> {
  const price = raw.price as Record<string, unknown> | undefined;
  const net = price?.customerPriceNet ?? price?.listPriceNet;
  const amount = net != null && Number.isFinite(Number(net)) ? Number(net) : undefined;
  return {
    ...raw,
    supplierSku: raw.sku,
    supplierPrice: amount,
    supplier_price: amount != null
      ? {
          amount,
          currency: String(price?.currencyCode || currency),
          includesVat: false,
          vatPercentage: price?.vatPercentage,
          listPriceNet: price?.listPriceNet,
          customerPriceNet: price?.customerPriceNet,
        }
      : undefined,
  };
}

export function isInterCarsProfile(profile?: LiveSupplierProfile | null): boolean {
  return profile?.adapterProfile === "inter-cars";
}

/** Build Inter Cars createOrder request body from canonical supplier order request. */
export function buildInterCarsCreateOrderBody(
  request: SupplierOrderRequest,
  idempotencyKey: string,
): Record<string, unknown> {
  return {
    externalOrderReference: request.orderId,
    idempotencyKey,
    lines: request.lines.map((line) => ({
      sku: line.supplierSku,
      quantity: line.quantity,
      unitPriceNet: line.unitPrice,
    })),
    deliveryAddress: {
      name: request.shippingAddress.name || request.shippingAddress.company,
      street: request.shippingAddress.street || request.shippingAddress.line1,
      city: request.shippingAddress.city,
      postalCode: request.shippingAddress.postalCode || request.shippingAddress.zip,
      country: request.shippingAddress.country || request.shippingAddress.countryCode,
    },
  };
}

export function chunkSkus(skus: string[], size = 100): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < skus.length; i += size) {
    chunks.push(skus.slice(i, i + size));
  }
  return chunks;
}
