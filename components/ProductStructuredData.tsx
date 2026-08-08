import type { PublicProduct } from "@/lib/products/types";

interface ProductStructuredDataProps {
  product: PublicProduct;
  categoryLabel: string;
}

export default function ProductStructuredData({ product, categoryLabel }: ProductStructuredDataProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    gtin13: product.eanGtin || undefined,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    category: categoryLabel,
    offers: {
      "@type": "Offer",
      url: `https://buzzard24.de${product.url}`,
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      availability:
        product.stockStatus === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
