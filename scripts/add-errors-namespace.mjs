#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const ERRORS = {
  de: { pageTitle: "Seite nicht gefunden", pageText: "Die angeforderte Seite existiert nicht oder wurde verschoben.", backHome: "Zur Startseite", viewProducts: "Produkte ansehen" },
  en: { pageTitle: "Page not found", pageText: "The requested page does not exist or has been moved.", backHome: "Back to home", viewProducts: "View products" },
  fr: { pageTitle: "Page introuvable", pageText: "La page demandée n'existe pas ou a été déplacée.", backHome: "Retour à l'accueil", viewProducts: "Voir les produits" },
  nl: { pageTitle: "Pagina niet gevonden", pageText: "De gevraagde pagina bestaat niet of is verplaatst.", backHome: "Naar startpagina", viewProducts: "Producten bekijken" },
  it: { pageTitle: "Pagina non trovata", pageText: "La pagina richiesta non esiste o è stata spostata.", backHome: "Torna alla home", viewProducts: "Vedi prodotti" },
  es: { pageTitle: "Página no encontrada", pageText: "La página solicitada no existe o se ha movido.", backHome: "Volver al inicio", viewProducts: "Ver productos" },
  pl: { pageTitle: "Nie znaleziono strony", pageText: "Żądana strona nie istnieje lub została przeniesiona.", backHome: "Strona główna", viewProducts: "Zobacz produkty" },
  tr: { pageTitle: "Sayfa bulunamadı", pageText: "İstenen sayfa mevcut değil veya taşınmış.", backHome: "Ana sayfaya dön", viewProducts: "Ürünleri görüntüle" },
  ar: { pageTitle: "الصفحة غير موجودة", pageText: "الصفحة المطلوبة غير موجودة أو تم نقلها.", backHome: "العودة إلى الرئيسية", viewProducts: "عرض المنتجات" },
  bg: { pageTitle: "Страницата не е намерена", pageText: "Заявената страница не съществува или е преместена.", backHome: "Към началото", viewProducts: "Виж продуктите" },
  hr: { pageTitle: "Stranica nije pronađena", pageText: "Tražena stranica ne postoji ili je premještena.", backHome: "Na početnu", viewProducts: "Pogledaj proizvode" },
  el: { pageTitle: "Η σελίδα δεν βρέθηκε", pageText: "Η ζητούμενη σελίδα δεν υπάρχει ή έχει μετακινηθεί.", backHome: "Αρχική σελίδα", viewProducts: "Δείτε προϊόντα" },
  cs: { pageTitle: "Stránka nenalezena", pageText: "Požadovaná stránka neexistuje nebo byla přesunuta.", backHome: "Domů", viewProducts: "Zobrazit produkty" },
  da: { pageTitle: "Siden blev ikke fundet", pageText: "Den ønskede side findes ikke eller er flyttet.", backHome: "Til forsiden", viewProducts: "Se produkter" },
  et: { pageTitle: "Lehte ei leitud", pageText: "Soovitud lehte ei eksisteeri või see on teisaldatud.", backHome: "Avalehele", viewProducts: "Vaata tooteid" },
  fi: { pageTitle: "Sivua ei löytynyt", pageText: "Pyydettyä sivua ei ole olemassa tai se on siirretty.", backHome: "Etusivulle", viewProducts: "Näytä tuotteet" },
  hu: { pageTitle: "Az oldal nem található", pageText: "A kért oldal nem létezik vagy áthelyezték.", backHome: "Főoldal", viewProducts: "Termékek megtekintése" },
  lv: { pageTitle: "Lapa nav atrasta", pageText: "Pieprasītā lapa neeksistē vai ir pārvietota.", backHome: "Uz sākumu", viewProducts: "Skatīt produktus" },
  lt: { pageTitle: "Puslapis nerastas", pageText: "Pageidaujamas puslapis neegzistuoja arba buvo perkeltas.", backHome: "Į pradžią", viewProducts: "Peržiūrėti produktus" },
  lb: { pageTitle: "Säit net fonnt", pageText: "D'gefrot Säit existéiert net oder gouf verschoven.", backHome: "Zréck op d'Start", viewProducts: "Produkter kucken" },
  mt: { pageTitle: "Paġna mhux misjuba", pageText: "Il-paġna mitluba ma tezistix jew ġiet imżumla.", backHome: "Lura għall-home", viewProducts: "Ara prodotti" },
  pt: { pageTitle: "Página não encontrada", pageText: "A página solicitada não existe ou foi movida.", backHome: "Voltar ao início", viewProducts: "Ver produtos" },
  ro: { pageTitle: "Pagina nu a fost găsită", pageText: "Pagina solicitată nu există sau a fost mutată.", backHome: "Înapoi acasă", viewProducts: "Vezi produse" },
  sk: { pageTitle: "Stránka sa nenašla", pageText: "Požadovaná stránka neexistuje alebo bola presunutá.", backHome: "Na úvod", viewProducts: "Zobraziť produkty" },
  sl: { pageTitle: "Strani ni mogoče najti", pageText: "Zahtevana stran ne obstaja ali je bila premaknjena.", backHome: "Na domačo stran", viewProducts: "Prikaži izdelke" },
  ca: { pageTitle: "Pàgina no trobada", pageText: "La pàgina sol·licitada no existeix o s'ha mogut.", backHome: "Torna a l'inici", viewProducts: "Veure productes" },
  eu: { pageTitle: "Orria ez da aurkitu", pageText: "Eskatutako orria ez da existitzen edo lekuz aldatu da.", backHome: "Hasierara", viewProducts: "Ikusi produktuak" },
  gl: { pageTitle: "Páxina non atopada", pageText: "A páxina solicitada non existe ou foi movida.", backHome: "Volver ao inicio", viewProducts: "Ver produtos" },
  sv: { pageTitle: "Sidan hittades inte", pageText: "Den begärda sidan finns inte eller har flyttats.", backHome: "Till startsidan", viewProducts: "Visa produkter" },
  ga: { pageTitle: "Níor aimsíodh an leathanach", pageText: "Níl an leathanach iarrtha ann nó bogadh é.", backHome: "Ar ais go dtí an baile", viewProducts: "Féach ar tháirgí" },
};

const block = (lang) => {
  const e = ERRORS[lang];
  return `  errors: {
    pageTitle: ${JSON.stringify(e.pageTitle)},
    pageText: ${JSON.stringify(e.pageText)},
    backHome: ${JSON.stringify(e.backHome)},
    viewProducts: ${JSON.stringify(e.viewProducts)},
  },`;
};

for (const file of readdirSync("lib/i18n/locales").filter((f) => f.endsWith(".ts"))) {
  const lang = file.replace(".ts", "");
  if (!ERRORS[lang]) continue;
  const path = `lib/i18n/locales/${file}`;
  let src = readFileSync(path, "utf8");
  if (src.includes("errors:")) continue;
  src = src.replace(/\n\s*ai:\s*\{/, `\n${block(lang)}\n  ai: {`);
  writeFileSync(path, src);
  console.log("patched", lang);
}
