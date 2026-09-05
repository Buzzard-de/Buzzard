"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import type { CartLineItem } from "@/lib/cart/types";

interface CatalogInquiryPanelProps {
  items?: CartLineItem[];
  variant?: "cart" | "checkout";
}

export default function CatalogInquiryPanel({
  items = [],
  variant = "cart",
}: CatalogInquiryPanelProps) {
  const { t } = useLocale();

  const inquiryLines =
    items.length > 0
      ? items
          .map((item) => `${item.qty}x ${item.name}${item.sku ? ` (${item.sku})` : ""}`)
          .join("\n")
      : "";

  const contactHref = inquiryLines
    ? `/hilfe/?anfrage=1#kontakt&message=${encodeURIComponent(`Produktanfrage:\n${inquiryLines}`)}`
    : "/hilfe/#kontakt";

  return (
    <div className="catalog-inquiry-panel">
      <p className="catalog-inquiry-note">{t("catalog.inquiryNote")}</p>
      {variant === "checkout" && items.length > 0 && (
        <ul className="catalog-inquiry-items">
          {items.map((item) => (
            <li key={item.lineId}>
              {item.qty}× {item.name}
              {item.sku ? ` · ${item.sku}` : ""}
            </li>
          ))}
        </ul>
      )}
      <Link href={contactHref} className="shop-btn-primary">
        {t("catalog.inquiryCta")}
      </Link>
      {variant === "checkout" ? (
        <Link href="/products/" className="shop-btn-secondary">
          {t("cart.continue")}
        </Link>
      ) : null}
    </div>
  );
}
