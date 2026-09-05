"use client";

import { useLocale } from "@/lib/i18n/context";
import { showPrices } from "@/lib/shop/mode";

interface PriceLabelProps {
  amount: number;
  className?: string;
}

export default function PriceLabel({ amount, className }: PriceLabelProps) {
  const { formatPrice } = useLocale();
  if (!showPrices()) {
    return null;
  }
  return <span className={className}>{formatPrice(amount)}</span>;
}
