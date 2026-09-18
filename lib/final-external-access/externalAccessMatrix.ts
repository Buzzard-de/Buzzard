import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { CARRIER_PROFILES } from "@/lib/trade-route-fulfillment/carrierSelection";
import { listAllProviderKinds, hasProviderSecretRef } from "@/lib/payment-production/config";
import {
  getAllProviderStates,
  evaluateInterCarsProviderState,
} from "@/lib/production-access/providerRegistry";
import {
  resolveInterCarsSecretRef,
  resolveGenericSecretRef,
} from "@/lib/production-access/secretRefs";
import { hasProductionEvidence, listProviderAccessEvidence } from "@/lib/production-access/evidenceStore";
import { buildInterCarsAccessStatusReport } from "@/lib/supplier-inter-cars-production-access/statusReport";
import type { ExternalAccessEntry, ExternalAccessStatus } from "./types";

function mapStatus(
  configured: boolean,
  validated: boolean,
  blocked: boolean,
  liveNetwork: boolean,
): ExternalAccessStatus {
  if (blocked) return "BLOCKED";
  if (liveNetwork && validated) return "ENABLED";
  if (validated) return "VALIDATED";
  if (configured) return "CONFIGURED";
  return "NOT_CONFIGURED";
}

function entryFromProviderState(input: {
  provider: string;
  environment?: "MOCK" | "SANDBOX" | "PRODUCTION";
  secretRef: string;
  state?: ReturnType<typeof getAllProviderStates>[number];
  humanApproval?: boolean;
  extraBlocker?: string;
}): ExternalAccessEntry {
  const s = input.state;
  const configured = Boolean(s?.credentialConfigured || s?.secretRefConfigured);
  const validated = s?.liveValidation === "VALIDATED" || s?.accessState === "VALIDATED";
  const blocked = s?.accessState === "BLOCKED" || Boolean(input.extraBlocker);
  const liveNetwork = s?.networkPermission === true && s?.productionEnabled === "ON";
  const status = mapStatus(configured, validated, blocked, liveNetwork);
  const evidence = listProviderAccessEvidence(input.provider.replace(/\s+/g, "-").toLowerCase());
  const latest = evidence[evidence.length - 1];

  return {
    provider: input.provider,
    environment: input.environment ?? "PRODUCTION",
    credentialSecretRef: input.secretRef,
    credentialConfigured: configured,
    credentialValid: validated || (configured && !blocked),
    endpointConfigured: s?.endpointConfigured ?? configured,
    endpointReachable: validated,
    capabilityDeclared: s?.capabilityCheck !== "NOT_CONFIGURED",
    capabilityValidated: s?.capabilityCheck === "VALIDATED" || validated,
    liveNetworkEnabled: liveNetwork,
    productionReady: status === "VALIDATED" && validated && s?.endpointConfigured !== false,
    status,
    blockingReason:
      input.extraBlocker ||
      s?.blockers?.[0] ||
      (configured ? "AWAITING_LIVE_VALIDATION" : "NOT_CONFIGURED"),
    requiredHumanApproval: input.humanApproval ?? false,
    lastValidationTimestamp: s?.lastValidationAt ?? latest?.timestamp,
    evidenceReference: latest?.evidenceId,
  };
}

