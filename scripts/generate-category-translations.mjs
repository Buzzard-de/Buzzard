import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "data/buzzard_categories.json"), "utf8")
);

/** German overrides for main categories (exact). */
const mainDe = {
  "cat-01": "Textil",
  "cat-02": "Kosmetik & Körperpflege",
  "cat-03": "Reinigungsprodukte",
  "cat-04": "Schule & Bürobedarf",
  "cat-05": "Automotive",
  "cat-06": "Haustierbedarf",
  "cat-07": "Garten",
  "cat-08": "Arbeitsschutz & Berufskleidung",
  "cat-09": "Werkzeuge & Eisenwaren",
  "cat-10": "Haus & Wohnen",
  "cat-11": "Möbel",
  "cat-12": "Elektronik",
  "cat-13": "Haushaltsgeräte",
  "cat-14": "Sport & Outdoor",
  "cat-15": "Schuhe",
  "cat-16": "Taschen & Accessoires",
  "cat-17": "Mutter & Baby",
  "cat-18": "Spielzeug & Kinder",
  "cat-19": "Hobby & Freizeit",
  "cat-20": "Tier- & Landwirtschaftsausrüstung",
  "cat-21": "Bau & Konstruktion",
  "cat-22": "Elektro & Beleuchtung",
  "cat-23": "Wasser, Heizung & Sanitär",
  "cat-24": "Küche & Essen",
  "cat-25": "Lebensmittel & Getränke",
  "cat-26": "Tierfutter",
  "cat-27": "Gesundheit & Wellness",
  "cat-28": "Büro & Gewerbe",
  "cat-29": "Verpackung & Versand",
  "cat-30": "Industrie- & Gewerbeausrüstung",
  "cat-31": "Sicherheit & Überwachung",
  "cat-32": "Reise & Koffer",
  "cat-33": "Gartenhobby & Camping",
  "cat-34": "Saisonales & Feiern",
  "cat-35": "Dekoration",
  "cat-36": "Persönliche Elektronik & Mobil",
  "cat-37": "Foto & Video",
  "cat-38": "Computer & Gaming",
  "cat-39": "Fahrzeug & Mobilität",
  "cat-40": "Energie & Solar",
  "cat-41": "Angebote & Sonderkollektionen",
};

const tokenDe = {
  and: "&",
  tekstil: "Textil",
  kadin: "Damen",
  erkek: "Herren",
  cocuk: "Kinder",
  bebek: "Baby",
  giyim: "Bekleidung",
  ic: "Unterwäsche",
  ev: "Haushalt",
  corap: "Socken",
  canta: "Taschen",
  aksesuar: "Accessoires",
  is: "Arbeit",
  outdoor: "Outdoor",
  kozmetik: "Kosmetik",
  kisisel: "Persönliche",
  bakim: "Pflege",
  cilt: "Haut",
  sac: "Haar",
  makyaj: "Make-up",
  parfum: "Parfüm",
  agiz: "Mund",
  dis: "Zahn",
  vucut: "Körper",
  tiras: "Rasur",
  hijyen: "Hygiene",
  temizlik: "Reinigung",
  urunleri: "Produkte",
  camasir: "Wäsche",
  bulasik: "Geschirr",
  mutfak: "Küche",
  banyo: "Bad",
  wc: "WC",
  profesyonel: "Professionell",
  kagit: "Papier",
  ekipmanlari: "Ausrüstung",
  okul: "Schule",
  kirtasiye: "Schreibwaren",
  malzemeleri: "Material",
  ofis: "Büro",
  sanat: "Kunst",
  hobi: "Hobby",
  kalem: "Stift",
  kutulari: "Etuis",
  schultute: "Schultüte",
  baslangici: "Schulanfang",
  otomotiv: "Automotive",
  motor: "Motor",
  yaglari: "Öle",
  sivilar: "Flüssigkeiten",
  filtreler: "Filter",
  fren: "Bremse",
  sistemi: "System",
  aku: "Batterie",
  elektrik: "Elektrik",
  lastik: "Reifen",
  jant: "Felge",
  aydinlatma: "Beleuchtung",
  silecek: "Scheibenwischer",
  cam: "Glas",
  arac: "Fahrzeug",
  yedek: "Ersatz",
  parca: "Teile",
  garaj: "Garage",
  servis: "Service",
  pet: "Haustier",
  kedi: "Katze",
  kopek: "Hund",
  kus: "Vogel",
  balik: "Fisch",
  akvaryum: "Aquarium",
  kemirgenler: "Nagetiere",
  mama: "Futter",
  odul: "Leckerli",
  atistirmalik: "Snacks",
  oyuncak: "Spielzeug",
  yatak: "Bett",
  tasima: "Transport",
  bahce: "Garten",
  aletleri: "Werkzeuge",
  guvenligi: "Sicherheit",
  kiyafetleri: "Kleidung",
  aletler: "Werkzeuge",
  hirdavat: "Eisenwaren",
  yasam: "Leben",
  mobilya: "Möbel",
  elektronik: "Elektronik",
  aletleri2: "Geräte",
  spor: "Sport",
  ayakkabi: "Schuhe",
  anne: "Mutter",
  eglence: "Unterhaltung",
  hayvancilik: "Landwirtschaft",
  yapi: "Bau",
  insaat: "Konstruktion",
  su: "Wasser",
  isitma: "Heizung",
  tesisat: "Sanitär",
  yemek: "Essen",
  gida: "Lebensmittel",
  icecek: "Getränke",
  saglik: "Gesundheit",
  wellness: "Wellness",
  isletme: "Gewerbe",
  paketleme: "Verpackung",
  kargo: "Versand",
  sanayi: "Industrie",
  ticari: "Gewerblich",
  guvenlik: "Sicherheit",
  gozetim: "Überwachung",
  seyahat: "Reise",
  valiz: "Koffer",
  kamp: "Camping",
  mevsimlik: "Saisonal",
  kutlama: "Feiern",
  dekorasyon: "Dekoration",
  mobil: "Mobil",
  fotograf: "Foto",
  video: "Video",
  bilgisayar: "Computer",
  gaming: "Gaming",
  mobilite: "Mobilität",
  enerji: "Energie",
  solar: "Solar",
  firsatlar: "Angebote",
  ozel: "Sonder",
  koleksiyonlar: "Kollektionen",
  urun: "Produkte",
  urunler: "Produkte",
  set: "Set",
  bakimi: "Pflege",
  temizligi: "Reinigung",
};

function slugToGerman(slug) {
  const chunks = slug.split("-and-").flatMap((part) => part.split("-"));
  const translated = chunks.map((chunk) => {
    const mapped = tokenDe[chunk];
    if (mapped) return mapped;
    return chunk.charAt(0).toUpperCase() + chunk.slice(1);
  });
  return translated.join(" & ");
}

const de = {};

function walk(nodes) {
  for (const node of nodes) {
    de[node.id] = mainDe[node.id] ?? slugToGerman(node.slug);
    if (node.children?.length) walk(node.children);
  }
}

walk(source.categories);

const out = `/** Auto-generated German category labels. Edit scripts/generate-category-translations.mjs and re-run. */
export const categoryLabelsDe: Record<string, string> = ${JSON.stringify(de, null, 2)} as const;
`;

fs.writeFileSync(path.join(root, "lib/categories/translations/de.generated.ts"), out);
console.log("Generated", Object.keys(de).length, "German labels");
