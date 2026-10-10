/**
 * Buzzard Automotive & Motor Vehicles
 * Master taxonomy definition.
 *
 * Structural taxonomy only — no supplier calls, publishing,
 * sales activation or payment activation.
 */
const AUTOMOTIVE_ROOT = {
  id: "automotive-motor-vehicles",
  slug: "automotive-motor-vehicles",
  name: {
    de: "Automobil & Motorfahrzeuge",
    en: "Automotive & Motor Vehicles",
    tr: "Otomotiv ve Motorlu Araçlar",
    ar: "السيارات والمركبات ذات المحركات",
  },
};

const VEHICLE_TYPES = [
  "passenger-car",
  "suv",
  "van",
  "light-commercial",
  "truck",
  "bus",
  "trailer",
  "semi-trailer",
  "caravan-motorhome",
  "motorcycle",
  "scooter",
  "moped",
  "atv-quad",
  "tractor",
  "agricultural-machinery",
  "construction-machinery",
  "industrial-utility",
  "off-road",
  "racing",
  "electric-vehicle",
  "hybrid-vehicle",
];

const TIRE_ATTRIBUTE_KEYS = [
  "width",
  "aspectRatio",
  "rimDiameter",
  "loadIndex",
  "speedRating",
  "season",
  "runFlat",
  "xlReinforced",
  "commercialRating",
  "tubeType",
  "axlePosition",
  "vehicleCompatibility",
];

