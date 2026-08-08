import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard – Buzzard",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return <AdminDashboard />;
}
