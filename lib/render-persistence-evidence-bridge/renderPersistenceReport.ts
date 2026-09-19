import { countRejectedEvidenceAttempts } from "@/lib/production-access/evidencePolicy";
import { buildRenderPersistenceHumanActions } from "./humanActions";
import { countExpiredRenderPersistenceEvidence, listRenderPersistenceEvidence } from "./evidenceStore";
import { buildRenderPersistenceLiveStatus, buildRenderPersistenceLocalHints } from "./persistenceStatus";
import type { RenderPersistenceVerificationReport } from "./types";

export function buildRenderPersistenceVerificationReport(): RenderPersistenceVerificationReport {
  const live = buildRenderPersistenceLiveStatus();
  const localHints = buildRenderPersistenceLocalHints();
  const actions = buildRenderPersistenceHumanActions();

  return {
    generatedAt: new Date().toISOString(),
    live,
    localHints,
    acceptedEvidenceCount: listRenderPersistenceEvidence(false).length,
    expiredEvidenceCount: countExpiredRenderPersistenceEvidence(),
    rejectedEvidenceAttempts: countRejectedEvidenceAttempts(),
    nextHumanAction: actions[0]?.action,
    humanActionCount: actions.length,
  };
}
