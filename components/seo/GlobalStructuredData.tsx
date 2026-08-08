import JsonLd from "./JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/structured-data";

export default function GlobalStructuredData() {
  return <JsonLd data={[organizationSchema(), websiteSchema()]} />;
}
