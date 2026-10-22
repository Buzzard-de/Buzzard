const { CONNECTOR_STATUS } = require("../constants");
const { describeConnector } = require("../../constructionMachinery/catalog/contracts");

const MOCK_FIXTURE = Object.freeze({
  machines: [
    {
      sourceRecordId: "ag-machine-t120",
      manufacturer: "AgriFixture",
      brand: "AgriFixture",
      family: "T",
      type: "utility-tractor",
      categoryId: "ame-cat-tractors-utility",
      modelName: "T-120",
      modelCode: "T-120",
      generation: "2",
      yearFrom: 2016,
      yearTo: 2023,
      serialFrom: "T120A00001",
      serialTo: "T120A19999",
      ptoSpeed: "540",
      linkageCategory: "II",
      voltage: "12",
      hydraulics: "open-center",
      revision: "A",
    },
    {
      sourceRecordId: "ag-machine-t120b",
      manufacturer: "AgriFixture",
      brand: "AgriFixture",
      family: "T",
      type: "utility-tractor",
      categoryId: "ame-cat-tractors-utility",
      modelName: "T-120",
      modelCode: "T-120",
      generation: "3",
      yearFrom: 2023,
      yearTo: 2026,
      serialFrom: "T120B00001",
      serialTo: "T120B19999",
      ptoSpeed: "540/1000",
      linkageCategory: "II",
      voltage: "12",
      hydraulics: "open-center",
      revision: "B",
    },
  ],
  parts: [
    {
      sourceRecordId: "ag-part-filter-air",
      manufacturer: "AgriFixture",
      oemPartNumber: "OEM-AG-FLT-AIR-01",
      manufacturerPartNumber: "AF-AIR-01",
      description: "Engine air filter",
      descriptions: { de: "Luftfilter", en: "Engine air filter", tr: "Hava filtresi" },
      synonyms: ["luftfilter", "filter"],
      categoryId: "ame-cat-tractors-utility",
      attributes: { position: "engine-air" },
    },
    {
      sourceRecordId: "ag-part-pto-shaft",
      manufacturer: "AgriFixture",
      oemPartNumber: "OEM-AG-PTO-540",
      description: "PTO shaft 540 rpm",
      descriptions: { de: "Gelenkwelle 540", en: "PTO shaft 540 rpm", tr: "PTO mili 540" },
      synonyms: ["zapfwelle", "gelenkwelle"],
      categoryId: "ame-cat-pto-shafts",
      pto: { speed: "540" },
      dimensions: { value: 1210, unit: "mm" },
    },
    {
      sourceRecordId: "ag-part-bolt",
      manufacturer: "AgriFixture",
      oemPartNumber: "OEM-AG-BLT-M16",
      description: "M16 linkage bolt",
      descriptions: { de: "M16 Dreipunkt-Schraube", en: "M16 linkage bolt", tr: "M16 cıvata" },
      categoryId: "ame-cat-three-point",
      thread: "M16x2",
      hitch: "II",
    },
    {
      sourceRecordId: "ag-part-nozzle-alt",
      manufacturer: "AfterAgri",
      oemPartNumber: "AA-NOZ-11003",
      aftermarketPartNumber: "AA-NOZ-11003",
      description: "Aftermarket spray nozzle",
      descriptions: { de: "Aftermarket Düse", en: "Aftermarket spray nozzle" },
      synonyms: ["düse", "nozzle"],
      categoryId: "ame-cat-nozzles",
    },
  ],
  relations: [{ fromSourceRecordId: "ag-part-filter-air", toSourceRecordId: "ag-part-nozzle-alt", kind: "UNVERIFIED_ALTERNATIVE" }],
  evidence: [
    {
      sourceRecordId: "ag-ev-filter-a",
      partSourceRecordId: "ag-part-filter-air",
      type: "manufacturer_catalog",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      serialFrom: "T120A00001",
      serialTo: "T120A19999",
      yearFrom: 2016,
      yearTo: 2022,
      position: "engine-air",
      requiresSerial: true,
      providerId: "mock-ag-catalog",
    },
    {
      sourceRecordId: "ag-ev-filter-excl",
      partSourceRecordId: "ag-part-filter-air",
      type: "explicit_exclusion",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      serialFrom: "T120B00001",
      serialTo: "T120B19999",
      providerId: "mock-ag-catalog",
    },
    {
      sourceRecordId: "ag-ev-pto",
      partSourceRecordId: "ag-part-pto-shaft",
      type: "manufacturer_catalog",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      ptoSpeed: "540",
      providerId: "mock-ag-catalog",
    },
    {
      sourceRecordId: "ag-ev-bolt",
      partSourceRecordId: "ag-part-bolt",
      type: "manufacturer_catalog",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      thread: "M16x2",
      hitch: "II",
      providerId: "mock-ag-catalog",
    },
    {
      sourceRecordId: "ag-ev-noz",
      partSourceRecordId: "ag-part-nozzle-alt",
      type: "unverified_alternative",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      canCertify: false,
      providerId: "mock-aftermarket",
    },
  ],
  suppliers: [
    { id: "mock-ag-supplier-de", name: "Mock Agri DE", country: "DE", headquartersCountry: "DE" },
    { id: "mock-ag-supplier-nl", name: "Mock Agri NL", country: "NL", headquartersCountry: "NL" },
  ],
  warehouses: [
    { id: "mock-ag-wh-osnabrueck", supplierId: "mock-ag-supplier-de", location: { city: "Osnabrück", country: "DE", verified: true } },
    { id: "mock-ag-wh-unknown", supplierId: "mock-ag-supplier-nl", location: null },
  ],
  offers: [
    {
      sourceRecordId: "ag-offer-filter",
      partSourceRecordId: "ag-part-filter-air",
      supplierId: "mock-ag-supplier-de",
      supplierCountry: "DE",
      warehouseId: "mock-ag-wh-osnabrueck",
      warehouseLocation: { city: "Osnabrück", country: "DE", verified: true },
      supplierSku: "DE-FLT-AIR-01",
      stockQuantity: 12,
      observedAt: "2026-10-20T00:00:00.000Z",
      leadTimeDays: 2,
      supplierPrice: 18.4,
      currency: "EUR",
      shippingCost: 6.5,
    },
    {
      sourceRecordId: "ag-offer-stale",
      partSourceRecordId: "ag-part-filter-air",
      supplierId: "mock-ag-supplier-nl",
      supplierCountry: "NL",
      warehouseId: "mock-ag-wh-unknown",
      stockQuantity: 40,
      observedAt: "2024-01-01T00:00:00.000Z",
      leadTimeDays: 14,
      supplierPrice: 16,
      currency: "EUR",
      shippingCost: 19,
    },
  ],
  documents: [
    {
      sourceRecordId: "ag-doc-t120",
      title: "T-120 parts catalog (mock)",
      kind: "illustrated_parts_catalog",
      version: "2024.1",
      structured: false,
    },
  ],
});

