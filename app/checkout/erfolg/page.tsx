import CheckoutSuccess from "@/components/CheckoutSuccess";

export const metadata = {
  title: "Bestellung erfolgreich – Buzzard",
};

export default function CheckoutSuccessPage() {
  return (
    <section className="shop-page">
      <CheckoutSuccess />
    </section>
  );
}
