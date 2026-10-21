const { CONNECTOR_STATUS } = require("../constants");
const { describeConnector } = require("./contracts");

const MOCK_FIXTURE = Object.freeze({
  machines: [
    {
      sourceRecordId: "fx-machine-220",
      manufacturer: "FixtureWorks",
      brand: "FixtureWorks",
      family: "FX",
      categoryId: "cme-cat-crawler-excavators",
      modelName: "FX-220",
      modelCode: "FX-220",
      generation: "A",
      yearFrom: 2018,
      yearTo: 2024,
      serialFrom: "FX220A00001",
      serialTo: "FX220A19999",
      engineManufacturer: "FixturePower",
      engineModel: "FP-6.7",
      revision: "A",
      region: "EU",
    },
    {
      sourceRecordId: "fx-machine-220b",
      manufacturer: "FixtureWorks",
      brand: "FixtureWorks",
      family: "FX",
      categoryId: "cme-cat-crawler-excavators",
      modelName: "FX-220",
      modelCode: "FX-220",
      generation: "B",
      yearFrom: 2024,
      yearTo: 2026,
      serialFrom: "FX220B00001",
      serialTo: "FX220B19999",
      engineManufacturer: "FixturePower",
      engineModel: "FP-6.7T",
      revision: "B",
      region: "EU",
    },
  ],
  parts: [
    {
      sourceRecordId: "fx-part-hyd-1001",
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturerPartNumber: "FW-HYD-1001",
      description: "Main hydraulic pump seal kit",
      descriptions: { de: "Dichtsatz Hydraulikpumpe", en: "Main hydraulic pump seal kit", tr: "Hidrolik pompa conta seti" },
      categoryId: "cme-cat-crawler-excavators",
      attributes: { position: "main-pump" },
      dimensions: { value: 120, unit: "mm" },
    },
    {
      sourceRecordId: "fx-part-hyd-1001-s",
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-FX-HYD-1001-S",
      previousPartNumbers: ["OEM-FX-HYD-1001"],
      description: "Superseding hydraulic pump seal kit",
      descriptions: { de: "Nachfolge-Dichtsatz", en: "Superseding hydraulic pump seal kit" },
      categoryId: "cme-cat-crawler-excavators",
    },
    {
      sourceRecordId: "fx-part-filter-200",
      manufacturer: "AfterFixture",
      oemPartNumber: "AF-FLT-200",
      aftermarketPartNumber: "AF-FLT-200",
      description: "Aftermarket hydraulic filter",
      descriptions: { en: "Aftermarket hydraulic filter", de: "Aftermarket Hydraulikfilter" },
      categoryId: "cme-cat-crawler-excavators",
    },
  ],
  relations: [
    {
      fromSourceRecordId: "fx-part-hyd-1001",
      toSourceRecordId: "fx-part-hyd-1001-s",
      kind: "SUPERSESSION",
    },
  ],
  evidence: [
    {
      sourceRecordId: "fx-ev-1001-a",
      partSourceRecordId: "fx-part-hyd-1001",
      type: "manufacturer_catalog",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialFrom: "FX220A00001",
      serialTo: "FX220A19999",
      yearFrom: 2018,
      yearTo: 2023,
      position: "main-pump",
      requiresSerial: true,
      sourceReliability: 0.95,
      providerId: "mock-manufacturer-catalog",
    },
    {
      sourceRecordId: "fx-ev-1001-excl",
      partSourceRecordId: "fx-part-hyd-1001",
      type: "explicit_exclusion",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialFrom: "FX220B00001",
      serialTo: "FX220B19999",
      position: "main-pump",
      providerId: "mock-manufacturer-catalog",
    },
    {
      sourceRecordId: "fx-ev-alt",
      partSourceRecordId: "fx-part-filter-200",
      type: "unverified_alternative",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      canCertify: false,
      providerId: "mock-aftermarket",
    },
  ],
  documents: [
    {
      sourceRecordId: "fx-doc-ipc-220",
      title: "FX-220 illustrated parts catalog (mock)",
      kind: "illustrated_parts_catalog",
      version: "2024.1",
      structured: false,
    },
  ],
  offers: [
    {
      sourceRecordId: "fx-offer-1",
      partSourceRecordId: "fx-part-hyd-1001",
      supplierId: "mock-supplier-eu",
      supplierCountry: "DE",
      warehouseId: "mock-wh-leipzig",
      warehouseLocation: { city: "Leipzig", country: "DE", verified: true },
      supplierSku: "SUP-HYD-1001",
      stockQuantity: 4,
      observedAt: "2026-10-20T00:00:00.000Z",
      leadTimeDays: 3,
      supplierPrice: 84.5,
      currency: "EUR",
      shippingCost: 12.4,
      shippingOption: "freight",
    },
    {
      sourceRecordId: "fx-offer-stale",
      partSourceRecordId: "fx-part-hyd-1001",
      supplierId: "mock-supplier-pl",
      supplierCountry: "PL",
      warehouseId: "mock-wh-unknown",
      warehouseLocation: null,
      supplierSku: "PL-HYD-1001",
      stockQuantity: 20,
      observedAt: "2024-01-01T00:00:00.000Z",
      leadTimeDays: 10,
      supplierPrice: 70,
      currency: "EUR",
      shippingCost: 28,
    },
  ],
  suppliers: [
    { id: "mock-supplier-eu", name: "Mock EU Parts", country: "DE", headquartersCountry: "DE" },
    { id: "mock-supplier-pl", name: "Mock PL Parts", country: "PL", headquartersCountry: "PL" },
  ],
  warehouses: [
    { id: "mock-wh-leipzig", supplierId: "mock-supplier-eu", location: { city: "Leipzig", country: "DE", verified: true } },
    { id: "mock-wh-unknown", supplierId: "mock-supplier-pl", location: null },
  ],
});

function createMockConnector(options = {}) {
  const failMode = options.failMode || null;
  const meta = describeConnector({
    id: "mock-local",
    name: "Local deterministic construction catalog",
    kinds: [
      "MachineCatalogConnector",
      "PartCatalogConnector",
      "SupplierInventoryConnector",
      "SupplierPricingConnector",
      "TechnicalDocumentConnector",
      "CompatibilityEvidenceProvider",
    ],
    interfaces: ["MOCK", "JSON"],
    capabilities: [
      "machines",
      "parts",
      "evidence",
      "documents",
      "offers",
      "incremental",
      "full",
    ],
    status: CONNECTOR_STATUS.CODE_READY,
    mock: true,
    incrementalSync: true,
    fullSync: true,
    note: "Deterministic fixture only. Not a live manufacturer or supplier integration.",
  });

  async function healthCheck() {
    return { ok: true, status: CONNECTOR_STATUS.CODE_READY, liveCalls: false, mock: true };
  }

  async function fetchCatalog() {
    if (failMode === "timeout") {
      const error = new Error("provider_timeout");
      error.retryable = true;
      throw error;
    }
    if (failMode === "partial") {
      return {
        ok: true,
        mock: true,
        configured: false,
        records: {
          ...MOCK_FIXTURE,
          parts: [...MOCK_FIXTURE.parts, { sourceRecordId: "bad", manufacturer: "", oemPartNumber: "" }],
        },
      };
    }
    return {
      ok: true,
      mock: true,
      configured: false,
      liveCalls: false,
      records: MOCK_FIXTURE,
    };
  }

  return {
    ...meta,
    fetchCatalog,
    healthCheck,
    fixture: MOCK_FIXTURE,
  };
}

module.exports = {
  createMockConnector,
  MOCK_FIXTURE,
};
