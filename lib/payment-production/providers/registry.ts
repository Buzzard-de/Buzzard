import type { PaymentProviderAdapter, PaymentProviderKind } from "../types";
import { amazonPayProvider } from "./amazonPayProvider";
import { applePayProvider } from "./applePayProvider";
import { cardProvider } from "./cardProvider";
import { googlePayProvider } from "./googlePayProvider";
import { klarnaProvider } from "./klarnaProvider";
import { localPaymentProvider } from "./localPaymentProvider";
import { mockProvider } from "./mockProvider";
import { paypalProvider } from "./paypalProvider";
import { sepaProvider } from "./sepaProvider";

const REGISTRY: PaymentProviderAdapter[] = [
  paypalProvider,
  cardProvider,
  sepaProvider,
  applePayProvider,
  googlePayProvider,
  amazonPayProvider,
  klarnaProvider,
  localPaymentProvider,
  mockProvider,
];

const byKind = new Map<PaymentProviderKind, PaymentProviderAdapter>(
  REGISTRY.map((p) => [p.kind, p]),
);

export function getPaymentProviderAdapter(kind: PaymentProviderKind): PaymentProviderAdapter | undefined {
  return byKind.get(kind);
}

export function listPaymentProviderAdapters(): PaymentProviderAdapter[] {
  return [...REGISTRY];
}

export function registerPaymentProviderAdapter(adapter: PaymentProviderAdapter): void {
  byKind.set(adapter.kind, adapter);
  const idx = REGISTRY.findIndex((p) => p.kind === adapter.kind);
  if (idx >= 0) REGISTRY[idx] = adapter;
  else REGISTRY.push(adapter);
}
