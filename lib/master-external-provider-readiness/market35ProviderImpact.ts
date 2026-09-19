import { runMarket35Preflight } from "@/lib/final-external-access/market35Preflight";

export function summarizeMarket35ProviderImpact(): {
  ready: number;
  partial: number;
  blocked: number;
  humanRequired: number;
} {
  const m = runMarket35Preflight();
  const humanRequired = m.markets.filter(
    (x) => x.warnings.some((w) => w.includes("SUPPLIER") || w.includes("CUSTOMS") || w.includes("CARRIER")),
  ).length;
  return {
    ready: m.pass,
    partial: m.warning,
    blocked: m.blocked,
    humanRequired,
  };
}
