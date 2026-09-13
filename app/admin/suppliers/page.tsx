import AdminSupplierOperationsPanel from "@/components/admin/AdminSupplierOperationsPanel";

export const metadata = {
  title: "Admin Lieferanten – Buzzard",
  robots: { index: false, follow: false },
};

export default function AdminSuppliersPage() {
  return <AdminSupplierOperationsPanel />;
}
