#!/usr/bin/env node
/**
 * Generates data/automotive/automotive_core_12_categories.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CATEGORY_DEFS = [
  {
    id: "tires_wheels",
    slug: "tires-wheels",
    name: { de: "Reifen & Felgen", en: "Tires & Wheels", tr: "Lastik & Jant", ar: "الإطارات والجنوط" },
    vehicleTypes: ["car", "van", "truck", "bus", "tractor", "motorcycle", "trailer"],
    attributes: ["width", "aspectRatio", "rimDiameter", "loadIndex", "speedRating", "season", "brand"],
    children: [
      "Car Tires", "SUV/4x4 Tires", "Van Tires", "Truck Tires", "Bus Tires", "Tractor Tires",
      "Agricultural Tires", "Construction Machine Tires", "Motorcycle Tires", "Scooter Tires",
      "Trailer Tires", "Bicycle Tires", "Rims", "Steel Rims", "Alloy Wheels", "Wheel Accessories",
    ],
    legacyMap: "auto-sub-01",
  },
  {
    id: "brakes",
    slug: "brakes",
    name: { de: "Bremsen", en: "Brakes", tr: "Fren Sistemi", ar: "نظام الفرامل" },
    vehicleTypes: ["car", "van", "truck", "bus", "motorcycle", "trailer"],
    attributes: ["brakeType", "axle", "diameter", "thickness", "material", "wearSensor"],
    children: ["Brake Pads", "Brake Discs", "Brake Drums", "Brake Shoes", "Calipers", "Brake Lines", "Sensors", "Brake Kits"],
    legacyMap: "auto-sub-04",
  },
  {
    id: "oils_fluids",
    slug: "oils-fluids",
    name: { de: "Motoröle & Flüssigkeiten", en: "Oils & Fluids", tr: "Motor Yağları & Sıvılar", ar: "زيوت وم fluids" },
    vehicleTypes: ["car", "van", "truck", "bus", "tractor", "motorcycle"],
    attributes: ["viscosity", "sae", "api", "acea", "oemApproval", "volume"],
    children: ["Engine Oil", "Gear Oil", "ATF", "CVT Fluid", "Coolant", "Antifreeze", "Brake Fluid", "Hydraulic Fluid", "Washer Fluid", "Additives"],
    legacyMap: "auto-sub-03",
  },
  {
    id: "engine_parts",
    slug: "engine-parts",
    name: { de: "Motor & Motor Teile", en: "Engine & Engine Parts", tr: "Motor & Motor Parçaları", ar: "المحرك وقطع المحرك" },
    vehicleTypes: ["car", "van", "truck", "bus", "tractor", "motorcycle"],
    attributes: ["engineCode", "displacement", "cylinders", "fuel", "oem", "mpn"],
    children: ["Complete Engines", "Engine Blocks", "Cylinder Heads", "Pistons", "Rings", "Bearings", "Crankshafts", "Camshafts", "Timing Belts", "Timing Chains", "Water Pumps", "Oil Pumps", "Turbochargers", "Injectors", "Gaskets", "Seals"],
    legacyMap: "auto-sub-02",
  },
  {
    id: "spare_parts",
    slug: "spare-parts",
    name: { de: "Ersatzteile", en: "Spare Parts", tr: "Yedek Parça", ar: "قطع الغيار" },
    vehicleTypes: ["car", "van", "truck", "bus", "tractor", "motorcycle", "trailer"],
    attributes: ["oem", "mpn", "position", "axle", "side", "engineCode"],
    children: ["Filters", "Steering", "Suspension", "Exhaust", "Cooling", "Clutch", "Transmission", "Driveshaft", "Wheel Bearings", "Sensors", "Body Parts", "Lighting"],
    legacyMap: "auto-sub-05",
  },
  {
    id: "batteries_electrical",
    slug: "batteries-electrical",
    name: { de: "Batterie & Elektrik", en: "Batteries & Electrical", tr: "Akü & Elektrik", ar: "البطاريات والكهرباء" },
    vehicleTypes: ["car", "van", "truck", "bus", "motorcycle"],
    attributes: ["voltage", "ah", "cca", "technology", "polarity"],
    children: ["Starter Batteries", "AGM", "EFB", "Alternators", "Starter Motors", "Spark Plugs", "Glow Plugs", "Sensors", "Relays", "Fuses", "Lamps", "Electrical Modules"],
    legacyMap: "auto-sub-06",
  },
  {
    id: "agricultural_vehicles",
    slug: "agricultural-vehicles",
    name: { de: "Traktor & Landwirtschaft", en: "Agricultural Vehicles", tr: "Traktör & Tarım Araçları", ar: "المركبات الزراعية" },
    vehicleTypes: ["tractor", "harvester", "agriculturalMachine"],
    attributes: ["manufacturer", "model", "engineCode", "power", "pto", "tireSize"],
    children: ["Tractors", "Harvesters", "Agricultural Machines", "Implements", "Agricultural Trailers", "Agricultural Tires", "Agricultural Parts"],
    legacyMap: "auto-sub-14",
  },
  {
    id: "trucks_commercial",
    slug: "trucks-commercial",
    name: { de: "LKW & Nutzfahrzeuge", en: "Trucks & Commercial", tr: "Kamyon & Ticari Araçlar", ar: "الشاحنات والمركبات التجارية" },
    vehicleTypes: ["truck", "van", "semiTruck", "lightCommercialVehicle"],
    attributes: ["manufacturer", "model", "engineCode", "gvw", "axle"],
    children: ["Trucks", "Vans", "LCV", "Semi Trucks", "Truck Tires", "Truck Brakes", "Truck Parts", "Commercial Vehicle Parts"],
    legacyMap: "auto-sub-14",
  },
  {
    id: "buses_minibuses",
    slug: "buses-minibuses",
    name: { de: "Bus & Minibus", en: "Buses & Minibuses", tr: "Otobüs & Minibüs", ar: "الحافلات والميني باص" },
    vehicleTypes: ["bus", "minibus", "coach"],
    attributes: ["make", "model", "engineCode", "vehicleClass", "wheelSize"],
    children: ["City Buses", "Coaches", "Minibuses", "Bus Tires", "Bus Brakes", "Bus Parts"],
    legacyMap: "auto-sub-14",
  },
  {
    id: "construction_machinery",
    slug: "construction-machinery",
    name: { de: "Baumaschinen", en: "Construction Machinery", tr: "İş Makineleri", ar: "معدات البناء" },
    vehicleTypes: ["excavator", "wheelLoader", "forklift", "crane", "bulldozer"],
    attributes: ["manufacturer", "model", "engineCode", "operatingWeight", "attachmentType"],
    children: ["Excavators", "Wheel Loaders", "Forklifts", "Cranes", "Bulldozers", "Rollers", "Telehandlers", "Construction Tires", "Hydraulic Parts", "Construction Parts"],
    legacyMap: "auto-sub-14",
  },
  {
    id: "motorcycles_scooters",
    slug: "motorcycles-scooters",
    name: { de: "Motorrad & Roller", en: "Motorcycles & Scooters", tr: "Motosiklet & Scooter", ar: "الدراجات النارية والسكooters" },
    vehicleTypes: ["motorcycle", "scooter", "moped", "atv", "quad"],
    attributes: ["engineCC", "engineCode", "frontTire", "rearTire", "abs"],
    children: ["Motorcycles", "Scooters", "Mopeds", "ATV", "Quad", "Electric Motorcycles", "Electric Scooters", "Motorcycle Tires", "Motorcycle Brakes", "Motorcycle Parts"],
    legacyMap: "auto-sub-15",
  },
  {
    id: "trailers",
    slug: "trailers",
    name: { de: "Anhänger & Trailer", en: "Trailers", tr: "Römork & Treyler", ar: "المقطورات" },
    vehicleTypes: ["carTrailer", "truckTrailer", "semiTrailer", "boatTrailer"],
    attributes: ["axles", "gvw", "payload", "coupling", "wheelSize", "tireSize"],
    children: ["Car Trailers", "Truck Trailers", "Semi Trailers", "Agricultural Trailers", "Construction Trailers", "Boat Trailers", "Utility Trailers", "Trailer Tires", "Trailer Brakes", "Trailer Parts"],
    legacyMap: "auto-sub-01",
  },
];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCategory(def) {
  const subcategories = def.children.map((label, idx) => {
    const subId = `${def.id}__${slugify(label)}`;
    const productTypes = ["standard", "premium", "oem", "aftermarket"].map((pt, pti) => ({
      id: `${subId}__${pt}`,
      slug: pt,
      name: { de: pt, en: pt, tr: pt, ar: pt },
      sortOrder: pti + 1,
    }));
    return {
      id: subId,
      slug: slugify(label),
      name: { de: label, en: label, tr: label, ar: label },
      sortOrder: idx + 1,
      productTypes,
      children: productTypes,
    };
  });

  return {
    id: def.id,
    slug: def.slug,
    name: def.name,
    description: def.name,
    vehicleTypes: def.vehicleTypes,
    attributes: def.attributes,
    validationRules: { requireIdentifiers: true, requireImages: true, uncertainMapping: "REVIEW_REQUIRED" },
    searchRules: { fields: def.attributes.concat(["sku", "gtin", "ean", "mpn", "oem", "brand"]) },
    fitmentRules: { required: def.id !== "oils_fluids", minConfidence: "HIGH" },
    supplierMappingRules: { minConfidence: "MEDIUM", unknownAction: "REVIEW_REQUIRED" },
    seoRules: { requireSlug: true, requireMeta: true, noFalseOffers: true },
    legacyCategoryId: def.legacyMap,
    children: subcategories,
    subcategories,
  };
}

const categories = CATEGORY_DEFS.map(buildCategory);
const output = {
  version: "1.0.0",
  engine: "automotive_core",
  categoryCount: categories.length,
  safety: {
    ready: false,
    status: "BLOCKED",
    diagnosticOnly: true,
  },
  categories,
  stats: {
    topLevel: categories.length,
    subcategories: categories.reduce((n, c) => n + c.subcategories.length, 0),
    productTypes: categories.reduce(
      (n, c) => n + c.subcategories.reduce((m, s) => m + s.productTypes.length, 0),
      0
    ),
  },
};

const outPath = path.join(ROOT, "data/automotive/automotive_core_12_categories.json");
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${outPath}`);
console.log(`Stats:`, output.stats);
