/**
 * Storefront interface strings for the existing 30 locale codes.
 * German is the source text. Every other locale is an unreviewed draft.
 * This file does not rewrite the locale catalogs in lib/i18n/locales.
 */
const LOCALES = require("../../../lib/i18n/supported-locales.json");

const KEYS = Object.freeze([
  "sales",
  "search",
  "categories",
  "empty",
  "error",
  "loading",
  "price",
  "shipping",
  "stock",
  "returns",
  "sort",
  "filter",
  "home",
  "menu",
  "footer",
  "orderDisabled",
  "placeholder",
  "currency",
  "breadcrumb",
  "results",
]);

const COPY = {
  de: { sales: "Verkauf geschlossen", search: "Suche", categories: "Kategorien", empty: "Keine Treffer", error: "Nicht verfügbar", loading: "Wird geladen", price: "Preis", shipping: "Versand", stock: "Verfügbarkeit", returns: "Rückgabe", sort: "Sortierung", filter: "Filter", home: "Startseite", menu: "Menü", footer: "Fußzeile", orderDisabled: "Bestellung deaktiviert", placeholder: "Kein Produktfoto", currency: "Währung", breadcrumb: "Pfad", results: "{count} Treffer" },
  en: { sales: "Sales closed", search: "Search", categories: "Categories", empty: "No results", error: "Unavailable", loading: "Loading", price: "Price", shipping: "Shipping", stock: "Availability", returns: "Returns", sort: "Sort", filter: "Filter", home: "Home", menu: "Menu", footer: "Footer", orderDisabled: "Order disabled", placeholder: "No product photograph", currency: "Currency", breadcrumb: "Breadcrumb", results: "{count} results" },
  tr: { sales: "Satış kapalı", search: "Arama", categories: "Kategoriler", empty: "Sonuç yok", error: "Kullanılamıyor", loading: "Yükleniyor", price: "Fiyat", shipping: "Gönderim", stock: "Stok durumu", returns: "İade", sort: "Sıralama", filter: "Süzgeç", home: "Ana sayfa", menu: "Menü", footer: "Alt bilgi", orderDisabled: "Sipariş kapalı", placeholder: "Ürün fotoğrafı yok", currency: "Para birimi", breadcrumb: "Yol", results: "{count} sonuç" },
  ar: { sales: "المبيعات مغلقة", search: "بحث", categories: "الفئات", empty: "لا توجد نتائج", error: "غير متاح", loading: "جار التحميل", price: "السعر", shipping: "الشحن", stock: "التوفر", returns: "الإرجاع", sort: "الترتيب", filter: "تصفية", home: "الرئيسية", menu: "القائمة", footer: "التذييل", orderDisabled: "الطلب معطل", placeholder: "لا توجد صورة للمنتج", currency: "العملة", breadcrumb: "المسار", results: "{count} نتائج" },
  fr: { sales: "Vente fermée", search: "Recherche", categories: "Catégories", empty: "Aucun résultat", error: "Indisponible", loading: "Chargement", price: "Prix", shipping: "Expédition", stock: "Disponibilité", returns: "Retours", sort: "Tri", filter: "Filtre", home: "Accueil", menu: "Menu", footer: "Pied de page", orderDisabled: "Commande désactivée", placeholder: "Pas de photo produit", currency: "Devise", breadcrumb: "Fil d'Ariane", results: "{count} résultats" },
  nl: { sales: "Verkoop gesloten", search: "Zoeken", categories: "Categorieën", empty: "Geen resultaten", error: "Niet beschikbaar", loading: "Laden", price: "Prijs", shipping: "Verzending", stock: "Beschikbaarheid", returns: "Retour", sort: "Sortering", filter: "Filter", home: "Home", menu: "Menu", footer: "Voettekst", orderDisabled: "Bestellen uitgeschakeld", placeholder: "Geen productfoto", currency: "Valuta", breadcrumb: "Pad", results: "{count} resultaten" },
  bg: { sales: "Продажбите са затворени", search: "Търсене", categories: "Категории", empty: "Няма резултати", error: "Недостъпно", loading: "Зареждане", price: "Цена", shipping: "Доставка", stock: "Наличност", returns: "Връщане", sort: "Подреждане", filter: "Филтър", home: "Начало", menu: "Меню", footer: "Долен колонтитул", orderDisabled: "Поръчката е изключена", placeholder: "Няма снимка", currency: "Валута", breadcrumb: "Път", results: "{count} резултата" },
  hr: { sales: "Prodaja zatvorena", search: "Pretraga", categories: "Kategorije", empty: "Nema rezultata", error: "Nedostupno", loading: "Učitavanje", price: "Cijena", shipping: "Dostava", stock: "Dostupnost", returns: "Povrat", sort: "Sortiranje", filter: "Filtar", home: "Početna", menu: "Izbornik", footer: "Podnožje", orderDisabled: "Narudžba onemogućena", placeholder: "Nema fotografije", currency: "Valuta", breadcrumb: "Put", results: "{count} rezultata" },
  el: { sales: "Οι πωλήσεις είναι κλειστές", search: "Αναζήτηση", categories: "Κατηγορίες", empty: "Κανένα αποτέλεσμα", error: "Μη διαθέσιμο", loading: "Φόρτωση", price: "Τιμή", shipping: "Αποστολή", stock: "Διαθεσιμότητα", returns: "Επιστροφές", sort: "Ταξινόμηση", filter: "Φίλτρο", home: "Αρχική", menu: "Μενού", footer: "Υποσέλιδο", orderDisabled: "Η παραγγελία είναι ανενεργή", placeholder: "Χωρίς φωτογραφία", currency: "Νόμισμα", breadcrumb: "Διαδρομή", results: "{count} αποτελέσματα" },
  cs: { sales: "Prodej uzavřen", search: "Hledat", categories: "Kategorie", empty: "Žádné výsledky", error: "Nedostupné", loading: "Načítání", price: "Cena", shipping: "Doprava", stock: "Dostupnost", returns: "Vrácení", sort: "Řazení", filter: "Filtr", home: "Domů", menu: "Menu", footer: "Zápatí", orderDisabled: "Objednávka vypnuta", placeholder: "Bez fotografie", currency: "Měna", breadcrumb: "Cesta", results: "{count} výsledků" },
  da: { sales: "Salg lukket", search: "Søg", categories: "Kategorier", empty: "Ingen resultater", error: "Utilgængelig", loading: "Indlæser", price: "Pris", shipping: "Forsendelse", stock: "Tilgængelighed", returns: "Returnering", sort: "Sortering", filter: "Filter", home: "Hjem", menu: "Menu", footer: "Sidefod", orderDisabled: "Bestilling deaktiveret", placeholder: "Intet produktfoto", currency: "Valuta", breadcrumb: "Sti", results: "{count} resultater" },
  et: { sales: "Müük suletud", search: "Otsing", categories: "Kategooriad", empty: "Tulemusi pole", error: "Pole saadaval", loading: "Laadimine", price: "Hind", shipping: "Tarne", stock: "Saadavus", returns: "Tagastus", sort: "Sortimine", filter: "Filter", home: "Avaleht", menu: "Menüü", footer: "Jalus", orderDisabled: "Tellimine väljas", placeholder: "Tootefoto puudub", currency: "Valuuta", breadcrumb: "Tee", results: "{count} tulemust" },
  fi: { sales: "Myynti suljettu", search: "Haku", categories: "Kategoriat", empty: "Ei tuloksia", error: "Ei saatavilla", loading: "Ladataan", price: "Hinta", shipping: "Toimitus", stock: "Saatavuus", returns: "Palautus", sort: "Järjestys", filter: "Suodatin", home: "Etusivu", menu: "Valikko", footer: "Alatunniste", orderDisabled: "Tilaus pois käytöstä", placeholder: "Ei tuotekuvaa", currency: "Valuutta", breadcrumb: "Polku", results: "{count} tulosta" },
  hu: { sales: "Az értékesítés zárva", search: "Keresés", categories: "Kategóriák", empty: "Nincs találat", error: "Nem elérhető", loading: "Betöltés", price: "Ár", shipping: "Szállítás", stock: "Elérhetőség", returns: "Visszaküldés", sort: "Rendezés", filter: "Szűrő", home: "Főoldal", menu: "Menü", footer: "Lábléc", orderDisabled: "Rendelés kikapcsolva", placeholder: "Nincs termékkép", currency: "Pénznem", breadcrumb: "Útvonal", results: "{count} találat" },
  it: { sales: "Vendita chiusa", search: "Cerca", categories: "Categorie", empty: "Nessun risultato", error: "Non disponibile", loading: "Caricamento", price: "Prezzo", shipping: "Spedizione", stock: "Disponibilità", returns: "Resi", sort: "Ordina", filter: "Filtro", home: "Home", menu: "Menu", footer: "Piè di pagina", orderDisabled: "Ordine disattivato", placeholder: "Nessuna foto", currency: "Valuta", breadcrumb: "Percorso", results: "{count} risultati" },
  lv: { sales: "Pārdošana slēgta", search: "Meklēt", categories: "Kategorijas", empty: "Nav rezultātu", error: "Nav pieejams", loading: "Ielāde", price: "Cena", shipping: "Piegāde", stock: "Pieejamība", returns: "Atgriešana", sort: "Kārtošana", filter: "Filtrs", home: "Sākums", menu: "Izvēlne", footer: "Kājene", orderDisabled: "Pasūtījums izslēgts", placeholder: "Nav foto", currency: "Valūta", breadcrumb: "Ceļš", results: "{count} rezultāti" },
  lt: { sales: "Pardavimas uždarytas", search: "Paieška", categories: "Kategorijos", empty: "Nėra rezultatų", error: "Nepasiekiama", loading: "Įkeliama", price: "Kaina", shipping: "Pristatymas", stock: "Prieinamumas", returns: "Grąžinimas", sort: "Rikiavimas", filter: "Filtras", home: "Pradžia", menu: "Meniu", footer: "Poraštė", orderDisabled: "Užsakymas išjungtas", placeholder: "Nėra nuotraukos", currency: "Valiuta", breadcrumb: "Kelias", results: "{count} rezultatai" },
  lb: { sales: "Verkaf zou", search: "Sich", categories: "Kategorien", empty: "Keng Resultater", error: "Net disponibel", loading: "Lueden", price: "Präis", shipping: "Liwwerung", stock: "Disponibilitéit", returns: "Retour", sort: "Sortéierung", filter: "Filter", home: "Home", menu: "Menü", footer: "Fousszeil", orderDisabled: "Bestellung aus", placeholder: "Keng Produktfoto", currency: "Währung", breadcrumb: "Pad", results: "{count} Resultater" },
  mt: { sales: "Il-bejgħ magħluq", search: "Fittex", categories: "Kategoriji", empty: "L-ebda riżultat", error: "Mhux disponibbli", loading: "Qed jitgħabba", price: "Prezz", shipping: "Tbaħħir", stock: "Disponibbiltà", returns: "Ritorn", sort: "Ordni", filter: "Filtru", home: "Dar", menu: "Menu", footer: "Footer", orderDisabled: "L-ordni mitfija", placeholder: "L-ebda ritratt", currency: "Munita", breadcrumb: "Mogħdija", results: "{count} riżultati" },
  pl: { sales: "Sprzedaż zamknięta", search: "Szukaj", categories: "Kategorie", empty: "Brak wyników", error: "Niedostępne", loading: "Ładowanie", price: "Cena", shipping: "Wysyłka", stock: "Dostępność", returns: "Zwroty", sort: "Sortowanie", filter: "Filtr", home: "Start", menu: "Menu", footer: "Stopka", orderDisabled: "Zamówienie wyłączone", placeholder: "Brak zdjęcia", currency: "Waluta", breadcrumb: "Ścieżka", results: "{count} wyników" },
  pt: { sales: "Venda fechada", search: "Pesquisar", categories: "Categorias", empty: "Sem resultados", error: "Indisponível", loading: "A carregar", price: "Preço", shipping: "Envio", stock: "Disponibilidade", returns: "Devoluções", sort: "Ordenar", filter: "Filtro", home: "Início", menu: "Menu", footer: "Rodapé", orderDisabled: "Encomenda desativada", placeholder: "Sem fotografia", currency: "Moeda", breadcrumb: "Caminho", results: "{count} resultados" },
  ro: { sales: "Vânzare închisă", search: "Căutare", categories: "Categorii", empty: "Niciun rezultat", error: "Indisponibil", loading: "Se încarcă", price: "Preț", shipping: "Livrare", stock: "Disponibilitate", returns: "Returnare", sort: "Sortare", filter: "Filtru", home: "Acasă", menu: "Meniu", footer: "Subsol", orderDisabled: "Comanda este oprită", placeholder: "Fără fotografie", currency: "Monedă", breadcrumb: "Cale", results: "{count} rezultate" },
  sk: { sales: "Predaj zatvorený", search: "Hľadať", categories: "Kategórie", empty: "Žiadne výsledky", error: "Nedostupné", loading: "Načítava sa", price: "Cena", shipping: "Doprava", stock: "Dostupnosť", returns: "Vrátenie", sort: "Zoradenie", filter: "Filter", home: "Domov", menu: "Menu", footer: "Päta", orderDisabled: "Objednávka vypnutá", placeholder: "Bez fotografie", currency: "Mena", breadcrumb: "Cesta", results: "{count} výsledkov" },
  sl: { sales: "Prodaja zaprta", search: "Iskanje", categories: "Kategorije", empty: "Ni zadetkov", error: "Ni na voljo", loading: "Nalaganje", price: "Cena", shipping: "Dostava", stock: "Razpoložljivost", returns: "Vračilo", sort: "Razvrščanje", filter: "Filter", home: "Domov", menu: "Meni", footer: "Noga", orderDisabled: "Naročilo izklopljeno", placeholder: "Brez fotografije", currency: "Valuta", breadcrumb: "Pot", results: "{count} zadetkov" },
  es: { sales: "Venta cerrada", search: "Buscar", categories: "Categorías", empty: "Sin resultados", error: "No disponible", loading: "Cargando", price: "Precio", shipping: "Envío", stock: "Disponibilidad", returns: "Devoluciones", sort: "Orden", filter: "Filtro", home: "Inicio", menu: "Menú", footer: "Pie", orderDisabled: "Pedido desactivado", placeholder: "Sin fotografía", currency: "Moneda", breadcrumb: "Ruta", results: "{count} resultados" },
  ca: { sales: "Venda tancada", search: "Cerca", categories: "Categories", empty: "Cap resultat", error: "No disponible", loading: "S'està carregant", price: "Preu", shipping: "Enviament", stock: "Disponibilitat", returns: "Devolucions", sort: "Ordena", filter: "Filtre", home: "Inici", menu: "Menú", footer: "Peu", orderDisabled: "Comanda desactivada", placeholder: "Sense fotografia", currency: "Moneda", breadcrumb: "Camí", results: "{count} resultats" },
  eu: { sales: "Salmenta itxita", search: "Bilatu", categories: "Kategoriak", empty: "Emaitzarik ez", error: "Ez dago erabilgarri", loading: "Kargatzen", price: "Prezioa", shipping: "Bidalketa", stock: "Eskuragarritasuna", returns: "Itzulketa", sort: "Ordena", filter: "Iragazkia", home: "Hasiera", menu: "Menua", footer: "Oina", orderDisabled: "Eskaera itzalita", placeholder: "Argazkirik ez", currency: "Moneta", breadcrumb: "Bidea", results: "{count} emaitza" },
  gl: { sales: "Venda pechada", search: "Buscar", categories: "Categorías", empty: "Sen resultados", error: "Non dispoñible", loading: "Cargando", price: "Prezo", shipping: "Envío", stock: "Dispoñibilidade", returns: "Devolucións", sort: "Orde", filter: "Filtro", home: "Inicio", menu: "Menú", footer: "Pé", orderDisabled: "Pedido desactivado", placeholder: "Sen fotografía", currency: "Moeda", breadcrumb: "Camiño", results: "{count} resultados" },
  sv: { sales: "Försäljning stängd", search: "Sök", categories: "Kategorier", empty: "Inga träffar", error: "Inte tillgänglig", loading: "Läser in", price: "Pris", shipping: "Frakt", stock: "Tillgänglighet", returns: "Retur", sort: "Sortering", filter: "Filter", home: "Hem", menu: "Meny", footer: "Sidfot", orderDisabled: "Beställning avstängd", placeholder: "Inget produktfoto", currency: "Valuta", breadcrumb: "Sökväg", results: "{count} träffar" },
  ga: { sales: "Díolachán dúnta", search: "Cuardaigh", categories: "Catagóirí", empty: "Gan torthaí", error: "Níl sé ar fáil", loading: "Ag lódáil", price: "Praghas", shipping: "Seoladh", stock: "Infhaighteacht", returns: "Tuairisceán", sort: "Sórtáil", filter: "Scagaire", home: "Baile", menu: "Roghchlár", footer: "Buntásc", orderDisabled: "Ordú díchumasaithe", placeholder: "Gan grianghraf", currency: "Airgeadra", breadcrumb: "Cosán", results: "{count} torthaí" },
};

