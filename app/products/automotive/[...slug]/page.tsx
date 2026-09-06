import type { Metadata } from "next";
import AutomotiveCategoryPageView from "@/components/catalog/AutomotiveCategoryPageView";
import {
  getAutomotiveCategoryBySlugPath,
  getAutomotiveStaticParams,
} from "@/lib/automotive/service";
import { buildAutomotiveCategoryMetadata } from "@/lib/automotive/seo";
import { DEFAULT_LOCALE } from "@/lib/categories";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export function generateStaticParams() {
  return getAutomotiveStaticParams().filter((p) => p.slug && p.slug.length > 0) as { slug: string[] }[];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getAutomotiveCategoryBySlugPath(slug.join("/"));
  if (!category) return { title: "Automotive – Buzzard" };
  return buildAutomotiveCategoryMetadata(category, DEFAULT_LOCALE);
}

export default async function AutomotiveSlugPage({ params }: PageProps) {
  const { slug } = await params;
  return <AutomotiveCategoryPageView slug={slug} />;
}