const AUTOMOTIVE_CATEGORIES = [
  {
    id: "tires",
    slug: "tires",
    name: {
      de: "Reifen",
      en: "Tires",
      tr: "Lastikler",
      ar: "الإطارات",
    },
    vehicleTypes: [
      "passenger-car",
      "suv",
      "van",
      "light-commercial",
      "truck",
      "bus",
      "motorcycle",
      "scooter",
      "atv-quad",
      "tractor",
      "agricultural-machinery",
      "construction-machinery",
      "trailer",
      "semi-trailer",
      "caravan-motorhome",
      "off-road",
      "racing",
      "electric-vehicle",
      "hybrid-vehicle",
    ],
    attributeKeys: TIRE_ATTRIBUTE_KEYS,
    subcategories: [
      {
        id: "passenger-car-tires",
        name: {
          de: "PKW-Reifen",
          en: "Passenger Car Tires",
          tr: "Binek Araç Lastikleri",
          ar: "إطارات سيارات الركوب",
        },
        types: ["summer", "winter", "all-season", "performance", "run-flat", "xl-reinforced", "ev-optimized"],
      },
      {
        id: "light-commercial-tires",
        name: {
          de: "Transporter-Reifen",
          en: "Light Commercial Tires",
          tr: "Hafif Ticari Lastikleri",
          ar: "إطارات المركبات التجارية الخفيفة",
        },
      },
      {
        id: "truck-tires",
        name: { de: "LKW-Reifen", en: "Truck Tires", tr: "Kamyon Lastikleri", ar: "إطارات الشاحنات" },
      },
      {
        id: "bus-tires",
        name: { de: "Bus-Reifen", en: "Bus Tires", tr: "Otobüs Lastikleri", ar: "إطارات الحافلات" },
      },
      {
        id: "motorcycle-tires",
        name: {
          de: "Motorrad-Reifen",
          en: "Motorcycle Tires",
          tr: "Motosiklet Lastikleri",
          ar: "إطارات الدراجات النارية",
        },
      },
      {
        id: "scooter-tires",
        name: { de: "Scooter-Reifen", en: "Scooter Tires", tr: "Scooter Lastikleri", ar: "إطارات السكوتر" },
      },
      {
        id: "atv-quad-tires",
        name: {
          de: "ATV / Quad Reifen",
          en: "ATV / Quad Tires",
          tr: "ATV / Quad Lastikleri",
          ar: "إطارات ATV وQuad",
        },
      },
      {
        id: "tractor-tires",
        name: { de: "Traktorreifen", en: "Tractor Tires", tr: "Traktör Lastikleri", ar: "إطارات الجرارات" },
      },
      {
        id: "agricultural-tires",
        name: {
          de: "Landmaschinen-Reifen",
          en: "Agricultural Machinery Tires",
          tr: "Tarım Makinesi Lastikleri",
          ar: "إطارات الآلات الزراعية",
        },
      },
      {
        id: "construction-tires",
        name: {
          de: "Baumaschinen-Reifen",
          en: "Construction Machinery Tires",
          tr: "İş Makinesi Lastikleri",
          ar: "إطارات معدات البناء",
        },
      },
      {
        id: "trailer-tires",
        name: { de: "Anhänger-Reifen", en: "Trailer Tires", tr: "Römork Lastikleri", ar: "إطارات المقطورات" },
      },
      {
        id: "off-road-tires",
        name: { de: "Offroad-Reifen", en: "Off-Road Tires", tr: "Off-Road Lastikleri", ar: "إطارات الطرق الوعرة" },
      },
      {
        id: "racing-tires",
        name: { de: "Rennreifen", en: "Racing Tires", tr: "Yarış Lastikleri", ar: "إطارات السباق" },
      },
    ],
  },
  {
    id: "wheels-rims",
    slug: "wheels-rims",
    name: { de: "Felgen & Räder", en: "Wheels & Rims", tr: "Jantlar ve Tekerlekler", ar: "العجلات والجنوط" },
  },
  {
    id: "brakes",
    slug: "brakes",
    name: { de: "Bremsanlage", en: "Braking System", tr: "Fren Sistemi", ar: "نظام الفرامل" },
  },
  {
    id: "engine",
    slug: "engine",
    name: { de: "Motor & Motorteile", en: "Engine & Engine Parts", tr: "Motor ve Motor Parçaları", ar: "المحرك وقطع المحرك" },
  },
  {
    id: "fluids",
    slug: "fluids",
    name: { de: "Öle & Flüssigkeiten", en: "Oils & Fluids", tr: "Yağlar ve Sıvılar", ar: "الزيوت والسوائل" },
  },
  {
    id: "filters",
    slug: "filters",
    name: { de: "Filter", en: "Filters", tr: "Filtreler", ar: "الفلاتر" },
  },
  {
    id: "battery-electrical",
    slug: "battery-electrical",
    name: { de: "Batterien & Elektrik", en: "Batteries & Electrical", tr: "Akü ve Elektrik", ar: "البطاريات والكهرباء" },
  },
  {
    id: "exhaust-emissions",
    slug: "exhaust-emissions",
    name: { de: "Abgasanlage & Emissionen", en: "Exhaust & Emissions", tr: "Egzoz ve Emisyon", ar: "العادم والانبعاثات" },
  },
  {
    id: "cooling",
    slug: "cooling",
    name: { de: "Kühlsystem", en: "Cooling System", tr: "Soğutma Sistemi", ar: "نظام التبريد" },
  },
  {
    id: "transmission",
    slug: "transmission",
    name: {
      de: "Getriebe & Antrieb",
      en: "Transmission & Drivetrain",
      tr: "Şanzıman ve Aktarma",
      ar: "ناقل الحركة ونظام الدفع",
    },
  },
  {
    id: "clutch",
    slug: "clutch",
    name: { de: "Kupplung", en: "Clutch", tr: "Debriyaj", ar: "القابض" },
  },
  {
    id: "suspension",
    slug: "suspension",
    name: { de: "Fahrwerk", en: "Suspension", tr: "Süspansiyon", ar: "نظام التعليق" },
  },
  {
    id: "steering",
    slug: "steering",
    name: { de: "Lenkung", en: "Steering", tr: "Direksiyon", ar: "نظام التوجيه" },
  },
  {
    id: "fuel-system",
    slug: "fuel-system",
    name: { de: "Kraftstoffsystem", en: "Fuel System", tr: "Yakıt Sistemi", ar: "نظام الوقود" },
  },
  {
    id: "ignition",
    slug: "ignition",
    name: { de: "Zündung", en: "Ignition", tr: "Ateşleme", ar: "الإشعال" },
  },
  {
    id: "air-intake",
    slug: "air-intake",
    name: { de: "Luftansaugung", en: "Air Intake", tr: "Hava Emme", ar: "سحب الهواء" },
  },
  {
    id: "turbo",
    slug: "turbo",
    name: { de: "Turboaufladung", en: "Turbocharging", tr: "Turbo Sistemleri", ar: "الشحن التوربيني" },
  },
  {
    id: "heating-ac",
    slug: "heating-ac",
    name: {
      de: "Heizung & Klimaanlage",
      en: "Heating & Air Conditioning",
      tr: "Kalorifer ve Klima",
      ar: "التدفئة وتكييف الهواء",
    },
  },
  {
    id: "vehicle-electronics",
    slug: "vehicle-electronics",
    name: { de: "Fahrzeugelektronik", en: "Vehicle Electronics", tr: "Araç Elektroniği", ar: "إلكترونيات المركبات" },
  },
  {
    id: "lighting",
    slug: "lighting",
    name: { de: "Beleuchtung", en: "Lighting", tr: "Aydınlatma", ar: "الإضاءة" },
  },
  {
    id: "body-exterior",
    slug: "body-exterior",
    name: { de: "Karosserie & Außenbereich", en: "Body & Exterior", tr: "Karoser ve Dış Aksam", ar: "الهيكل الخارجي" },
  },
  {
    id: "interior",
    slug: "interior",
    name: { de: "Innenraum", en: "Interior", tr: "İç Aksam", ar: "المقصورة الداخلية" },
  },
  {
    id: "safety",
    slug: "safety",
    name: { de: "Sicherheit", en: "Safety", tr: "Güvenlik", ar: "السلامة" },
  },
  {
    id: "workshop-garage",
    slug: "workshop-garage",
    name: { de: "Werkstatt & Garage", en: "Workshop & Garage", tr: "Servis ve Garaj", ar: "الورشة والجراج" },
  },
  {
    id: "tools",
    slug: "tools",
    name: { de: "Werkzeuge", en: "Tools", tr: "El Aletleri", ar: "الأدوات" },
  },
  {
    id: "vehicle-care",
    slug: "vehicle-care",
    name: { de: "Fahrzeugpflege", en: "Vehicle Care", tr: "Araç Bakım ve Temizlik", ar: "العناية بالمركبات" },
  },
  {
    id: "accessories",
    slug: "accessories",
    name: { de: "Fahrzeugzubehör", en: "Vehicle Accessories", tr: "Araç Aksesuarları", ar: "إكسسوارات المركبات" },
  },
  {
    id: "trailer-towing",
    slug: "trailer-towing",
    name: {
      de: "Anhänger & Zugtechnik",
      en: "Trailer & Towing",
      tr: "Römork ve Çekme Sistemleri",
      ar: "المقطورات والجر",
    },
  },
  {
    id: "commercial-vehicles",
    slug: "commercial-vehicles",
    name: {
      de: "Nutzfahrzeugteile",
      en: "Commercial Vehicle Parts",
      tr: "Ticari Araç Parçaları",
      ar: "قطع المركبات التجارية",
    },
  },
  {
    id: "motorcycle-parts",
    slug: "motorcycle-parts",
    name: {
      de: "Motorradteile",
      en: "Motorcycle Parts",
      tr: "Motosiklet Parçaları",
      ar: "قطع الدراجات النارية",
    },
  },
  {
    id: "agricultural",
    slug: "agricultural",
    name: { de: "Landmaschinen", en: "Agricultural Machinery", tr: "Tarım Makineleri", ar: "الآلات الزراعية" },
  },
  {
    id: "construction-machinery",
    slug: "construction-machinery",
    name: { de: "Baumaschinen", en: "Construction Machinery", tr: "İş Makineleri", ar: "معدات البناء" },
  },
  {
    id: "ev-hybrid",
    slug: "ev-hybrid",
    name: {
      de: "Elektro- & Hybridfahrzeuge",
      en: "EV & Hybrid",
      tr: "Elektrikli ve Hibrit Araçlar",
      ar: "المركبات الكهربائية والهجينة",
    },
  },
  {
    id: "motorsport",
    slug: "motorsport",
    name: { de: "Motorsport", en: "Motorsport", tr: "Motor Sporları", ar: "رياضة السيارات" },
  },
  {
    id: "off-road",
    slug: "off-road",
    name: { de: "Offroad", en: "Off-Road", tr: "Off-Road", ar: "الطرق الوعرة" },
  },
];

const PRODUCT_STATES = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"];

const AUTOMOTIVE_SAFETY_POLICY = Object.freeze({
  diagnosticOnly: true,
  autoActivate: false,
  activationAllowed: false,
  supplierLive: false,
  salesEnabled: false,
  publishEnabled: false,
  humanApprovalRequired: true,
});

function getAutomotiveTaxonomy() {
  return {
    root: AUTOMOTIVE_ROOT,
    vehicleTypes: VEHICLE_TYPES,
    categories: AUTOMOTIVE_CATEGORIES,
    productStates: PRODUCT_STATES,
    tireAttributeKeys: TIRE_ATTRIBUTE_KEYS,
    safety: AUTOMOTIVE_SAFETY_POLICY,
  };
}

function getCategoryById(categoryId) {
  return AUTOMOTIVE_CATEGORIES.find((c) => c.id === categoryId) || null;
}

module.exports = {
  AUTOMOTIVE_ROOT,
  VEHICLE_TYPES,
  TIRE_ATTRIBUTE_KEYS,
  AUTOMOTIVE_CATEGORIES,
  PRODUCT_STATES,
  AUTOMOTIVE_SAFETY_POLICY,
  getAutomotiveTaxonomy,
  getCategoryById,
};
