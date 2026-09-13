import type { ConnectorConfig, IntegrationType, SupplierConfig } from "../types";
import { SupplierConnector } from "./base";
import { ApiSupplierConnector } from "./api";
import { XmlSupplierConnector } from "./xml";
import { CsvSupplierConnector } from "./csv";
import { ManualSupplierConnector } from "./manual";
import { TemplateSupplierConnector } from "./template";
import { B2bSandboxSupplierConnector } from "./b2b-sandbox";
import { profileToConnectorConfig } from "./b2b-sandbox/connectorConfig";

export function createConnector(
  supplier: SupplierConfig,
  integrationType: IntegrationType,
  connectorConfig: ConnectorConfig = {}
): SupplierConnector {
  const mergedConfig =
    integrationType === "b2b-sandbox" && supplier.connectorProfile
      ? { ...profileToConnectorConfig(supplier.connectorProfile), ...connectorConfig }
      : connectorConfig;

  switch (integrationType) {
    case "api":
      return new ApiSupplierConnector(supplier, connectorConfig);
    case "xml":
      return new XmlSupplierConnector(supplier, connectorConfig);
    case "csv":
      return new CsvSupplierConnector(supplier, connectorConfig);
    case "manual":
      return new ManualSupplierConnector(supplier, connectorConfig);
    case "template":
      return new TemplateSupplierConnector(supplier, mergedConfig);
    case "b2b-sandbox":
      return new B2bSandboxSupplierConnector(supplier, mergedConfig);
    default:
      throw new Error(`UNKNOWN_INTEGRATION_TYPE:${integrationType}`);
  }
}
