export function resolveObservationFailureInjection(code?: string): string | undefined {
  if (process.env.SUPPLIER_OBSERVATION_FAILURE_INJECTION) {
    return process.env.SUPPLIER_OBSERVATION_FAILURE_INJECTION;
  }
  return code;
}
