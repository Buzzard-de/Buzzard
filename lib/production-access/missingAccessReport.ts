import { getProductionFlagsSnapshot, isProductionFlagEnabled } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import {
  buildAiAccessChecklist,
  buildCarrierAccessChecklist,
  buildInterCarsAccessChecklist,
  buildMarketingAccessChecklist,
  buildPaymentAccessChecklist,
  buildRealWorldGoLiveChecklist,
  buildReturnsAccessChecklist,
} from "./accessChecklists";
import { resolveGenericSecretRef, resolveInterCarsSecretRef } from "./secretRefs";
import { getAllProviderStates } from "./providerRegistry";
import type { AccessStatus, MissingProductionAccessReport, ProviderAccessReport } from "./types";

function providerReport(input: {
  providerId: string;
  domain: string;
  secret: ReturnType<typeof resolveInterCarsSecretRef>;
  checklist: ReturnType<typeof buildInterCarsAccessChecklist>;
  productionFlag?: keyof ReturnType<typeof getProductionFlagsSnapshot>;
  liveStatus?: AccessStatus;
}): ProviderAccessReport {
  const productionEnabled = input.productionFlag && isProductionFlagEnabled(input.productionFlag) ? "ON" : "OFF";
  const blockers = input.checklist
    .filter((c) => !["CONFIGURED", "VALIDATED"].includes(c.status))
    .map((c) => `${input.providerId}:${c.id}`);

  return {
    providerId: input.providerId,
    domain: input.domain,
    secretRef: input.secret,
    checklist: input.checklist,
    liveValidation: input.liveStatus || "UNVERIFIED",
    productionEnabled: productionEnabled === "ON" ? "ON" : "OFF",
    blockers,
  };
}

function phaseStatus(items: AccessChecklistItem[], passStatuses: AccessStatus[] = ["CONFIGURED", "VALIDATED"]): AccessStatus {
  if (items.some((i) => i.status === "BLOCKED")) return "BLOCKED";
  if (items.every((i) => passStatuses.includes(i.status))) return "VALIDATED";
  if (items.some((i) => i.status === "NOT_CONFIGURED")) return "NOT_CONFIGURED";
  return "UNVERIFIED";
}

type AccessChecklistItem = ProviderAccessReport["checklist"][number];

export function buildMissingProductionAccessReport(): MissingProductionAccessReport {
  const interCarsSecret = resolveInterCarsSecretRef();
  const interCarsChecklist = buildInterCarsAccessChecklist(interCarsSecret);
  const interCarsDiag = evaluateInterCarsProductionAccess();

  const interCars = providerReport({
    providerId: "inter-cars",
    domain: "SUPPLIER",
    secret: interCarsSecret,
    checklist: interCarsChecklist,
    productionFlag: "SUPPLIER_ORDER_NETWORK",
    liveStatus: interCarsDiag.readOnlyLiveValidation === "VALIDATED" ? "VALIDATED" : interCarsSecret.secretResolvable ? "UNVERIFIED" : "NOT_CONFIGURED",
  });

  const paymentSecret = resolveGenericSecretRef({
    providerId: "payment",
    secretRefEnvKey: "PAYMENT_PROVIDER_SECRET_REF",
    fallbackEnvKey: "PAYMENT_PROVIDER_SECRET",
  });
  const payment = providerReport({
    providerId: "payment",
    domain: "PAYMENT",
    secret: paymentSecret,
    checklist: buildPaymentAccessChecklist(paymentSecret),
    productionFlag: "PAYMENT_PRODUCTION",
  });

  const carrierSecret = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
  });
  const carrier = providerReport({
    providerId: "carrier",
    domain: "CARRIER",
    secret: carrierSecret,
    checklist: buildCarrierAccessChecklist(carrierSecret),
    productionFlag: "CARRIER_PRODUCTION",
  });

  const aiSecret = resolveGenericSecretRef({
    providerId: "ai",
    secretRefEnvKey: "AI_PROVIDER_SECRET_REF",
  });
  const ai = providerReport({
    providerId: "ai",
    domain: "AI",
    secret: aiSecret,
    checklist: buildAiAccessChecklist(aiSecret),
    productionFlag: "AI_PRODUCTION",
  });

  const returns = providerReport({
    providerId: "returns",
    domain: "RETURNS",
    secret: {
      providerId: "returns",
      secretRefKey: "n/a",
      secretRefConfigured: false,
      secretResolvable: false,
      credentialStatus: "NOT_CONFIGURED",
    },
    checklist: buildReturnsAccessChecklist(),
    productionFlag: "RETURNS_PRODUCTION",
  });

  const marketing = providerReport({
    providerId: "marketing",
    domain: "MARKETING",
    secret: {
      providerId: "marketing",
      secretRefKey: "multi",
      secretRefConfigured: ["GOOGLE_ADS", "META", "TIKTOK", "YOUTUBE"].some((p) => Boolean(process.env[`${p}_SECRET_REF`])),
      secretResolvable: false,
      credentialStatus: "NOT_CONFIGURED",
    },
    checklist: buildMarketingAccessChecklist(),
    productionFlag: "MARKETING_SPEND",
  });

  const realWorld = buildRealWorldGoLiveChecklist();
  const flags = getProductionFlagsSnapshot();
  const flagRecord: Record<string, "ON" | "OFF"> = {};
  for (const [k, v] of Object.entries(flags)) flagRecord[k] = v;

  const providerStates = getAllProviderStates();
  const stateById = Object.fromEntries(providerStates.map((s) => [s.providerId, s]));
  for (const p of [interCars, payment, carrier, ai, returns, marketing]) {
    p.state = stateById[p.providerId];
  }

  const providers = [interCars, payment, carrier, ai, returns, marketing];
  const blockers = [
    ...new Set([
      ...providers.flatMap((p) => p.blockers),
      ...realWorld.filter((c) => c.status !== "VALIDATED" && c.status !== "CONFIGURED").map((c) => `REAL_WORLD:${c.id}`),
    ]),
  ];

  return {
    generatedAt: new Date().toISOString(),
    providers,
    interCars,
    liveSequence: {
      phase1Access: phaseStatus(interCarsChecklist.slice(0, 9)),
      phase2Supplier: phaseStatus(realWorld.slice(0, 6)),
      phase3Providers: phaseStatus([...payment.checklist, ...carrier.checklist, ...ai.checklist, ...returns.checklist, ...marketing.checklist]),
      phase4Final: phaseStatus(realWorld),
    },
    productionFlags: flagRecord,
    realSideEffects: getFinalGoLiveSafetyCounters(),
    sales: isProductionFlagEnabled("SALES") ? "OPEN" : "CLOSED",
    blockers,
    realWorldChecklist: realWorld,
  };
}
