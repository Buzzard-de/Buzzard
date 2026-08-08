import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/ProductDetailView";
import { getLegacyProductParams, getProductById } from "@/lib/products";

export function generateStaticParams() {
  return getLegacyProductParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Produkt – Buzzard" };
  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: { canonical: `https://buzzard24.de${product.url}` },
  };
}

/** Legacy URL alias – canonical SEO URL is /produkt/[slug]/ */
export default async function LegacyProductPage({
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
