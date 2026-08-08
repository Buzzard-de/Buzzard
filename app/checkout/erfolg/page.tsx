import { Suspense } from "react";
import CheckoutSuccess from "@/components/CheckoutSuccess";

export const metadata = {
  title: "Bestellung erfolgreich – Buzzard",
};

export default function CheckoutSuccessPage() {
  return (
    <section className="shop-page">
      <Suspense fallback={<div className="checkout-success"><p>…</p></div>}>
        <CheckoutSuccess />
      </Suspense>
    </section>
  );
}
