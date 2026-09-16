import type { CreateOrderCapabilityState } from "./types";
import { buildInitialCapabilityState } from "./capability";

/**
 * Official capability promotion — only after successful controlled live validation.
 * Does NOT enable normal production order execution.
 */
export function promoteCreateOrderCapabilityValidated(validated: boolean): CreateOrderCapabilityState {
  const state = buildInitialCapabilityState();
  if (!validated) return state;

  state.declared = true;
  state.configured = true;
  state.authenticated = true;
  state.endpointAvailable = true;
  state.requestValidated = true;
  state.responseValidated = true;
  state.idempotencyValidated = true;
  state.errorHandlingValidated = true;
  state.statusValidated = true;
  state.trackingValidated = false;
  state.productionValidated = true;
  return state;
}
