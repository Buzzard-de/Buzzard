import type { PublicProduct } from "@/lib/products/types";
import JsonLd from "./seo/JsonLd";
import { productSchema } from "@/lib/seo/structured-data";

interface ProductStructuredDataProps {
  product: PublicProduct;
  categoryLabel: string;
}

export default function ProductStructuredData({ product, categoryLabel }: ProductStructuredDataProps) {
  return <JsonLd data={productSchema(product, categoryLabel)} />;
}
