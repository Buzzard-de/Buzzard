export {
  ACCEPTED_EVIDENCE_ENVIRONMENTS,
  REJECTED_EVIDENCE_ENVIRONMENTS,
  isAcceptedEvidenceEnvironment,
  isRejectedEvidenceEnvironment,
  assertEvidenceEnvironmentAllowed,
  countRejectedEvidenceAttempts,
  recordRejectedEvidenceAttempt,
  resetRejectedEvidenceAttemptsForTests,
} from "@/lib/production-access/evidencePolicy";
