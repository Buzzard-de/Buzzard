import AdminProductEditor from "@/components/admin/AdminProductEditor";
import productCatalog from "@/data/buzzard_products.json";

export const metadata = {
  title: "Produkt bearbeiten – Buzzard Admin",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return productCatalog.products.map((product) => ({ id: product.id }));
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminProductEditor productId={id} />;
}
