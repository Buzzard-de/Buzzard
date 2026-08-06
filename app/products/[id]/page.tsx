import { notFound } from "next/navigation";
import ProductDetailView from "@/components/ProductDetailView";
import { getProductById, products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const product = getProductById(id);
    return {
      title: product ? `${product.name} – Buzzard` : "Produkt – Buzzard",
    };
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return (
    <section className="shop-page">
      <ProductDetailView product={product} />
    </section>
  );
}
