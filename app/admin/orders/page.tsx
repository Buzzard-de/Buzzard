import AdminOrdersTable from "@/components/admin/AdminOrdersTable";

export const metadata = {
  title: "Admin Bestellungen – Buzzard",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrdersTable />;
}
