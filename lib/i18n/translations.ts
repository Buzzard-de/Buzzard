import type { BuzzardLocale } from "./types";

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

const de: TranslationTree = {
  topBar: {
    shipping: "Kostenloser Versand ab 79 €",
    returns: "30 Tage Rückgaberecht",
    trust: "Trusted Shops · 4,8/5",
  },
  header: {
    searchPlaceholder: "Suche nach Produkten, Marken, SKU, Kategorien…",
    account: "Mein Konto",
    login: "Anmelden",
    wishlist: "Wunschliste",
    wishlistEmpty: "Meine Favoriten",
    cart: "Warenkorb",
    menuOpen: "Menü öffnen",
    searchOpen: "Suche öffnen",
    search: "Suchen",
  },
  nav: {
    allCategories: "ALLE KATEGORIEN",
    vehicleSelect: "FAHRZEUGWAHL",
    vehiclePlaceholder: "Fahrzeug auswählen",
  },
  megaMenu: {
    close: "Menü schließen",
    mainCategories: "Hauptkategorien",
    categories: "Kategorien",
  },
  hero: {
    kicker: "QUALITÄT. LEISTUNG. VERTRAUEN.",
    title: "Entdecken Sie unser Sortiment",
    text: "Über 1.000.000 Produkte – schnell geliefert, fair bepreist, sicher bestellt.",
    cta: "Jetzt entdecken",
    secondary: "Alle Kategorien",
  },
  home: {
    categoryDiscovery: "Kategorien entdecken",
    allCategories: "Alle Kategorien ansehen",
    featured: "Empfohlene Produkte",
    bestsellers: "Bestseller",
    campaigns: "Aktionen & Angebote",
    highlights: "Beliebte Kategorien",
    trust: "Warum Buzzard?",
    reviews: "Kundenstimmen",
    newsletter: "Newsletter",
    newsletterText: "Exklusive Angebote und Neuheiten direkt in Ihr Postfach.",
    newsletterPlaceholder: "Ihre E-Mail-Adresse",
    newsletterBtn: "Anmelden",
    addToCart: "In den Warenkorb",
    added: "Hinzugefügt",
  },
  search: {
    recent: "Zuletzt gesucht",
    suggestions: "Vorschläge",
    noResults: "Keine Treffer",
    sortLabel: "Sortieren",
    sortName: "Name A–Z",
    sortPriceAsc: "Preis aufsteigend",
    sortPriceDesc: "Preis absteigend",
  },
};

const en: TranslationTree = {
  topBar: { shipping: "Free shipping from €79", returns: "30-day returns", trust: "Trusted Shops · 4.8/5" },
  header: {
    searchPlaceholder: "Search products, brands, SKU, categories…",
    account: "My Account",
    login: "Sign in",
    wishlist: "Wishlist",
    wishlistEmpty: "My favourites",
    cart: "Cart",
    menuOpen: "Open menu",
    searchOpen: "Open search",
    search: "Search",
  },
  nav: { allCategories: "ALL CATEGORIES", vehicleSelect: "VEHICLE SELECT", vehiclePlaceholder: "Select vehicle" },
  megaMenu: { close: "Close menu", mainCategories: "Main categories", categories: "Categories" },
  hero: {
    kicker: "QUALITY. PERFORMANCE. TRUST.",
    title: "Discover our range",
    text: "Over 1,000,000 products – fast delivery, fair prices, secure checkout.",
    cta: "Shop now",
    secondary: "All categories",
  },
  home: {
    categoryDiscovery: "Discover categories",
    allCategories: "View all categories",
    featured: "Featured products",
    bestsellers: "Best sellers",
    campaigns: "Deals & promotions",
    highlights: "Popular categories",
    trust: "Why Buzzard?",
    reviews: "Customer reviews",
    newsletter: "Newsletter",
    newsletterText: "Exclusive offers and new arrivals in your inbox.",
    newsletterPlaceholder: "Your email address",
    newsletterBtn: "Subscribe",
    addToCart: "Add to cart",
    added: "Added",
  },
  search: {
    recent: "Recent searches",
    suggestions: "Suggestions",
    noResults: "No results",
    sortLabel: "Sort",
    sortName: "Name A–Z",
    sortPriceAsc: "Price ascending",
    sortPriceDesc: "Price descending",
  },
};

