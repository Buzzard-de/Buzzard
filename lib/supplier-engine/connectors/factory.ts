import type { ConnectorConfig, IntegrationType, SupplierConfig } from "../types";
import { SupplierConnector } from "./base";
import { ApiSupplierConnector } from "./api";
import { XmlSupplierConnector } from "./xml";
import { CsvSupplierConnector } from "./csv";
import { ManualSupplierConnector } from "./manual";

export function createConnector(
  supplier: SupplierConfig,
  integrationType: IntegrationType,
  connectorConfig: ConnectorConfig = {}
): SupplierConnector {
  switch (integrationType) {
    case "api":
      return new ApiSupplierConnector(supplier, connectorConfig);
    case "xml":
      return new XmlSupplierConnector(supplier, connectorConfig);
    case "csv":
      return new CsvSupplierConnector(supplier, connectorConfig);
    case "manual":
      return new ManualSupplierConnector(supplier, connectorConfig);
    default:
      throw new Error(`UNKNOWN_INTEGRATION_TYPE:${integrationType}`);
  }
}
