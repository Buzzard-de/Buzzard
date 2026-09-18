import type { ValidationEnvironment } from "./types";

/** Environments that may count as genuine production evidence. */
export const ACCEPTED_EVIDENCE_ENVIRONMENTS: ValidationEnvironment[] = [
  "PRODUCTION",
  "CONTROLLED_VALIDATION",
];

/** Environments that must never promote to VALIDATED/READY/EXECUTED/GO_LIVE. */
export const REJECTED_EVIDENCE_ENVIRONMENTS = [
  "MOCK",
  "SANDBOX",
  "SIMULATION",
  "UNIT_TEST",
  "FIXTURE",
] as const;

export function isAcceptedEvidenceEnvironment(env: string): env is ValidationEnvironment {
  return ACCEPTED_EVIDENCE_ENVIRONMENTS.includes(env as ValidationEnvironment);
}

export function isRejectedEvidenceEnvironment(env: string): boolean {
  return (REJECTED_EVIDENCE_ENVIRONMENTS as readonly string[]).includes(env);
}

export function assertEvidenceEnvironmentAllowed(env: string, context: string): void {
  if (isRejectedEvidenceEnvironment(env)) {
    throw new Error(`${context}:FAKE_EVIDENCE_REJECTED:${env}`);
  }
  if (!isAcceptedEvidenceEnvironment(env)) {
    throw new Error(`${context}:EVIDENCE_ENVIRONMENT_NOT_ACCEPTED:${env}`);
  }
}

let rejectedAttempts = 0;

export function countRejectedEvidenceAttempts(): number {
  return rejectedAttempts;
}

export function recordRejectedEvidenceAttempt(): void {
  rejectedAttempts += 1;
}

export function resetRejectedEvidenceAttemptsForTests(): void {
  rejectedAttempts = 0;
}
