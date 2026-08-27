import type { Metadata } from "next";
import HomePageContent from "@/components/HomePageContent";
import { absoluteUrl, SEO_DEFAULTS } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: SEO_DEFAULTS.defaultTitle,
  description: SEO_DEFAULTS.defaultDescription,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.defaultDescription,
    url: absoluteUrl("/"),
  },
};

export default function HomePage() {
  return <HomePageContent />;
}
