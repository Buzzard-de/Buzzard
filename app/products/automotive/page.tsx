import AutomotiveCategoryPageView from "@/components/catalog/AutomotiveCategoryPageView";
import { getAutomotiveRoot } from "@/lib/automotive/service";
import { buildAutomotiveCategoryMetadata } from "@/lib/automotive/seo";
import { DEFAULT_LOCALE } from "@/lib/categories";
import type { Metadata } from "next";

export const metadata: Metadata = buildAutomotiveCategoryMetadata(
  getAutomotiveRoot(),
  DEFAULT_LOCALE
);

export default function AutomotiveRootPage() {
  return <AutomotiveCategoryPageView slug={[]} />;
}
