import type { Metadata } from "next";
import ProductDetailLoader from "@/components/ProductDetailLoader";
import {
  getProductBySlug,
  getProductStaticParams,
} from "@/lib/products";
import { buildProductMetadata } from "@/lib/seo/metadata";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/** Slug of the synthetic shelf item inserted when BUZZARD_E2E_DB=1. */
const E2E_FIXTURE_SLUG = "synthetic-shelf-item";

export async function generateStaticParams() {
  const params = getProductStaticParams();
  // output: "export" only serves slugs listed here. The isolated E2E storefront
  // sets NEXT_PUBLIC_BUZZARD_E2E_FIXTURE=1 so the fixture's PDP can be opened;
  // production builds never set that flag, so the slug is not published empty.
  if (process.env.NEXT_PUBLIC_BUZZARD_E2E_FIXTURE === "1") {
    if (!params.some((entry) => entry.slug === E2E_FIXTURE_SLUG)) {
      params.push({ slug: E2E_FIXTURE_SLUG });
    }
  }
  return params;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    if (process.env.NEXT_PUBLIC_BUZZARD_E2E_FIXTURE === "1" && slug === E2E_FIXTURE_SLUG) {
      return { title: "Synthetic shelf item", robots: { index: false, follow: false } };
    }
    return { title: "Produkt nicht gefunden" };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return <ProductDetailLoader slug={slug} staticProduct={product} />;
}
