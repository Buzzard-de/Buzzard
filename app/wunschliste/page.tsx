import WishlistView from "@/components/WishlistView";

export const metadata = {
  title: "Wunschliste – Buzzard",
};

export default function WishlistPage() {
  return (
    <section className="shop-page">
      <WishlistView />
    </section>
  );
}
