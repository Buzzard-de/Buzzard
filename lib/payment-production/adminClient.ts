import type { PaymentProductionDashboard, PaymentProductionStatusReport } from "./types";

async function adminRequest<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPaymentProductionDashboard(): Promise<{
  data: PaymentProductionDashboard;
  providers: Record<string, { status: string; enabled: boolean }>;
} | null> {
  const res = await adminRequest<{
    success: boolean;
    data: PaymentProductionDashboard;
    providers: Record<string, { status: string; enabled: boolean }>;
  }>("/api/admin/payment-production/dashboard");
  if (!res?.success) return null;
  return { data: res.data, providers: res.providers };
}

export async function fetchPaymentProductionStatusReport(): Promise<PaymentProductionStatusReport | null> {
  const res = await adminRequest<{ success: boolean; report: PaymentProductionStatusReport }>(
    "/api/admin/payment-production/status-report",
  );
  return res?.success ? res.report : null;
}
