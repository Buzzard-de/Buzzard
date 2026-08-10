import JsonLd from "./JsonLd";
import { onlineStoreSchema, organizationSchema, websiteSchema } from "@/lib/seo/structured-data";

export default function GlobalStructuredData() {
  return <JsonLd data={[organizationSchema(), onlineStoreSchema(), websiteSchema()]} />;
}