const tr: TranslationTree = {
  topBar: { shipping: "79 € üzeri ücretsiz kargo", returns: "30 gün iade", trust: "Trusted Shops · 4,8/5" },
  header: {
    searchPlaceholder: "Ürün, marka, SKU, kategori ara…",
    account: "Hesabım",
    login: "Giriş yap",
    wishlist: "Favoriler",
    wishlistEmpty: "Favorilerim",
    cart: "Sepet",
    menuOpen: "Menüyü aç",
    searchOpen: "Aramayı aç",
    search: "Ara",
  },
  nav: { allCategories: "TÜM KATEGORİLER", vehicleSelect: "ARAÇ SEÇİMİ", vehiclePlaceholder: "Araç seçin" },
  megaMenu: { close: "Menüyü kapat", mainCategories: "Ana kategoriler", categories: "Kategoriler" },
  hero: {
    kicker: "KALİTE. PERFORMANS. GÜVEN.",
    title: "Ürün yelpazemizi keşfedin",
    text: "1.000.000+ ürün – hızlı teslimat, adil fiyatlar, güvenli alışveriş.",
    cta: "Keşfet",
    secondary: "Tüm kategoriler",
  },
  home: {
    categoryDiscovery: "Kategorileri keşfet",
    allCategories: "Tüm kategorileri gör",
    featured: "Öne çıkan ürünler",
    bestsellers: "Çok satanlar",
    campaigns: "Kampanyalar",
    highlights: "Popüler kategoriler",
    trust: "Neden Buzzard?",
    reviews: "Müşteri yorumları",
    newsletter: "Bülten",
    newsletterText: "Özel teklifler ve yenilikler e-postanızda.",
    newsletterPlaceholder: "E-posta adresiniz",
    newsletterBtn: "Abone ol",
    addToCart: "Sepete ekle",
    added: "Eklendi",
  },
  search: {
    recent: "Son aramalar",
    suggestions: "Öneriler",
    noResults: "Sonuç yok",
    sortLabel: "Sırala",
    sortName: "İsim A–Z",
    sortPriceAsc: "Fiyat artan",
    sortPriceDesc: "Fiyat azalan",
  },
};

const ar: TranslationTree = {
  topBar: { shipping: "شحن مجاني من 79 €", returns: "إرجاع خلال 30 يومًا", trust: "Trusted Shops · 4.8/5" },
  header: {
    searchPlaceholder: "ابحث عن المنتجات والعلامات والرمز والفئات…",
    account: "حسابي",
    login: "تسجيل الدخول",
    wishlist: "المفضلة",
    wishlistEmpty: "مفضلتي",
    cart: "السلة",
    menuOpen: "فتح القائمة",
    searchOpen: "فتح البحث",
    search: "بحث",
  },
  nav: { allCategories: "جميع الفئات", vehicleSelect: "اختيار المركبة", vehiclePlaceholder: "اختر المركبة" },
  megaMenu: { close: "إغلاق القائمة", mainCategories: "الفئات الرئيسية", categories: "الفئات" },
  hero: {
    kicker: "الجودة. الأداء. الثقة.",
    title: "اكتشف مجموعتنا",
    text: "أكثر من 1,000,000 منتج – توصيل سريع وأسعار عادلة.",
    cta: "تسوق الآن",
    secondary: "جميع الفئات",
  },
  home: {
    categoryDiscovery: "اكتشف الفئات",
    allCategories: "عرض جميع الفئات",
    featured: "منتجات مميزة",
    bestsellers: "الأكثر مبيعًا",
    campaigns: "العروض",
    highlights: "فئات شائعة",
    trust: "لماذا Buzzard؟",
    reviews: "آراء العملاء",
    newsletter: "النشرة",
    newsletterText: "عروض حصرية ومنتجات جديدة في بريدك.",
    newsletterPlaceholder: "بريدك الإلكتروني",
    newsletterBtn: "اشتراك",
    addToCart: "أضف إلى السلة",
    added: "تمت الإضافة",
  },
  search: {
    recent: "عمليات البحث الأخيرة",
    suggestions: "اقتراحات",
    noResults: "لا نتائج",
    sortLabel: "ترتيب",
    sortName: "الاسم أ–ي",
    sortPriceAsc: "السعر تصاعدي",
    sortPriceDesc: "السعر تنازلي",
  },
};

const catalogs: Record<BuzzardLocale, TranslationTree> = { de, en, tr, ar };

function resolve(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(locale: BuzzardLocale, key: string): string {
  return resolve(catalogs[locale], key) ?? resolve(catalogs.de, key) ?? key;
}
