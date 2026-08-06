import CartView from "@/components/CartView";

export const metadata = {
  title: "Warenkorb – Buzzard",
};

export default function CartPage() {
  return (
    <section className="shop-page">
      <CartView />
    </section>
  );
}
