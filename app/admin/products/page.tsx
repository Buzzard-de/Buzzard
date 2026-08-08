import AdminProductsTable from "@/components/admin/AdminProductsTable";

export const metadata = {
  title: "Admin Produkte – Buzzard",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsTable />;
}
