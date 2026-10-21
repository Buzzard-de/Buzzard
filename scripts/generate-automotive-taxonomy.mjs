#!/usr/bin/env node
/**
 * Generates data/automotive/automotive_category_tree.json
 * Run: node scripts/generate-automotive-taxonomy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "automotive", "automotive_category_tree.json");

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function i18n(de, en, tr, ar) {
  return { de, en, tr: tr || en, ar: ar || en };
}

function emptyI18n() {
  return { de: "", en: "", tr: "", ar: "" };
}

function baseNode({ id, parentId, slug, level, name, description, sortOrder, attributes, vehicleTypes, compatibilityRequired, seoTitle, seoDescription, children }) {
  return {
    id,
    parentId,
    slug,
    level,
    name,
    description: description || emptyI18n(),
    image: null,
    bannerImage: null,
    icon: null,
    active: true,
    sortOrder: sortOrder ?? 0,
    seo: {
      title: seoTitle || name,
      description: seoDescription || description || emptyI18n(),
    },
    attributes: attributes || [],
    vehicleTypes: vehicleTypes || [],
    compatibilityRequired: compatibilityRequired ?? false,
    children: children || [],
  };
}

function l3(parentId, sortOrder, en, de, tr, ar) {
  const slug = slugify(en);
  const id = `${parentId}--${slug}`;
  const name = i18n(de, en, tr, ar);
  return baseNode({ id, parentId, slug, level: 3, name, sortOrder });
}

function l3list(parentId, items) {
  return items.map(([en, de, tr, ar], idx) => l3(parentId, idx + 1, en, de, tr, ar));
}

const ROOT = baseNode({
  id: "automotive",
  parentId: null,
  slug: "automotive",
  level: 1,
  name: i18n(
    "Automobil & Motorfahrzeuge",
    "Automotive & Motor Vehicles",
    "Otomotiv ve Motorlu Araçlar",
    "السيارات والمركبات ذات المحركات"
  ),
  sortOrder: 1,
  children: [],
});

function l2(id, slug, name, l3Items) {
  const children = l3list(id, l3Items);
  return baseNode({
    id,
    parentId: "automotive",
    slug,
    level: 2,
    name,
    sortOrder: Number(id.replace("auto-sub-", "")),
    children,
  });
}

const SUBCATEGORIES = [
  l2(
    "auto-sub-01",
    "tires-wheels",
    i18n("Reifen & Räder", "Tires & Wheels", "Lastik ve Jant", "الإطارات والعجلات"),
    [
      ["Car Tires", "PKW-Reifen", "Otomobil Lastikleri", "إطارات السيارات"],
      ["Van Tires", "Transporter-Reifen", "Minibüs Lastikleri", "إطارات الشاحنات الصغيرة"],
      ["Truck Tires", "LKW-Reifen", "Kamyon Lastikleri", "إطارات الشاحنات"],
      ["Trailer Tires", "Anhängerreifen", "Römork Lastikleri", "إطارات المقطورات"],
      ["Tractor Tires", "Traktorreifen", "Traktör Lastikleri", "إطارات الجرارات"],
      ["Construction Machinery Tires", "Baumaschinenreifen", "İş Makinesi Lastikleri", "إطارات معدات البناء"],
      ["Motorcycle Tires", "Motorradreifen", "Motosiklet Lastikleri", "إطارات الدراجات النارية"],
      ["Bicycle Tires", "Fahrradreifen", "Bisiklet Lastikleri", "إطارات الدراجات"],
      ["Agricultural Tires", "Landwirtschaftsreifen", "Tarım Lastikleri", "إطارات زراعية"],
      ["ATV / Quad Tires", "ATV-/Quad-Reifen", "ATV / Quad Lastikleri", "إطارات ATV وQuad"],
      ["Industrial Tires", "Industriereifen", "Endüstriyel Lastikler", "إطارات صناعية"],
      ["Winter Tires", "Winterreifen", "Kış Lastikleri", "إطارات شتوية"],
      ["Summer Tires", "Sommerreifen", "Yaz Lastikleri", "إطارات صيفية"],
      ["All-Season Tires", "Ganzjahresreifen", "Dört Mevsim Lastikleri", "إطارات لجميع الفصول"],
      ["Rims", "Felgen", "Jantlar", "الجنوط"],
      ["Steel Rims", "Stahlfelgen", "Çelik Jantlar", "جنوط فولاذية"],
      ["Alloy Wheels", "Alufelgen", "Alaşım Jantlar", "عجلات سبائك"],
      ["Wheel Accessories", "Felgenzubehör", "Jant Aksesuarları", "إكسسوارات العجلات"],
      ["Wheel Bolts & Nuts", "Radschrauben & Radmuttern", "Bijon ve Somunlar", "مسامير وصواميل العجلات"],
      ["Tire Repair & Accessories", "Reifenreparatur & Zubehör", "Lastik Tamiri ve Aksesuarları", "إصلاح الإطارات وملحقاتها"],
    ]
  ),
  l2(
    "auto-sub-02",
    "engine-engine-parts",
    i18n("Motor & Motorteile", "Engine & Engine Parts", "Motor ve Motor Parçaları", "المحرك وقطع المحرك"),
    [
      ["Complete Engines", "Komplette Motoren"],
      ["Engine Blocks", "Motorblöcke"],
      ["Cylinder Heads", "Zylinderköpfe"],
      ["Pistons", "Kolben"],
      ["Piston Rings", "Kolbenringe"],
      ["Connecting Rods", "Pleuelstangen"],
      ["Crankshafts", "Kurbelwellen"],
      ["Camshafts", "Nockenwellen"],
      ["Timing Belts", "Zahnriemen"],
      ["Timing Chains", "Steuerketten"],
      ["Timing Chain Kits", "Steuerkettensätze"],
      ["Engine Bearings", "Motorlager"],
      ["Gaskets", "Dichtungen"],
      ["Cylinder Head Gaskets", "Zylinderkopfdichtungen"],
      ["Oil Pumps", "Ölpumpen"],
      ["Water Pumps", "Wasserpumpen"],
      ["Engine Mounts", "Motorlagerungen"],
      ["Valves", "Ventile"],
      ["Valve Covers", "Ventildeckel"],
      ["Turbochargers", "Turbolader"],
      ["Superchargers", "Kompressoren"],
      ["Intercoolers", "Ladeluftkühler"],
      ["Intake Manifolds", "Ansaugkrümmer"],
      ["Exhaust Manifolds", "Abgaskrümmer"],
      ["Engine Sensors", "Motorsensoren"],
      ["Engine Repair Kits", "Motor-Reparatursätze"],
    ]
  ),
  l2(
    "auto-sub-03",
    "engine-oils-fluids",
    i18n("Öle & Flüssigkeiten", "Engine Oils & Fluids", "Motor Yağları ve Sıvılar", "زيوت المحرك والسوائل"),
    [
      ["Engine Oil", "Motoröl"],
      ["Motorcycle Oil", "Motorradöl"],
      ["Truck Oil", "LKW-Öl"],
      ["Tractor Oil", "Traktoröl"],
      ["Hydraulic Oil", "Hydrauliköl"],
      ["Transmission Oil", "Getriebeöl"],
      ["Gear Oil", "Schaltgetriebeöl"],
      ["Differential Oil", "Differentialöl"],
      ["Brake Fluid", "Bremsflüssigkeit"],
      ["Coolant", "Kühlmittel"],
      ["Antifreeze", "Frostschutzmittel"],
      ["Windshield Washer Fluid", "Scheibenwaschflüssigkeit"],
      ["AdBlue", "AdBlue"],
      ["Power Steering Fluid", "Servolenkungsflüssigkeit"],
      ["ATF", "Automatikgetriebeöl (ATF)"],
      ["CVT Fluid", "CVT-Fluid"],
      ["DOT 3 Brake Fluid", "Bremsflüssigkeit DOT 3"],
      ["DOT 4 Brake Fluid", "Bremsflüssigkeit DOT 4"],
      ["DOT 5.1 Brake Fluid", "Bremsflüssigkeit DOT 5.1"],
      ["Oil Additives", "Ölzusätze"],
      ["Fuel Additives", "Kraftstoffzusätze"],
      ["Coolant Additives", "Kühlmittelzusätze"],
    ]
  ),
  l2(
    "auto-sub-04",
    "brakes",
    i18n("Bremsanlage", "Brakes", "Fren Sistemi", "نظام الفرامل"),
    [
      ["Brake Pads", "Bremsbeläge"],
      ["Brake Discs", "Bremsscheiben"],
      ["Brake Drums", "Bremstrommeln"],
      ["Brake Shoes", "Bremsbacken"],
      ["Brake Calipers", "Bremssättel"],
      ["Brake Caliper Repair Kits", "Bremssattel-Reparatursätze"],
      ["Brake Hoses", "Bremsschläuche"],
      ["Brake Lines", "Bremsleitungen"],
      ["Brake Sensors", "Bremsensoren"],
      ["Brake Wear Sensors", "Bremsverschleißsensoren"],
      ["Brake Master Cylinders", "Hauptbremszylinder"],
      ["Brake Boosters", "Bremskraftverstärker"],
      ["ABS Components", "ABS-Komponenten"],
      ["ABS Sensors", "ABS-Sensoren"],
      ["Parking Brake Parts", "Feststellbremsenteile"],
      ["Handbrake Cables", "Handbremsseile"],
      ["Brake Accessories", "Bremsenzubehör"],
      ["Brake Cleaning Products", "Bremsenreiniger"],
    ]
  ),
  l2(
    "auto-sub-05",
    "filters",
    i18n("Filter", "Filters", "Filtreler", "الفلاتر"),
    [
      ["Air Filters", "Luftfilter"],
      ["Oil Filters", "Ölfilter"],
      ["Fuel Filters", "Kraftstofffilter"],
      ["Cabin Filters", "Innenraumfilter"],
      ["Pollen Filters", "Pollenfilter"],
      ["Hydraulic Filters", "Hydraulikfilter"],
      ["Transmission Filters", "Getriebefilter"],
      ["DPF Filters", "DPF-Filter"],
      ["Performance Air Filters", "Sportluftfilter"],
      ["Filter Kits", "Filtersätze"],
    ]
  ),
  l2(
    "auto-sub-06",
    "electrical-electronics",
    i18n("Elektrik & Elektronik", "Electrical & Electronics", "Elektrik ve Elektronik", "الكهرباء والإلكترونيات"),
    [
      ["Car Batteries", "Autobatterien"],
      ["Truck Batteries", "LKW-Batterien"],
      ["Motorcycle Batteries", "Motorradbatterien"],
      ["Tractor Batteries", "Traktorbatterien"],
      ["Starter Batteries", "Starterbatterien"],
      ["AGM Batteries", "AGM-Batterien"],
      ["EFB Batteries", "EFB-Batterien"],
      ["Battery Chargers", "Batterieladegeräte"],
      ["Jump Starters", "Starthilfegeräte"],
      ["Alternators", "Lichtmaschinen"],
      ["Starters", "Anlasser"],
      ["Relays", "Relais"],
      ["Fuses", "Sicherungen"],
      ["Sensors", "Sensoren"],
      ["Switches", "Schalter"],
      ["Lighting", "Beleuchtung"],
      ["Headlights", "Scheinwerfer"],
      ["Taillights", "Rückleuchten"],
      ["Indicators", "Blinker"],
      ["Interior Lighting", "Innenraumbeleuchtung"],
      ["LED Lighting", "LED-Beleuchtung"],
      ["Wiring", "Kabelsätze"],
      ["Connectors", "Steckverbinder"],
      ["Control Units", "Steuergeräte"],
      ["Parking Sensors", "Einparkhilfen"],
      ["Cameras", "Kameras"],
      ["Horns", "Hupe"],
    ]
  ),
  l2(
    "auto-sub-07",
    "transmission-drivetrain",
    i18n("Getriebe & Antrieb", "Transmission & Drivetrain", "Şanzıman ve Aktarma", "ناقل الحركة ونظام الدفع"),
    [
      ["Manual Transmissions", "Schaltgetriebe"],
      ["Automatic Transmissions", "Automatikgetriebe"],
      ["Transmission Parts", "Getriebeteile"],
      ["Clutches", "Kupplungen"],
      ["Clutch Kits", "Kupplungssätze"],
      ["Clutch Discs", "Kupplungsscheiben"],
      ["Pressure Plates", "Druckplatten"],
      ["Release Bearings", "Ausrücklager"],
      ["Dual Mass Flywheels", "Zweimassenschwungräder"],
      ["Flywheels", "Schwungräder"],
      ["Gearbox Mounts", "Getriebelager"],
      ["Driveshafts", "Antriebswellen"],
      ["CV Joints", "Gelenkwellen"],
      ["CV Boots", "Achsmanschetten"],
      ["Axles", "Achsen"],
      ["Differential Parts", "Differentialteile"],
      ["Differential Oils", "Differentialöle"],
      ["Transfer Cases", "Verteilergetriebe"],
      ["Transmission Filters", "Getriebefilter"],
      ["Transmission Accessories", "Getriebezubehör"],
    ]
  ),
  l2(
    "auto-sub-08",
    "suspension-steering",
    i18n("Fahrwerk & Lenkung", "Suspension & Steering", "Süspansiyon ve Direksiyon", "نظام التعليق والتوجيه"),
    [
      ["Shock Absorbers", "Stoßdämpfer"],
      ["Struts", "Federbeine"],
      ["Coil Springs", "Schraubenfedern"],
      ["Air Suspension", "Luftfederung"],
      ["Air Suspension Parts", "Luftfederungsteile"],
      ["Control Arms", "Querlenker"],
      ["Ball Joints", "Trag-/Führungsgelenke"],
      ["Stabilizer Links", "Koppelstangen"],
      ["Stabilizer Bars", "Stabilisatoren"],
      ["Wheel Bearings", "Radlager"],
      ["Hub Assemblies", "Radnaben"],
      ["Steering Racks", "Lenkgetriebe"],
      ["Steering Pumps", "Lenkungspumpen"],
      ["Tie Rod Ends", "Spurstangenköpfe"],
      ["Steering Rods", "Lenkstangen"],
      ["Steering Boots", "Lenkmanschetten"],
      ["Power Steering Parts", "Servolenkungsteile"],
      ["Suspension Repair Kits", "Fahrwerk-Reparatursätze"],
    ]
  ),
  l2(
    "auto-sub-09",
    "exhaust-emission",
    i18n("Abgasanlage & Emission", "Exhaust & Emission", "Egzoz ve Emisyon", "العادم والانبعاثات"),
    [
      ["Exhaust Systems", "Abgasanlagen"],
      ["Exhaust Pipes", "Abgasrohre"],
      ["Exhaust Manifolds", "Abgaskrümmer"],
      ["Catalytic Converters", "Katalysatoren"],
      ["DPF", "Partikelfilter (DPF)"],
      ["DPF Accessories", "DPF-Zubehör"],
      ["EGR Valves", "AGR-Ventile"],
      ["EGR Coolers", "AGR-Kühler"],
      ["SCR Systems", "SCR-Systeme"],
      ["AdBlue Components", "AdBlue-Komponenten"],
      ["NOx Sensors", "NOx-Sensoren"],
      ["Oxygen Sensors", "Sauerstoffsensoren"],
      ["Lambda Sensors", "Lambdasonden"],
      ["Exhaust Gaskets", "Abgasdichtungen"],
      ["Exhaust Mounts", "Abgasanlagenhalter"],
      ["Silencers", "Schalldämpfer"],
      ["Mufflers", "Endschalldämpfer"],
      ["Exhaust Accessories", "Abgaszubehör"],
    ]
  ),
  l2(
    "auto-sub-10",
    "body-exterior",
    i18n("Karosserie & Außenbereich", "Body & Exterior", "Karoser ve Dış Aksam", "الهيكل الخارجي"),
    [
      ["Bumpers", "Stoßstangen"],
      ["Fenders", "Kotflügel"],
      ["Bonnet Parts", "Motorhaubenteile"],
      ["Trunk Parts", "Kofferraumteile"],
      ["Doors", "Türen"],
      ["Door Handles", "Türgriffe"],
      ["Door Locks", "Türschlösser"],
      ["Mirrors", "Spiegel"],
      ["Mirror Glass", "Spiegelglas"],
      ["Grilles", "Kühlergrill"],
      ["Spoilers", "Spoiler"],
      ["Mud Flaps", "Schmutzfänger"],
      ["Wheel Arch Liners", "Radhausverkleidungen"],
      ["Body Panels", "Karosseriebleche"],
      ["Radiator Supports", "Kühlerträger"],
      ["Underbody Protection", "Unterbodenschutz"],
      ["Tow Bars", "Anhängerkupplungen"],
      ["Roof Rails", "Dachreling"],
      ["Roof Racks", "Dachgepäckträger"],
      ["Exterior Accessories", "Außenzubehör"],
    ]
  ),
  l2(
    "auto-sub-11",
    "interior-comfort",
    i18n("Innenraum & Komfort", "Interior & Comfort", "İç Aksam ve Konfor", "المقصورة الداخلية والراحة"),
    [
      ["Floor Mats", "Fußmatten"],
      ["Trunk Mats", "Kofferraummatten"],
      ["Seat Covers", "Sitzbezüge"],
      ["Car Seats", "Autositze"],
      ["Armrests", "Armlehnen"],
      ["Steering Wheel Covers", "Lenkradbezüge"],
      ["Gear Knobs", "Schaltknäufe"],
      ["Pedal Covers", "Pedalbezüge"],
      ["Sun Shades", "Sonnenschutz"],
      ["Interior Organizers", "Innenraum-Organizer"],
      ["Cup Holders", "Getränkehalter"],
      ["Interior Mirrors", "Innenspiegel"],
      ["Dashboard Accessories", "Armaturenbrett-Zubehör"],
      ["Interior Lighting", "Innenraumbeleuchtung"],
      ["Air Fresheners", "Lufterfrischer"],
      ["Comfort Accessories", "Komfortzubehör"],
    ]
  ),
  l2(
    "auto-sub-12",
    "car-care-cleaning",
    i18n("Fahrzeugpflege", "Car Care & Cleaning", "Araç Bakım ve Temizlik", "العناية بالمركبات"),
    [
      ["Car Shampoo", "Autoshampoo"],
      ["Snow Foam", "Snow Foam"],
      ["Wheel Cleaner", "Felgenreiniger"],
      ["Rim Cleaner", "Felgenreiniger"],
      ["Glass Cleaner", "Glasreiniger"],
      ["Interior Cleaner", "Innenraumreiniger"],
      ["Dashboard Cleaner", "Armaturenbrettreiniger"],
      ["Leather Cleaner", "Lederreiniger"],
      ["Leather Care", "Lederpflege"],
      ["Plastic Care", "Kunststoffpflege"],
      ["Tire Cleaner", "Reifenreiniger"],
      ["Tire Shine", "Reifenglanz"],
      ["Wax", "Wachs"],
      ["Polish", "Politur"],
      ["Scratch Remover", "Kratzerentferner"],
      ["Ceramic Coatings", "Keramikversiegelung"],
      ["Sealants", "Versiegelungen"],
      ["Detailing Brushes", "Detailing-Bürsten"],
      ["Microfiber Cloths", "Mikrofasertücher"],
      ["Sponges", "Schwämme"],
      ["Drying Towels", "Trockentücher"],
      ["Detailing Kits", "Detailing-Sets"],
    ]
  ),
  l2(
    "auto-sub-13",
    "workshop-tools",
    i18n("Werkstatt & Werkzeuge", "Workshop & Tools", "Servis ve Aletler", "الورشة والأدوات"),
    [
      ["Hand Tools", "Handwerkzeuge"],
      ["Socket Sets", "Steckschlüsselsätze"],
      ["Ratchets", "Ratschen"],
      ["Torque Wrenches", "Drehmomentschlüssel"],
      ["Screwdrivers", "Schraubendreher"],
      ["Pliers", "Zangen"],
      ["Impact Tools", "Schlagschrauber"],
      ["Pneumatic Tools", "Druckluftwerkzeuge"],
      ["Diagnostic Tools", "Diagnosegeräte"],
      ["OBD Scanners", "OBD-Scanner"],
      ["Battery Testers", "Batterietester"],
      ["Multimeters", "Multimeter"],
      ["Hydraulic Jacks", "Hydraulikheber"],
      ["Trolley Jacks", "Rangierwagenheber"],
      ["Jack Stands", "Unterstellböcke"],
      ["Wheel Balancers", "Reifenwuchtmaschinen"],
      ["Tire Changers", "Reifenmontiergeräte"],
      ["Workshop Carts", "Werkstattwagen"],
      ["Tool Cabinets", "Werkzeugschränke"],
      ["Inspection Lamps", "Inspektionslampen"],
      ["Workshop Equipment", "Werkstattausrüstung"],
    ]
  ),
  l2(
    "auto-sub-14",
    "commercial-agricultural-construction",
    i18n("Nutz-, Land- & Baumaschinen", "Commercial / Agricultural / Construction Vehicles", "Ticari / Tarım / İş Makineleri", "المركبات التجارية والزراعية ومعدات البناء"),
    [
      ["Trucks", "LKW"],
      ["Truck Parts", "LKW-Teile"],
      ["Trailers", "Anhänger"],
      ["Trailer Parts", "Anhängerteile"],
      ["Semi-Trailers", "Sattelauflieger"],
      ["Bus Parts", "Bussteile"],
      ["Van Parts", "Transporterteile"],
      ["Agricultural Machinery Parts", "Landmaschinenteile"],
      ["Tractor Parts", "Traktorteile"],
      ["Harvesting Machinery Parts", "Erntemaschinenteile"],
      ["Construction Machinery Parts", "Baumaschinenteile"],
      ["Excavator Parts", "Bagger-Teile"],
      ["Loader Parts", "Radlader-Teile"],
      ["Forklift Parts", "Stapler-Teile"],
      ["Industrial Vehicle Parts", "Industriefahrzeugteile"],
    ]
  ),
  l2(
    "auto-sub-15",
    "motorcycle-atv-quad",
    i18n("Motorrad / ATV / Quad", "Motorcycle / ATV / Quad", "Motosiklet / ATV / Quad", "دراجات نارية / ATV / Quad"),
    [
      ["Motorcycle Parts", "Motorradteile"],
      ["Motorcycle Tires", "Motorradreifen"],
      ["Motorcycle Batteries", "Motorradbatterien"],
      ["Motorcycle Oils", "Motorradöle"],
      ["Motorcycle Brakes", "Motorradbremsen"],
      ["Motorcycle Chains", "Motorradketten"],
      ["Sprockets", "Kettenräder"],
      ["Motorcycle Filters", "Motorradfilter"],
      ["Motorcycle Exhaust", "Motorradauspuff"],
      ["Motorcycle Suspension", "Motorradfahrwerk"],
      ["Motorcycle Lighting", "Motorradbeleuchtung"],
      ["Motorcycle Accessories", "Motorradzubehör"],
      ["ATV Parts", "ATV-Teile"],
      ["Quad Parts", "Quad-Teile"],
      ["ATV Tires", "ATV-Reifen"],
      ["ATV Accessories", "ATV-Zubehör"],
    ]
  ),
];

ROOT.children = SUBCATEGORIES;

const doc = {
  version: 1,
  generatedAt: new Date().toISOString(),
  safety: {
    ready: false,
    status: "BLOCKED",
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    publishEnabled: false,
    humanApprovalRequired: true,
  },
  root: ROOT,
  stats: {
    subcategories: SUBCATEGORIES.length,
    subSubcategories: SUBCATEGORIES.reduce((n, s) => n + s.children.length, 0),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");

console.log(`Wrote ${OUT}`);
console.log(`Subcategories: ${doc.stats.subcategories}, Sub-subcategories: ${doc.stats.subSubcategories}`);
