"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseJsonSafely, sanitizeDisplayText } from "@/lib/security";

const ORDER_STORAGE_KEY = "buzzard_last_order";

interface OrderSummary {
  id: string;
  total: number;
  customer: { name: string; email: string };
}

function isOrderSummary(value: unknown): value is OrderSummary {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<OrderSummary>;
  return (
    typeof order.id === "string" &&
    typeof order.total === "number" &&
    !!order.customer &&
    typeof order.customer.name === "string" &&
    typeof order.customer.email === "string"
  );
}

export default function CheckoutSuccess() {
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    const raw =
      sessionStorage.getItem(ORDER_STORAGE_KEY) ||
      localStorage.getItem(ORDER_STORAGE_KEY);

    const parsed = parseJsonSafely(raw, isOrderSummary);
    if (parsed) {
      setOrder({
        id: sanitizeDisplayText(parsed.id, 32),
        total: parsed.total,
        customer: {
          name: sanitizeDisplayText(parsed.customer.name, 100),
          email: sanitizeDisplayText(parsed.customer.email, 254),
        },
      });
    }

    sessionStorage.removeItem(ORDER_STORAGE_KEY);
    localStorage.removeItem(ORDER_STORAGE_KEY);
  }, []);

  return (
    <div className="checkout-success">
      <div className="checkout-success-icon">✓</div>
      <h1>Bestellung erfolgreich!</h1>
      {order ? (
        <>
          <p>
            Vielen Dank, {order.customer.name}. Ihre Bestellung{" "}
            <strong>{order.id}</strong> wurde erhalten.
          </p>
          <p className="checkout-success-email">
            Eine Bestätigung wurde an {order.customer.email} gesendet.
          </p>
        </>
      ) : (
        <p>Ihre Bestellung wurde erfolgreich übermittelt.</p>
      )}
      <div className="checkout-success-actions">
        <Link href="/products/" className="shop-btn-primary">Weiter einkaufen</Link>
        <Link href="/" className="shop-btn-secondary">Zur Startseite</Link>
      </div>
    </div>
  );
}
