#!/usr/bin/env node
/**
 * Fill missing product translations (DE → EN/TR/AR) for catalog mode.
 * Does not modify images or enable sales.
 *
 * Usage: node scripts/fill-product-i18n-gaps.mjs
 *        node scripts/fill-product-i18n-gaps.mjs --dry-run
 */

import fs from "fs";
import path from "path";

const root = path.join(process.cwd());
const productsFile = path.join(root, "data/buzzard_products.json");
const translationsFile = path.join(root, "data/buzzard_product_translations.json");

const LOCALES = ["en", "tr", "ar"];

/** Catalog translations — automotive demo products, no sales. */
const PACK = {
  "bremsscheibe-280": {
    tr: {
      name: "Ön Aks Fren Diski 280mm",
      short_description: "Ön aks için yüksek kaliteli fren diski. Çap 280 mm.",
      description: "Hassas uyum ve dayanıklı kaplama ile güvenilir fren diski.",
    },
  },
  "bremsbelaege-vorder": {
    en: {
      name: "Front Brake Pad Set",
      short_description: "Brake pad set for the front axle with wear indicator.",
      description: "High-quality brake pads for reliable braking performance on the front axle.",
    },
    tr: {
      name: "Ön Fren Balata Takımı",
      short_description: "Aşınma göstergeli ön aks fren balata seti.",
      description: "Ön aks için güvenilir fren performansı sunan kaliteli balatalar.",
    },
    ar: {
      name: "طقم فرامل أمامي",
      short_description: "طقم فرامل للمحور الأمامي مع مؤشر التآكل.",
      description: "فرامل عالية الجودة لأداء كبح موثوق على المحور الأمامي.",
    },
  },
  "motoroel-5w30": {
    en: {
      name: "Engine Oil 5W-30 Full Synthetic 5L",
      short_description: "Full synthetic 5W-30 engine oil for petrol and diesel engines.",
      description: "Premium full synthetic motor oil for year-round engine protection.",
    },
    tr: {
      name: "Motor Yağı 5W-30 Tam Sentetik 5L",
      short_description: "Benzin ve dizel motorlar için tam sentetik 5W-30 motor yağı.",
      description: "Yıl boyu motor koruması için premium tam sentetik yağ.",
    },
    ar: {
      name: "زيت محرك 5W-30 ت fully synthetic 5L",
      short_description: "زيت محرك ت fully synthetic 5W-30 لمحركات البنزين والدiesel.",
      description: "زيت محرك synthetic premium لحماية المحرك على مدار العام.",
    },
  },
  "oelfilter": {
    en: {
      name: "Oil Filter Universal OEM Compatible",
      short_description: "Universal oil filter with high filtration performance.",
      description: "Reliable oil filter compatible with many OEM applications.",
    },
    tr: {
      name: "Yağ Filtresi Evrensel OEM Uyumlu",
      short_description: "Yüksek filtrasyon performanslı evrensel yağ filtresi.",
      description: "Birçok OEM uygulamasıyla uyumlu güvenilir yağ filtresi.",
    },
    ar: {
      name: "فلتر زيت universal متوافق OEM",
      short_description: "فلتر زيت universal بأداء ترشيح عالٍ.",
      description: "فلتر زيت موثوق متوافق مع العديد من تطبيقات OEM.",
    },
  },
  "innenraumfilter": {
    en: {
      name: "Cabin Air Filter Premium Pollen Filter",
      short_description: "Activated carbon cabin filter for clean air inside the vehicle.",
      description: "Premium pollen/cabin filter for improved air quality in the passenger compartment.",
    },
    tr: {
      name: "Kabin Filtresi Polen Filtresi Premium",
      short_description: "Araç içinde temiz hava için aktif karbon kabin filtresi.",
      description: "Yolcu bölmesinde hava kalitesi için premium polen/kabin filtresi.",
    },
    ar: {
      name: "فلتر مقصورة premium فلتر حبوب اللقاح",
      short_description: "فلتر مقصورة بالفحم النشط لهواء نظيف داخل المركبة.",
      description: "فلتر حبوب اللقاح/المقصورة premium لجودة هواء أفضل.",
    },
  },
  "zuendkerze-ngk": {
    en: {
      name: "Spark Plug Iridium IX NGK",
      short_description: "Iridium spark plug for optimal ignition and long service life.",
      description: "NGK Iridium IX spark plug for efficient combustion and durability.",
    },
    tr: {
      name: "Buji Iridium IX NGK",
      short_description: "Optimum ateşleme ve uzun ömür için iridyum buji.",
      description: "Verimli yanma ve dayanıklılık için NGK Iridium IX buji.",
    },
    ar: {
      name: "شمعة إشعال Iridium IX NGK",
      short_description: "شمعة iridium لاشتعال مثالي وعمر خدمة طويل.",
      description: "شمعة NGK Iridium IX لاحتراق فعال ومتانة.",
    },
  },
  "batterie-72ah": {
    en: {
      name: "Starter Battery 12V 72Ah 680A",
      short_description: "72Ah starter battery with 680A cold cranking amps.",
      description: "Reliable 12V starter battery for passenger vehicles.",
    },
    tr: {
      name: "Marş Aküsü 12V 72Ah 680A",
      short_description: "680A soğuk çalıştırma akımına sahip 72Ah marş aküsü.",
      description: "Binek araçlar için güvenilir 12V marş aküsü.",
    },
    ar: {
      name: "بطارية تشغيل 12V 72Ah 680A",
      short_description: "بطارية 72Ah مع 680A تيار تشغيل بارد.",
      description: "بطارية 12V موثوقة للمركبات الخفيفة.",
    },
  },
  "stossdaempfer": {
    en: {
      name: "Front Shock Absorber Gas",
      short_description: "Gas-pressure shock absorber for the front axle.",
      description: "Gas shock absorber for improved ride comfort and stability.",
    },
    tr: {
      name: "Ön Amortisör Gazlı",
      short_description: "Ön aks için gaz basınçlı amortisör.",
      description: "Konfor ve stabilite için gazlı amortisör.",
    },
    ar: {
      name: "ممتص صدمات أمامي غاز",
      short_description: "ممتص صدمات بضغط غاز للمحور الأمامي.",
      description: "ممتص صدمات غازي لراحة واستقرار أفضل.",
    },
  },
  "getriebeoel-75w90": {
    en: {
      name: "Gear Oil 75W-90 Full Synthetic 1L",
      short_description: "Full synthetic 75W-90 gear oil for manual transmissions.",
      description: "Premium gear oil for smooth shifting and transmission protection.",
    },
    tr: {
      name: "Şanzıman Yağı 75W-90 Tam Sentetik 1L",
      short_description: "Manuel şanzımanlar için tam sentetik 75W-90 yağ.",
      description: "Yumuşak vites geçişi ve koruma için premium şanzıman yağı.",
    },
    ar: {
      name: "زيت ناقل حركة 75W-90 ت fully synthetic 1L",
      short_description: "زيت 75W-90 ت fully synthetic لناقل حركة يدوي.",
      description: "زيت ناقل حركة premium لتبديل سلس وحماية.",
    },
  },
  "bremsfluessigkeit-dot4": {
    en: {
      name: "Brake Fluid DOT 4 500ml",
      short_description: "DOT 4 brake fluid, 500 ml bottle.",
      description: "High-performance brake fluid meeting DOT 4 specifications.",
    },
    tr: {
      name: "Fren Hidroliği DOT 4 500ml",
      short_description: "DOT 4 fren hidroliği, 500 ml şişe.",
      description: "DOT 4 spesifikasyonlarına uygun yüksek performanslı fren hidroliği.",
    },
    ar: {
      name: "سائل فرامل DOT 4 500ml",
      short_description: "سائل فرامل DOT 4، زجاجة 500 ml.",
      description: "سائل فرامل عالي الأداء مطابق لمواصفات DOT 4.",
    },
  },
  "keilrippenriemen": {
    en: {
      name: "Serpentine Belt 6PK1548",
      short_description: "Serpentine belt 6PK1548 for auxiliary drives.",
      description: "Durable drive belt for alternator, A/C and power steering applications.",
    },
    tr: {
      name: "V Kayışı 6PK1548",
      short_description: "Yardımcı tahrikler için 6PK1548 V kayışı.",
      description: "Alternatör, klima ve hidrolik direksiyon için dayanıklı kayış.",
    },
    ar: {
      name: "حزام مسنن 6PK1548",
      short_description: "حزام 6PK1548 للمحركات الم auxiliar.",
      description: "حزام متين للدينamo والتكييف وتوجيه power.",
    },
  },
  "frostschutz-g12": {
    en: {
      name: "Coolant Antifreeze G12+ 5L",
      short_description: "G12+ antifreeze for cooling system, 5 litres.",
      description: "Long-life coolant/antifreeze for modern engines.",
    },
    tr: {
      name: "Soğutma Sıvısı Antifriz G12+ 5L",
      short_description: "Soğutma sistemi için G12+ antifriz, 5 litre.",
      description: "Modern motorlar için uzun ömürlü soğutma sıvısı/antifriz.",
    },
    ar: {
      name: "سائل تبريد مضاد للتجمد G12+ 5L",
      short_description: "مضاد تجمد G12+ لنظام التبريد، 5 لتر.",
      description: "سائل تبريد/مضاد تجمد long-life للمحركات الحديثة.",
    },
  },
  "scheibenwischer-set": {
    en: {
      name: "Bosch Aerotwin Wiper Blade Set",
      short_description: "Aerotwin wiper blade set for clear vision in rain.",
      description: "Premium Bosch Aerotwin wiper set for front windshield.",
    },
    tr: {
      name: "Bosch Aerotwin Silecek Seti",
      short_description: "Yağmurda net görüş için Aerotwin silecek seti.",
      description: "Ön cam için premium Bosch Aerotwin silecek seti.",
    },
    ar: {
      name: "طقم مساحات Bosch Aerotwin",
      short_description: "طقم مساحات Aerotwin لرؤية واضحة في المطر.",
      description: "طقم مساحات Bosch Aerotwin premium للزجاج الأمامي.",
    },
  },
  "reifen-pilot-sport": {
    en: {
      name: "Michelin Pilot Sport 4 Tyre 225/45 R17",
      short_description: "Michelin Pilot Sport 4 summer tyre, 225/45 R17.",
      description: "High-performance summer tyre for sporty driving dynamics.",
    },
    tr: {
      name: "Michelin Pilot Sport 4 Lastik 225/45 R17",
      short_description: "Michelin Pilot Sport 4 yaz lastiği, 225/45 R17.",
      description: "Sportif sürüş dinamikleri için yüksek performanslı yaz lastiği.",
    },
    ar: {
      name: "إطار Michelin Pilot Sport 4 225/45 R17",
      short_description: "إطار صيفي Michelin Pilot Sport 4، 225/45 R17.",
      description: "إطار صيفي عالي الأداء للقيادة الرياضية.",
    },
  },
};

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const catalog = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  const translations = JSON.parse(fs.readFileSync(translationsFile, "utf8"));
  let added = 0;

  for (const product of catalog.products) {
    const id = product.id;
    if (!translations[id]) translations[id] = {};
    const pack = PACK[id] || {};

    for (const locale of LOCALES) {
      if (translations[id][locale]?.name) continue;
      const entry = pack[locale];
      if (!entry) continue;
      translations[id][locale] = {
        ...entry,
        seo: entry.seo || {
          title: `${entry.name} | Buzzard`,
          description: entry.short_description,
        },
        source: "catalog_i18n_fill",
      };
      added += 1;
    }
  }

  console.log(`Filled ${added} missing locale entries`);
  if (!dryRun) {
    fs.writeFileSync(translationsFile, JSON.stringify(translations, null, 2) + "\n", "utf8");
    console.log("Written:", translationsFile);
  }
}

main();