function createMockConnector(options = {}) {
  const failMode = options.failMode || null;
  const meta = describeConnector({
    id: "mock-ag-local",
    name: "Local deterministic agricultural catalog",
    kinds: ["MachineCatalogConnector", "PartCatalogConnector", "SupplierInventoryConnector", "CompatibilityEvidenceProvider"],
    interfaces: ["MOCK", "JSON"],
    capabilities: ["machines", "parts", "evidence", "offers"],
    status: CONNECTOR_STATUS.CODE_READY,
    mock: true,
    incrementalSync: true,
    fullSync: true,
    note: "Deterministic agricultural fixture only. Not a live supplier.",
  });

  return {
    ...meta,
    fixture: MOCK_FIXTURE,
    async healthCheck() {
      return { ok: true, status: CONNECTOR_STATUS.CODE_READY, liveCalls: false, mock: true, domain: "agricultural" };
    },
    async fetchCatalog() {
      if (failMode === "timeout") {
        const error = new Error("provider_timeout");
        error.retryable = true;
        throw error;
      }
      if (failMode === "partial") {
        return {
          ok: true,
          mock: true,
          records: { ...MOCK_FIXTURE, parts: [...MOCK_FIXTURE.parts, { sourceRecordId: "bad", manufacturer: "", oemPartNumber: "" }] },
        };
      }
      return { ok: true, mock: true, configured: false, liveCalls: false, records: MOCK_FIXTURE };
    },
  };
}

module.exports = { createMockConnector, MOCK_FIXTURE };
