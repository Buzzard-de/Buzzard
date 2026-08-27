/** TecDoc vehicle/compatibility mock adapter (P1-06). No real TecDoc API calls. */

const MOCK_VEHICLES = [
  { id: "veh-vw-golf-7", brand: "VW", model: "Golf", type: "VII", year_from: 2012, year_to: 2020, engine: "1.4 TSI 122 PS" },
  { id: "veh-bmw-f30", brand: "BMW", model: "3er", type: "F30", year_from: 2012, year_to: 2019, engine: "320d 184 PS" },
  { id: "veh-merc-w205", brand: "Mercedes-Benz", model: "C-Klasse", type: "W205", year_from: 2014, year_to: 2021, engine: "C 220 d" },
];

const MOCK_COMPATIBILITY = [
  { article: "MOCK-001", vehicle_id: "veh-vw-golf-7", part_reference: "34116761244" },
  { article: "MOCK-002", vehicle_id: "veh-bmw-f30", part_reference: "11427566327" },
];

const capabilities = ["vehicle_lookup", "compatibility", "catalog"];

async function fetchCatalog(options = {}) {
  return {
    ok: true,
    mock: true,
    message: "TecDoc catalog mock — configure TECDOC_API_KEY for production integration.",
    records: [],
    vehicles: MOCK_VEHICLES,
    compatibility: MOCK_COMPATIBILITY,
    configured: Boolean(process.env.TECDOC_API_KEY),
  };
}

async function fetchStock() {
  return { ok: true, mock: true, records: [] };
}

async function fetchPrices() {
  return { ok: true, mock: true, records: [] };
}

function lookupVehicle(query = {}) {
  const q = String(query.q || "").toLowerCase();
  const brand = String(query.brand || "").toLowerCase();
  return MOCK_VEHICLES.filter((v) => {
    if (brand && v.brand.toLowerCase() !== brand) return false;
    if (!q) return true;
    return `${v.brand} ${v.model} ${v.type} ${v.engine}`.toLowerCase().includes(q);
  });
}

function getCompatibility(articleOrSku) {
  const key = String(articleOrSku || "").toLowerCase();
  return MOCK_COMPATIBILITY.filter((row) => row.article.toLowerCase() === key).map((row) => {
    const vehicle = MOCK_VEHICLES.find((v) => v.id === row.vehicle_id);
    return { ...row, vehicle };
  });
}

module.exports = {
  name: "TecDoc Mock Adapter",
  mock: true,
  capabilities,
  fetchCatalog,
  fetchStock,
  fetchPrices,
  lookupVehicle,
  getCompatibility,
};
