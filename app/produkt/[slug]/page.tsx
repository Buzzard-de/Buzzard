import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/ProductDetailView";
import {
  getProductBySlug,
  getProductStaticParams,
} from "@/lib/products";
import { buildProductMetadata } from "@/lib/seo/metadata";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getProductStaticParams();
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Produkt – Buzzard" };
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <section className="shop-page">
      <ProductDetailView product={product} />
    </section>
  );
}
