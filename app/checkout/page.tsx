import CheckoutForm from "@/components/CheckoutForm";

export const metadata = {
  title: "Kasse – Buzzard",
};

export default function CheckoutPage() {
  return (
    <section className="shop-page">
      <CheckoutForm />
    </section>
  );
}