export function buildExternalAccessMatrix(): ExternalAccessEntry[] {
  const states = getAllProviderStates();
  const byId = (id: string) => states.find((s) => s.providerId === id);
  const interCarsReport = buildInterCarsAccessStatusReport();
  const interCarsSecret = resolveInterCarsSecretRef();
  const interCarsState = evaluateInterCarsProviderState();

  const entries: ExternalAccessEntry[] = [
    entryFromProviderState({
      provider: "INTER CARS",
      secretRef: interCarsSecret.secretRefKey,
      state: interCarsState,
      humanApproval: true,
      extraBlocker:
        interCarsReport.credential === "NOT_CONFIGURED"
          ? "BLOCKED — MISSING PRODUCTION CREDENTIALS / ACCESS"
          : interCarsReport.stage342 === "UNVERIFIED"
            ? "CREATE_ORDER_UNVERIFIED"
            : undefined,
    }),
    entryFromProviderState({
      provider: "PAYMENT",
      secretRef: "env:PAYMENT_PROVIDER_SECRET_REF",
      state: byId("payment"),
    }),
    entryFromProviderState({
      provider: "CARRIER",
      secretRef: "env:CARRIER_PROVIDER_SECRET_REF",
      state: byId("carrier"),
    }),
    {
      provider: "TRACKING",
      environment: "PRODUCTION",
      credentialSecretRef: "env:CARRIER_PROVIDER_SECRET_REF",
      credentialConfigured: byId("carrier")?.credentialConfigured ?? false,
      credentialValid: false,
      endpointConfigured: false,
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: byId("carrier")?.credentialConfigured ? "UNVERIFIED" : "NOT_CONFIGURED",
      blockingReason: "CARRIER_CREDENTIAL_REQUIRED",
      requiredHumanApproval: false,
    },
    entryFromProviderState({
      provider: "RETURNS",
      secretRef: "env:RETURNS_PROVIDER_SECRET_REF",
      state: byId("returns"),
    }),
    entryFromProviderState({
      provider: "REFUNDS",
      secretRef: "env:RETURNS_PROVIDER_SECRET_REF",
      state: byId("returns"),
    }),
    {
      provider: "FINANCIAL PROVIDER",
      environment: "PRODUCTION",
      credentialSecretRef: "n/a",
      credentialConfigured: true,
      credentialValid: false,
      endpointConfigured: true,
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: "UNVERIFIED",
      blockingReason: "REQUIRES_LIVE_ORDER_CHAIN",
      requiredHumanApproval: true,
    },
    ...(["AMAZON", "EBAY", "KAUFLAND", "ALLEGRO", "BOL", "CDISCOUNT", "OTTO", "EMAG", "SKROUTZ"] as const).map(
      (mp) => ({
        provider: mp,
        environment: "PRODUCTION" as const,
        credentialSecretRef: `env:MARKETPLACE_${mp}_SECRET_REF`,
        credentialConfigured: Boolean(process.env[`MARKETPLACE_${mp}_SECRET_REF`]?.trim()),
        credentialValid: hasProductionEvidence("marketplace", mp.toLowerCase()),
        endpointConfigured: false,
        endpointReachable: false,
        capabilityDeclared: true,
        capabilityValidated: false,
        liveNetworkEnabled: false,
        productionReady: false,
        status: "NOT_CONFIGURED" as ExternalAccessStatus,
        blockingReason: "MARKETPLACE_CREDENTIALS_NOT_CONFIGURED",
        requiredHumanApproval: true,
      }),
    ),
    {
      provider: "OTHER MARKETPLACES",
      environment: "PRODUCTION",
      credentialSecretRef: "env:MARKETPLACE_PROVIDER_SECRET_REF",
      credentialConfigured: Boolean(process.env.MARKETPLACE_PROVIDER_SECRET_REF?.trim()),
      credentialValid: false,
      endpointConfigured: false,
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: "NOT_CONFIGURED",
      blockingReason: "MARKETPLACE_CREDENTIALS_NOT_CONFIGURED",
      requiredHumanApproval: true,
    },
    entryFromProviderState({
      provider: "AI PROVIDER",
      secretRef: "env:AI_PROVIDER_SECRET_REF",
      state: byId("ai"),
    }),
    entryFromProviderState({
      provider: "MARKETING",
      secretRef: "env:GOOGLE_ADS_SECRET_REF",
      state: byId("marketing"),
    }),
    {
      provider: "EMAIL",
      environment: "PRODUCTION",
      credentialSecretRef: "env:EMAIL_PROVIDER_SECRET_REF",
      credentialConfigured: Boolean(
        process.env.EMAIL_PROVIDER_SECRET_REF?.trim() || process.env.SMTP_SECRET_REF?.trim(),
      ),
      credentialValid: false,
      endpointConfigured: Boolean(process.env.SMTP_HOST?.trim()),
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: process.env.EMAIL_PROVIDER_SECRET_REF ? "CONFIGURED" : "NOT_CONFIGURED",
      blockingReason: process.env.EMAIL_PROVIDER_SECRET_REF ? "AWAITING_LIVE_VALIDATION" : "NOT_CONFIGURED",
      requiredHumanApproval: false,
    },
    {
      provider: "DEPLOYMENT",
      environment: "PRODUCTION",
      credentialSecretRef: "env:RENDER_API_KEY",
      credentialConfigured: Boolean(process.env.RENDER_API_KEY?.trim()),
      credentialValid: false,
      endpointConfigured: Boolean(process.env.RENDER_SERVICE_ID?.trim()),
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: "UNVERIFIED",
      blockingReason: "RENDER_DEPLOYMENT_MANUAL_VERIFICATION",
      requiredHumanApproval: true,
    },
    {
      provider: "PERSISTENT STORAGE",
      environment: "PRODUCTION",
      credentialSecretRef: "n/a",
      credentialConfigured: Boolean(process.env.PERSISTENT_DATA_PATH?.trim() || process.env.SQLITE_PATH?.trim()),
      credentialValid: false,
      endpointConfigured: Boolean(process.env.PERSISTENT_DATA_PATH?.trim()),
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: process.env.PERSISTENT_DATA_PATH === "/var/data" ? "CONFIGURED" : "BLOCKED",
      blockingReason: "BLOCKED — MANUAL DEPLOYMENT CONFIGURATION REQUIRED (/var/data)",
      requiredHumanApproval: true,
    },
  ];

  // Payment sub-providers read-only metadata
  for (const kind of listAllProviderKinds().filter((k) => k !== "MOCK")) {
    if (!hasProviderSecretRef(kind)) continue;
    const secret = resolveGenericSecretRef({
      providerId: `payment-${kind.toLowerCase()}`,
      secretRefEnvKey: `PAYMENT_${kind}_SECRET_REF`,
      fallbackEnvKey: "PAYMENT_PROVIDER_SECRET",
    });
    entries.push({
      provider: `PAYMENT/${kind}`,
      environment: "PRODUCTION",
      credentialSecretRef: secret.secretRefKey,
      credentialConfigured: secret.secretRefConfigured,
      credentialValid: secret.credentialStatus === "CONFIGURED",
      endpointConfigured: secret.secretRefConfigured,
      endpointReachable: hasProductionEvidence("payment", kind.toLowerCase()),
      capabilityDeclared: true,
      capabilityValidated: hasProductionEvidence("payment", kind.toLowerCase()),
      liveNetworkEnabled: isProductionFlagEnabled("PAYMENT_PRODUCTION"),
      productionReady: false,
      status: secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      blockingReason: secret.secretRefConfigured ? "AWAITING_LIVE_VALIDATION" : "NOT_CONFIGURED",
      requiredHumanApproval: true,
    });
  }

  // Carrier profiles — configuration only, no labels
  for (const profile of CARRIER_PROFILES) {
    entries.push({
      provider: `CARRIER/${profile.carrierId}`,
      environment: "PRODUCTION",
      credentialSecretRef: "env:CARRIER_PROVIDER_SECRET_REF",
      credentialConfigured: byId("carrier")?.credentialConfigured ?? false,
      credentialValid: false,
      endpointConfigured: true,
      endpointReachable: false,
      capabilityDeclared: true,
      capabilityValidated: false,
      liveNetworkEnabled: false,
      productionReady: false,
      status: byId("carrier")?.credentialConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      blockingReason: "NO_LABEL_CREATION_WITHOUT_CREDENTIALS",
      requiredHumanApproval: true,
    });
  }

  return entries;
}
