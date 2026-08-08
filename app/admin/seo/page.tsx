import AdminSeoPanel from "@/components/admin/AdminSeoPanel";

export const metadata = {
  title: "Admin SEO – Buzzard",
  robots: { index: false, follow: false },
};

export default function AdminSeoPage() {
  return <AdminSeoPanel />;
}