function chrome(locale) {
  const code = String(locale || "");
  if (!LOCALES.includes(code) || code.includes("<") || code.includes(">") || code.includes("/") || code.includes("\\")) {
    return { ok: false, code: "LOCALE_REJECTED", locale: "de", dir: "ltr", strings: COPY.de, missing: [], provenance: "SOURCE_DE", review: "UNREVIEWED", humanReviewed: false };
  }
  const strings = COPY[code];
  const missing = KEYS.filter((key) => !strings || !strings[key] || !String(strings[key]).includes("{count}") && key === "results");
  const absent = KEYS.filter((key) => !strings || strings[key] == null || strings[key] === "");
  return {
    ok: absent.length === 0 && String(strings.results).includes("{count}"),
    locale: code,
    dir: code === "ar" ? "rtl" : "ltr",
    strings,
    missing: absent,
    provenance: code === "de" ? "SOURCE_DE" : "MACHINE_DRAFT",
    review: "UNREVIEWED",
    humanReviewed: false,
  };
}

function coverage() {
  return LOCALES.map((locale) => {
    const row = chrome(locale);
    return {
      locale,
      keys: KEYS.length,
      present: KEYS.length - row.missing.length,
      missing: row.missing,
      review: row.review,
      humanReviewed: false,
      provenance: row.provenance,
      dir: row.dir,
      placeholder: String(row.strings.results).includes("{count}"),
    };
  });
}

module.exports = { KEYS, LOCALES, chrome, coverage };
