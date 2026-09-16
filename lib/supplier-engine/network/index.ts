export type {
  SupplierAuthType,
  SupplierConnectorEnvironment,
  SupplierHttpRequest,
  SupplierHttpResponse,
  SupplierTransport,
  SupplierTransportError,
} from "./types";

export {
  SUPPLIER_NETWORK_CONFIG,
  canUseProductionNetwork,
  isSupplierNetworkEnabled,
  isSupplierOrderNetworkEnabled,
  resolveConnectorEnvironment,
} from "./config";

export {
  extractAllowedHosts,
  isBlockedHost,
  validateSupplierEndpoint,
} from "./allowlist";

export { safeParseJson, validateContentType, validateResponseSize } from "./responseSecurity";
export { SupplierHttpTransport, createSupplierHttpTransport } from "./httpTransport";
export {
  isInScopedValidationNetworkContext,
  getScopedValidationNetworkContext,
  withScopedValidationNetwork,
  isScopedValidationNetworkEnabled,
  canUseScopedValidationNetwork,
  type ScopedValidationNetworkContext,
} from "./scopedValidationNetwork";
export {
  MockSupplierTransport,
  buildMockTransportFixtures,
  resetMockTransportScenarios,
  setMockTransportScenario,
  type MockTransportScenario,
} from "./mockTransport";
