import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import TopUtilityBar from "@/components/TopUtilityBar";
import ShopProviders from "@/components/ShopProviders";
import { SECURITY_HEADERS } from "@/lib/security";
import { marketingConfig } from "@/lib/marketing/config";
import "@/styles/globals.css";
import "@/styles/pusart.css";
import "@/styles/shop.css";
import "@/styles/rtl.css";

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
  title: "Buzzard – Online-Shop | Produkte kaufen",
  description:
    "Buzzard – Über 1.000.000 Produkte in den Kategorien Textil, Kosmetik, Reinigung, Schule und mehr. Kostenloser Versand ab 79€.",
  metadataBase: new URL("https://buzzard24.de"),
  manifest: "/manifest.json",
  referrer: "strict-origin-when-cross-origin",
  icons: { icon: "/logo/logo.png", apple: "/logo/logo.png" },
  openGraph: {
    title: "Buzzard – Online-Shop",
    description: "Über 1.000.000 Produkte. Kostenloser Versand ab 79€, schnelle Lieferung 1–3 Werktage.",
    url: "https://buzzard24.de/",
    images: ["/logo/logo.png"],
    type: "website",
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
