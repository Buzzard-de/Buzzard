import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import TopUtilityBar from "@/components/TopUtilityBar";
import ShopProviders from "@/components/ShopProviders";
import SkipLink from "@/components/SkipLink";
import { SECURITY_HEADERS } from "@/lib/security";
import { marketingConfig } from "@/lib/marketing/config";
import { SEO_DEFAULTS, SITE_URL } from "@/lib/seo/config";
import "@/styles/globals.css";
import "@/styles/pusart.css";
import "@/styles/shop.css";
import "@/styles/rtl.css";
import "@/styles/storefront-responsive.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: {
    default: SEO_DEFAULTS.defaultTitle,
    template: `%s | ${SEO_DEFAULTS.siteName}`,
  },
  description: SEO_DEFAULTS.defaultDescription,
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.json",
  referrer: "strict-origin-when-cross-origin",
  icons: { icon: "/logo/logo.png", apple: "/logo/logo.png" },
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.defaultDescription,
    url: `${SITE_URL}/`,
    siteName: SEO_DEFAULTS.siteName,
    images: ["/logo/logo.png"],
    type: "website",
    locale: "de_DE",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: marketingConfig.searchConsoleVerification
    ? { google: marketingConfig.searchConsoleVerification }
    : undefined,
  other: {
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={SECURITY_HEADERS.contentSecurityPolicy} />
        )}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Cross-Origin-Opener-Policy" content="same-origin" />
        <meta httpEquiv="Cross-Origin-Resource-Policy" content="same-site" />
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains" />
        )}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <ShopProviders>
          <SkipLink />
          <TopUtilityBar />
          <Header />
          <Navbar />
          <main id="maincontent">{children}</main>
          <Footer />
        </ShopProviders>
      </body>
    </html>
  );
}
