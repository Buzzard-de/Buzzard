#!/usr/bin/env python3
"""Generate canonical main-category labels and UI gap fills for all 30 locales."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = json.loads((ROOT / "lib/i18n/supported-locales.json").read_text())
EN_GAPS = json.loads((ROOT / "data/i18n/en-gap-keys.json").read_text())

# 53 master categories — names per locale. English is the fallback inventory.
EN_MAINS = {
    "cat-01": "Textiles",
    "cat-02": "Cosmetics & Personal Care",
    "cat-03": "Cleaning Products",
    "cat-04": "School & Office Supplies",
    "cat-05": "Automotive",
    "cat-06": "Pet Supplies",
    "cat-07": "Garden",
    "cat-08": "Work Safety & Workwear",
    "cat-09": "Tools & Hardware",
    "cat-10": "Home & Living",
    "cat-11": "Furniture",
    "cat-12": "Electronics",
    "cat-13": "Home Appliances",
    "cat-14": "Sports & Outdoor",
    "cat-15": "Shoes",
    "cat-16": "Bags & Accessories",
    "cat-17": "Mother & Baby",
    "cat-18": "Toys & Kids",
    "cat-19": "Hobby & Leisure",
    "cat-20": "Livestock & Farm Equipment",
    "cat-21": "Construction",
    "cat-22": "Electrical & Lighting",
    "cat-23": "Water, Heating & Plumbing",
    "cat-24": "Kitchen & Dining",
    "cat-25": "Food & Beverages",
    "cat-26": "Pet Food",
    "cat-27": "Health & Wellness",
    "cat-28": "Office & Business",
    "cat-29": "Packaging & Shipping",
    "cat-30": "Industrial & Commercial Equipment",
    "cat-31": "Security & Surveillance",
    "cat-32": "Travel & Luggage",
    "cat-33": "Garden Hobby & Camping",
    "cat-34": "Seasonal & Celebrations",
    "cat-35": "Decoration",
    "cat-36": "Personal Electronics & Mobile",
    "cat-37": "Photo & Video",
    "cat-38": "Computer & Gaming",
    "cat-39": "Vehicle & Mobility",
    "cat-40": "Energy & Solar",
    "cat-41": "Offers & Special Collections",
    "cat-42": "Home Textiles",
    "cat-43": "Jewelry & Watches",
    "cat-44": "Personal Care",
    "cat-45": "Pharmacy & Medical Products",
    "cat-46": "Beverages",
    "cat-47": "Children & School",
    "cat-48": "Music & Instruments",
    "cat-49": "Books, Media & Entertainment",
    "cat-50": "Gifts, Flowers & Occasions",
    "cat-51": "Crafts, Sewing & DIY",
    "cat-52": "Pool, Spa & Wellness Equipment",
    "cat-53": "Luxury, Collectibles & Valuables",
}

DE_MAINS = {
    "cat-01": "Textil", "cat-02": "Kosmetik & Körperpflege", "cat-03": "Reinigungsprodukte",
    "cat-04": "Schule & Bürobedarf", "cat-05": "Automotive", "cat-06": "Haustierbedarf",
    "cat-07": "Garten", "cat-08": "Arbeitsschutz & Berufskleidung", "cat-09": "Werkzeuge & Eisenwaren",
    "cat-10": "Haus & Wohnen", "cat-11": "Möbel", "cat-12": "Elektronik", "cat-13": "Haushaltsgeräte",
    "cat-14": "Sport & Outdoor", "cat-15": "Schuhe", "cat-16": "Taschen & Accessoires",
    "cat-17": "Mutter & Baby", "cat-18": "Spielzeug & Kinder", "cat-19": "Hobby & Freizeit",
    "cat-20": "Tier- & Landwirtschaftsausrüstung", "cat-21": "Bau & Konstruktion",
    "cat-22": "Elektro & Beleuchtung", "cat-23": "Wasser, Heizung & Sanitär",
    "cat-24": "Küche & Essen", "cat-25": "Lebensmittel & Getränke", "cat-26": "Tierfutter",
    "cat-27": "Gesundheit & Wellness", "cat-28": "Büro & Gewerbe", "cat-29": "Verpackung & Versand",
    "cat-30": "Industrie- & Gewerbeausrüstung", "cat-31": "Sicherheit & Überwachung",
    "cat-32": "Reise & Koffer", "cat-33": "Gartenhobby & Camping", "cat-34": "Saisonales & Feiern",
    "cat-35": "Dekoration", "cat-36": "Persönliche Elektronik & Mobil", "cat-37": "Foto & Video",
    "cat-38": "Computer & Gaming", "cat-39": "Fahrzeug & Mobilität", "cat-40": "Energie & Solar",
    "cat-41": "Angebote & Sonderkollektionen", "cat-42": "Heimtextilien", "cat-43": "Schmuck & Uhren",
    "cat-44": "Körperpflege", "cat-45": "Apotheke & Medizinprodukte", "cat-46": "Getränke",
    "cat-47": "Kinder & Schule", "cat-48": "Musik & Musikinstrumente",
    "cat-49": "Bücher, Medien & Unterhaltung", "cat-50": "Geschenke, Blumen & Anlässe",
    "cat-51": "Kunsthandwerk, Nähen & DIY", "cat-52": "Pool, Spa & Wellness-Ausstattung",
    "cat-53": "Luxus, Sammlerstücke & Wertvolles",
}

TR_MAINS = {
    "cat-01": "Tekstil", "cat-02": "Kozmetik & Kişisel Bakım", "cat-03": "Temizlik Ürünleri",
    "cat-04": "Okul & Ofis", "cat-05": "Otomotiv", "cat-06": "Evcil Hayvan", "cat-07": "Bahçe",
    "cat-08": "İş Güvenliği & İş Kıyafetleri", "cat-09": "Aletler & Hırdavat", "cat-10": "Ev & Yaşam",
    "cat-11": "Mobilya", "cat-12": "Elektronik", "cat-13": "Ev Aletleri", "cat-14": "Spor & Outdoor",
    "cat-15": "Ayakkabı", "cat-16": "Çanta & Aksesuar", "cat-17": "Anne & Bebek", "cat-18": "Oyuncak & Çocuk",
    "cat-19": "Hobi & Eğlence", "cat-20": "Tarım Ekipmanları", "cat-21": "Yapı & İnşaat",
    "cat-22": "Elektrik & Aydınlatma", "cat-23": "Su, Isıtma & Tesisat", "cat-24": "Mutfak",
    "cat-25": "Gıda & İçecek", "cat-26": "Evcil Hayvan Maması", "cat-27": "Sağlık & Wellness",
    "cat-28": "Ofis & Ticaret", "cat-29": "Ambalaj & Kargo", "cat-30": "Endüstriyel Ekipman",
    "cat-31": "Güvenlik & Gözetim", "cat-32": "Seyahat & Bavul", "cat-33": "Kamp & Bahçe Hobi",
    "cat-34": "Sezonluk & Kutlama", "cat-35": "Dekorasyon", "cat-36": "Kişisel Elektronik",
    "cat-37": "Fotoğraf & Video", "cat-38": "Bilgisayar & Oyun", "cat-39": "Araç & Mobilite",
    "cat-40": "Enerji & Güneş", "cat-41": "Fırsatlar", "cat-42": "Ev Tekstili", "cat-43": "Mücevher & Saat",
    "cat-44": "Kişisel Bakım", "cat-45": "Eczane & Medikal", "cat-46": "İçecekler", "cat-47": "Çocuk & Okul",
    "cat-48": "Müzik & Enstrüman", "cat-49": "Kitap, Medya & Eğlence", "cat-50": "Hediye & Çiçek",
    "cat-51": "El Sanatları & DIY", "cat-52": "Havuz & Spa", "cat-53": "Lüks & Koleksiyon",
}

AR_MAINS = {
    "cat-01": "النسيج", "cat-02": "التجميل والعناية الشخصية", "cat-03": "منتجات التنظيف",
    "cat-04": "المدرسة والمكتب", "cat-05": "السيارات", "cat-06": "مستلزمات الحيوانات",
    "cat-07": "الحديقة", "cat-08": "معدات السلامة والملابس المهنية", "cat-09": "الأدوات والعدد",
    "cat-10": "المنزل والمعيشة", "cat-11": "الأثاث", "cat-12": "الإلكترونيات", "cat-13": "الأجهزة المنزلية",
    "cat-14": "الرياضة والأنشطة الخارجية", "cat-15": "الأحذية", "cat-16": "الحقائب والإكسسوارات",
    "cat-17": "الأم والطفل", "cat-18": "الألعاب والأطفال", "cat-19": "الهوايات والترفيه",
    "cat-20": "المعدات الزراعية", "cat-21": "البناء", "cat-22": "الكهرباء والإضاءة",
    "cat-23": "المياه والتدفئة والسباكة", "cat-24": "المطبخ", "cat-25": "الأغذية والمشروبات",
    "cat-26": "طعام الحيوانات", "cat-27": "الصحة والعافية", "cat-28": "المكتب والأعمال",
    "cat-29": "التعبئة والشحن", "cat-30": "المعدات الصناعية", "cat-31": "الأمن والمراقبة",
    "cat-32": "السفر والحقائب", "cat-33": "التخييم وهواية الحديقة", "cat-34": "موسمي واحتفالات",
    "cat-35": "الديكور", "cat-36": "الإلكترونيات الشخصية", "cat-37": "التصوير والفيديو",
    "cat-38": "الحاسوب والألعاب", "cat-39": "المركبات والتنقل", "cat-40": "الطاقة والطاقة الشمسية",
    "cat-41": "العروض والمجموعات الخاصة", "cat-42": "منسوجات المنزل", "cat-43": "المجوهرات والساعات",
    "cat-44": "العناية الشخصية", "cat-45": "الصيدلية والمنتجات الطبية", "cat-46": "المشروبات",
    "cat-47": "الأطفال والمدرسة", "cat-48": "الموسيقى والآلات", "cat-49": "الكتب والإعلام والترفيه",
    "cat-50": "الهدايا والزهور والمناسبات", "cat-51": "الحرف والخياطة", "cat-52": "المسبح والسبا",
    "cat-53": "الفخامة والمقتنيات",
}

# locale -> list of 53 labels in EN_MAINS key order
EU = {
    "fr": ["Textiles","Cosmétiques & soins","Produits d'entretien","Fournitures scolaires & bureau","Automobile","Animaux","Jardin","Sécurité au travail & vêtements pro","Outils & quincaillerie","Maison & vie","Meubles","Électronique","Électroménager","Sport & outdoor","Chaussures","Sacs & accessoires","Maman & bébé","Jouets & enfants","Loisirs","Équipement agricole","Construction","Électricité & éclairage","Eau, chauffage & plomberie","Cuisine","Alimentation & boissons","Alimentation animale","Santé & bien-être","Bureau & entreprise","Emballage & expédition","Équipement industriel","Sécurité & surveillance","Voyage & bagages","Camping & jardin","Saisonnier & fêtes","Décoration","Électronique personnelle","Photo & vidéo","Informatique & jeux","Véhicule & mobilité","Énergie & solaire","Offres & collections","Textiles de maison","Bijoux & montres","Soins personnels","Pharmacie & médical","Boissons","Enfants & école","Musique & instruments","Livres, médias & divertissement","Cadeaux, fleurs & occasions","Artisanat, couture & DIY","Piscine, spa & wellness","Luxe & collections"],
    "nl": ["Textiel","Cosmetica & lichaamsverzorging","Schoonmaakproducten","School & kantoor","Automotive","Huisdieren","Tuin","Werkveiligheid & werkkleding","Gereedschap & ijzerwaren","Wonen","Meubels","Elektronica","Huishoudelijke apparaten","Sport & outdoor","Schoenen","Tassen & accessoires","Moeder & baby","Speelgoed & kinderen","Hobby & vrije tijd","Landbouwuitrusting","Bouw","Elektriciteit & verlichting","Water, verwarming & sanitair","Keuken","Voeding & dranken","Dierenvoeding","Gezondheid & wellness","Kantoor & bedrijf","Verpakking & verzending","Industrieel materieel","Beveiliging & bewaking","Reizen & bagage","Camping & tuin","Seizoen & feesten","Decoratie","Persoonlijke elektronica","Foto & video","Computer & gaming","Voertuig & mobiliteit","Energie & zon","Aanbiedingen","Woontextiel","Sieraden & horloges","Persoonlijke verzorging","Apotheek & medisch","Dranken","Kinderen & school","Muziek & instrumenten","Boeken, media & entertainment","Cadeaus, bloemen & gelegenheden","Handwerk, naaien & DIY","Zwembad, spa & wellness","Luxe & collectibles"],
    "it": ["Tessile","Cosmesi & cura","Pulizia","Scuola & ufficio","Automotive","Animali","Giardino","Sicurezza sul lavoro","Utensili & ferramenta","Casa","Mobili","Elettronica","Elettrodomestici","Sport & outdoor","Scarpe","Borse & accessori","Mamma & bambino","Giocattoli","Hobby & tempo libero","Attrezzature agricole","Edilizia","Elettricità & illuminazione","Acqua, riscaldamento & idraulica","Cucina","Alimenti & bevande","Cibo per animali","Salute & benessere","Ufficio & business","Imballaggio & spedizione","Attrezzature industriali","Sicurezza & sorveglianza","Viaggi & bagagli","Camping","Stagionale & feste","Decorazione","Elettronica personale","Foto & video","Computer & gaming","Veicoli & mobilità","Energia & solare","Offerte","Tessili per la casa","Gioielli & orologi","Cura personale","Farmacia & medicale","Bevande","Bambini & scuola","Musica & strumenti","Libri, media & intrattenimento","Regali, fiori & occasioni","Artigianato, cucito & DIY","Piscina, spa & wellness","Lusso & collezioni"],
    "es": ["Textil","Cosmética & cuidado","Limpieza","Papelería & oficina","Automoción","Mascotas","Jardín","Seguridad laboral","Herramientas","Hogar","Muebles","Electrónica","Electrodomésticos","Deporte & outdoor","Zapatos","Bolsos & accesorios","Mamá & bebé","Juguetes","Aficiones","Equipo agrícola","Construcción","Electricidad & iluminación","Agua, calefacción & fontanería","Cocina","Alimentación & bebidas","Comida para mascotas","Salud & wellness","Oficina & empresa","Embalaje & envío","Equipo industrial","Seguridad & vigilancia","Viaje & maletas","Camping","Temporada & fiestas","Decoración","Electrónica personal","Foto & vídeo","Informática & gaming","Vehículo & movilidad","Energía & solar","Ofertas","Textil hogar","Joyería & relojes","Cuidado personal","Farmacia & médico","Bebidas","Niños & colegio","Música & instrumentos","Libros, medios & ocio","Regalos, flores & ocasiones","Manualidades, costura & DIY","Piscina, spa & wellness","Lujo & coleccionables"],
    "pl": ["Tekstylia","Kosmetyki & pielęgnacja","Chemia gospodarcza","Szkoła & biuro","Motoryzacja","Zwierzęta","Ogród","BHP & odzież robocza","Narzędzia","Dom & wnętrze","Meble","Elektronika","AGD","Sport & outdoor","Obuwie","Torby & akcesoria","Mama & dziecko","Zabawki","Hobby","Sprzęt rolniczy","Budowa","Elektryka & oświetlenie","Woda, ogrzewanie & hydraulika","Kuchnia","Żywność & napoje","Karma","Zdrowie & wellness","Biuro & biznes","Opakowania & wysyłka","Sprzęt przemysłowy","Ochrona & monitoring","Podróże & bagaż","Camping","Sezon & święta","Dekoracje","Elektronika osobista","Foto & wideo","Komputer & gry","Pojazdy & mobilność","Energia & solar","Oferty","Tekstylia domowe","Biżuteria & zegarki","Pielęgnacja","Apteka & medycyna","Napoje","Dzieci & szkoła","Muzyka & instrumenty","Książki, media & rozrywka","Prezenty, kwiaty & okazje","Rękodzieło, szycie & DIY","Basen, spa & wellness","Luksus & kolekcje"],
    "pt": ["Têxteis","Cosmética & cuidado","Limpeza","Escola & escritório","Automóvel","Animais","Jardim","Segurança no trabalho","Ferramentas","Casa","Mobiliário","Eletrónica","Eletrodomésticos","Desporto & outdoor","Calçado","Malas & acessórios","Mãe & bebé","Brinquedos","Passatempos","Equipamento agrícola","Construção","Eletricidade & iluminação","Água, aquecimento & canalização","Cozinha","Alimentação & bebidas","Ração","Saúde & wellness","Escritório & negócios","Embalagem & envio","Equipamento industrial","Segurança & vigilância","Viagem & bagagem","Camping","Sazonal & festas","Decoração","Eletrónica pessoal","Foto & vídeo","Computador & gaming","Veículo & mobilidade","Energia & solar","Ofertas","Têxteis-lar","Joalharia & relógios","Cuidado pessoal","Farmácia & médico","Bebidas","Crianças & escola","Música & instrumentos","Livros, média & entretenimento","Presentes, flores & ocasiões","Artesanato, costura & DIY","Piscina, spa & wellness","Luxo & coleções"],
    "cs": ["Textil","Kosmetika & péče","Čisticí prostředky","Škola & kancelář","Automotive","Domácí mazlíčci","Zahrada","BOZP & pracovní oděvy","Nářadí","Domov","Nábytek","Elektronika","Spotřebiče","Sport & outdoor","Obuv","Tašky & doplňky","Máma & dítě","Hračky","Hobby","Zemědělská technika","Stavba","Elektro & osvětlení","Voda, topení & instalace","Kuchyně","Potraviny & nápoje","Krmivo","Zdraví & wellness","Kancelář & business","Obaly & doprava","Průmyslové vybavení","Zabezpečení","Cestování & zavazadla","Kempování","Sezónní & svátky","Dekorace","Osobní elektronika","Foto & video","Počítače & hry","Vozidla & mobilita","Energie & solár","Nabídky","Bytový textil","Šperky & hodinky","Osobní péče","Lékárna & zdravotnictví","Nápoje","Děti & škola","Hudba & nástroje","Knihy, média & zábava","Dárky, květiny & příležitosti","Řemesla, šití & DIY","Bazén, spa & wellness","Luxus & sběratelství"],
    "it2": [],
}

ORDER = list(EN_MAINS.keys())


def zip_locale(labels: list[str]) -> dict[str, str]:
    if len(labels) != 53:
        raise SystemExit(f"expected 53 labels, got {len(labels)}")
    return dict(zip(ORDER, labels))


MORE = {
    "sv": ["Textil","Kosmetika & hudvård","Rengöring","Skola & kontor","Fordon","Husdjur","Trädgård","Arbetsskydd","Verktyg","Hem","Möbler","Elektronik","Vitvaror","Sport & outdoor","Skor","Väskor","Mamma & baby","Leksaker","Hobby","Lantbruk","Bygg","El & belysning","Vatten, värme & VVS","Kök","Livsmedel & dryck","Djurfoder","Hälsa","Kontor","Emballage & frakt","Industriutrustning","Säkerhet","Resor","Camping","Säsong & fest","Dekoration","Personlig elektronik","Foto & video","Dator & spel","Fordon & mobilitet","Energi & sol","Erbjudanden","Hemtextil","Smycken & klockor","Personlig vård","Apotek & medicin","Drycker","Barn & skola","Musik & instrument","Böcker, media & underhållning","Presenter, blommor","Hantverk, sömnad & DIY","Pool, spa & wellness","Lyx & samlarobjekt"],
    "da": ["Tekstil","Kosmetik & pleje","Rengøring","Skole & kontor","Automotive","Kæledyr","Have","Arbejdssikkerhed","Værktøj","Hjem","Møbler","Elektronik","Hårde hvidevarer","Sport & outdoor","Sko","Tasker","Mor & baby","Legetøj","Hobby","Landbrug","Byggeri","El & belysning","Vand, varme & VVS","Køkken","Mad & drikke","Dyrefoder","Sundhed","Kontor","Emballage & forsendelse","Industrielt udstyr","Sikkerhed","Rejse","Camping","Sæson & fest","Dekoration","Personlig elektronik","Foto & video","Computer & gaming","Køretøj & mobilitet","Energi & sol","Tilbud","Hjemmetekstiler","Smykker & ure","Personlig pleje","Apotek & medicin","Drikkevarer","Børn & skole","Musik & instrumenter","Bøger, medier & underholdning","Gaver, blomster","Håndværk, syning & DIY","Pool, spa & wellness","Luksus & samlerobjekter"],
    "fi": ["Tekstiili","Kosmetiikka","Siivous","Koulu & toimisto","Autoilu","Lemmikit","Puutarha","Työturvallisuus","Työkalut","Koti","Huonekalut","Elektroniikka","Kodinkoneet","Urheilu","Kengät","Laukut","Äiti & vauva","Lelut","Harrasteet","Maatalous","Rakentaminen","Sähkö & valaistus","Vesi, lämpö & LVI","Keittiö","Ruoka & juoma","Lemmikkiruoka","Terveys","Toimisto","Pakkaus & toimitus","Teollisuuslaitteet","Turvallisuus","Matkailu","Retkeily","Kausi & juhlat","Sisustus","Henkilökohtainen elektroniikka","Kuva & video","Tietokone & pelit","Ajoneuvot","Energia & aurinko","Tarjoukset","Kodintekstiilit","Korut & kellot","Ihonhoito","Apteekki","Juomat","Lapset & koulu","Musiikki","Kirjat, media & viihde","Lahjat & kukat","Käsityö & DIY","Allas, spa & wellness","Luksus"],
    "hu": ["Textil","Kozmetikum","Tisztítás","Iskola & iroda","Autó","Kisállat","Kert","Munkavédelem","Szerszám","Otthon","Bútor","Elektronika","Háztartási gépek","Sport","Cipő","Táskák","Anya & baba","Játék","Hobbi","Mezőgazdaság","Építés","Villamos & világítás","Víz, fűtés & szaniter","Konyha","Élelmiszer & ital","Állateledel","Egészség","Iroda","Csomagolás & szállítás","Ipari berendezés","Biztonság","Utazás","Kemping","Szezon & ünnep","Dekoráció","Személyes elektronika","Fotó & videó","Számítógép & játék","Jármű","Energia & nap","Ajánlatok","Lakástextil","Ékszer & óra","Személyes ápolás","Patika","Italok","Gyerek & iskola","Zene","Könyv, média & szórakozás","Ajándék & virág","Kézművesség & DIY","Medence, spa","Luxus"],
    "ro": ["Textile","Cosmetică","Curățenie","Școală & birou","Auto","Animale","Grădină","Protecția muncii","Scule","Casă","Mobilă","Electronică","Electrocasnice","Sport","Încălțăminte","Genți","Mamă & bebe","Jucării","Hobby","Agricultură","Construcții","Electric & iluminat","Apă, încălzire & sanitare","Bucătărie","Alimente & băuturi","Hrană animale","Sănătate","Birou","Ambalare & livrare","Echipamente industriale","Securitate","Călătorii","Camping","Sezon & sărbători","Decorațiuni","Electronică personală","Foto & video","Computer & gaming","Vehicule","Energie & solar","Oferte","Textile casă","Bijuterii & ceasuri","Îngrijire","Farmacie","Băuturi","Copii & școală","Muzică","Cărți, media & divertisment","Cadouri & flori","Handmade & DIY","Piscină, spa","Lux"],
    "el": ["Κλωστοϋφαντουργία","Καλλυντικά","Καθαρισμός","Σχολείο & γραφείο","Αυτοκίνητο","Κατοικίδια","Κήπος","Ασφάλεια εργασίας","Εργαλεία","Σπίτι","Έπιπλα","Ηλεκτρονικά","Οικιακές συσκευές","Αθλητισμός","Παπούτσια","Τσάντες","Μητέρα & βρέφος","Παιχνίδια","Χόμπι","Γεωργία","Κατασκευές","Ηλεκτρολογία & φωτισμός","Νερό, θέρμανση & υδραυλικά","Κουζίνα","Τρόφιμα & ποτά","Τροφές ζώων","Υγεία","Γραφείο","Συσκευασία & αποστολή","Βιομηχανικός εξοπλισμός","Ασφάλεια","Ταξίδι","Camping","Εποχιακά","Διακόσμηση","Προσωπικά ηλεκτρονικά","Φωτογραφία & βίντεο","Υπολογιστές & gaming","Οχήματα","Ενέργεια & ηλιακά","Προσφορές","Λευκά είδη","Κοσμήματα & ρολόγια","Προσωπική φροντίδα","Φαρμακείο","Ποτά","Παιδιά & σχολείο","Μουσική","Βιβλία, μέσα & ψυχαγωγία","Δώρα & άνθη","Χειροτεχνία & DIY","Πισίνα, spa","Πολυτέλεια"],
    "bg": ["Текстил","Козметика","Почистване","Училище & офис","Автомобили","Домашни любимци","Градина","Трудова безопасност","Инструменти","Дом","Мебели","Електроника","Уреди","Спорт","Обувки","Чанти","Майка & бебе","Играчки","Хоби","Селско стопанство","Строителство","Електро & осветление","Вода, отопление & ВиК","Кухня","Храни & напитки","Храна за животни","Здраве","Офис","Опаковка & доставка","Индустриално оборудване","Сигурност","Пътуване","Къмпинг","Сезонни","Декорация","Лична електроника","Фото & видео","Компютри & игри","Превозни средства","Енергия & солар","Оферти","Домашен текстил","Бижута & часовници","Лична грижа","Аптека","Напитки","Деца & училище","Музика","Книги, медии & развлечения","Подаръци & цветя","Занаяти & DIY","Басейн, спа","Лукс"],
    "hr": ["Tekstil","Kozmetika","Čišćenje","Škola & ured","Automobili","Kućni ljubimci","Vrt","Zaštita na radu","Alati","Dom","Namještaj","Elektronika","Kućanski aparati","Sport","Obuća","Torbe","Mama & beba","Igračke","Hobby","Poljoprivreda","Građevina","Elektro & rasvjeta","Voda, grijanje & sanitarije","Kuhinja","Hrana & piće","Hrana za ljubimce","Zdravlje","Ured","Ambalaža & dostava","Industrija","Sigurnost","Putovanja","Kampiranje","Sezona","Dekoracija","Osobna elektronika","Foto & video","Računala & igre","Vozila","Energija & solar","Ponude","Kućni tekstil","Nakit & satovi","Osobna njega","Ljekarna","Pića","Djeca & škola","Glazba","Knjige, mediji & zabava","Pokloni & cvijeće","Ručni rad & DIY","Bazen, spa","Luksuz"],
    "sk": ["Textil","Kozmetika","Čistenie","Škola & kancelária","Automobil","Domáce zvieratá","Záhrada","BOZP","Náradie","Domov","Nábytok","Elektronika","Spotrebiče","Šport","Obuv","Tašky","Mama & dieťa","Hračky","Hobby","Poľnohospodárstvo","Stavba","Elektro & osvetlenie","Voda, kúrenie","Kuchyňa","Potraviny & nápoje","Krmivo","Zdravie","Kancelária","Obaly & doprava","Priemysel","Bezpečnosť","Cestovanie","Kempovanie","Sezónne","Dekorácie","Osobná elektronika","Foto & video","Počítače & hry","Vozidlá","Energia & solár","Ponuky","Bytový textil","Šperky & hodinky","Osobná starostlivosť","Lekáreň","Nápoje","Deti & škola","Hudba","Knihy, médiá","Darčeky & kvety","Remeslá & DIY","Bazén, spa","Luxus"],
    "sl": ["Tekstil","Kozmetika","Čiščenje","Šola & pisarna","Avtomobilizem","Hišni ljubljenčki","Vrt","Varnost pri delu","Orodje","Dom","Pohištvo","Elektronika","Gospodinjski aparati","Šport","Obutev","Torbe","Mama & dojenček","Igrače","Hobby","Kmetijstvo","Gradnja","Elektro & razsvetljava","Voda, ogrevanje","Kuhinja","Hrana & pijača","Hrana za živali","Zdravje","Pisarna","Embalaža & pošiljanje","Industrija","Varnost","Potovanja","Kampiranje","Sezona","Dekoracija","Osebna elektronika","Foto & video","Računalnik & igre","Vozila","Energija & solar","Ponudbe","Gospodinjski tekstil","Nakit & ure","Osebna nega","Lekarna","Pijače","Otroci & šola","Glasba","Knjige, mediji","Darila & cvetje","Rokodelska dela & DIY","Bazen, spa","Luksuz"],
    "lt": ["Tekstilė","Kosmetika","Valymas","Mokykla & biuras","Automobiliai","Augintiniai","Sodas","Darbo sauga","Įrankiai","Namai","Baldai","Elektronika","Buitinė technika","Sportas","Avalynė","Krepšiai","Mama & kūdikis","Žaislai","Pomėgiai","Žemės ūkis","Statyba","Elektra & apšvietimas","Vanduo, šildymas","Virtuvė","Maistas & gėrimai","Gyvūnų ėdalas","Sveikata","Biuras","Pakuotės & siuntimas","Pramonė","Apsauga","Kelionės","Stovyklavimas","Sezonas","Dekoras","Asmeninė elektronika","Foto & video","Kompiuteriai","Transportas","Energija & saulė","Pasiūlymai","Namų tekstilė","Papuošalai & laikrodžiai","Asmeninė priežiūra","Vaistinė","Gėrimai","Vaikai & mokykla","Muzika","Knygos, medija","Dovanos & gėlės","Amatai & DIY","Baseinas, spa","Prabanga"],
    "lv": ["Tekstils","Kosmētika","Tīrīšana","Skola & birojs","Auto","Mājdzīvnieki","Dārzs","Darba drošība","Instrumenti","Māja","Mēbeles","Elektronika","Sadzīves tehnika","Sports","Apavi","Somas","Mamma & bērns","Rotaļlietas","Hobijs","Lauksaimniecība","Būvniecība","Elektrība & apgaismojums","Ūdens, apkure","Virtuve","Pārtika & dzērieni","Dzīvnieku barība","Veselība","Birojs","Iepakojums & piegāde","Rūpniecība","Drošība","Ceļojumi","Kempings","Sezona","Dekors","Personīgā elektronika","Foto & video","Datori","Transportlīdzekļi","Enerģija & saule","Piedāvājumi","Mājas tekstils","Rotas & pulksteņi","Personīgā kopšana","Aptieka","Dzērieni","Bērni & skola","Mūzika","Grāmatas, mediji","Dāvanas & ziedi","Rokdarbi & DIY","Baseins, spa","Greznība"],
    "et": ["Tekstiil","Kosmeetika","Puhastus","Kool & kontor","Auto","Lemmikloomad","Aed","Tööohutus","Tööriistad","Kodu","Mööbel","Elektroonika","Kodumasinad","Sport","Jalatsid","Kotid","Ema & beebi","Mänguasjad","Hobi","Põllumajandus","Ehitus","Elekter & valgustus","Vesi, küte","Köök","Toit & jook","Lemmikloomatoit","Tervis","Kontor","Pakend & saatmine","Tööstus","Turvalisus","Reisimine","Telkimine","Hooaeg","Dekoratsioon","Isiklik elektroonika","Foto & video","Arvuti","Sõidukid","Energia & päike","Pakkumised","Kodutekstiil","Ehted & kellad","Isiklik hooldus","Apteek","Joogid","Lapsed & kool","Muusika","Raamatud, meedia","Kingitused & lilled","Käsitöö & DIY","Bassein, spa","Luksus"],
    "lb": ["Textil","Kosmetik","Botzen","Schoul & Büro","Auto","Hausdéieren","Gaart","Aarbechtssécherheet","Geschir","Haus","Miwwelen","Elektronik","Hausgeräter","Sport","Schong","Täschen","Mamm & Baby","Spillsaachen","Hobby","Landwirtschaft","Bau","Elektro & Beliichtung","Waasser, Heizung","Kichen","Liewensmëttel","Déierefudder","Gesondheet","Büro","Verpakung","Industrie","Sécherheet","Reesen","Camping","Saison","Dekoratioun","Perséinlech Elektronik","Foto & Video","Computer","Gefierer","Energie & Solar","Offeren","Haushaltstextilien","Bijouen & Aueren","Perséinlech Fleeg","Apdikt","Gedrénks","Kanner & Schoul","Musek","Bicher, Medien","Cadeauen & Blumen","Handwierk & DIY","Pool, Spa","Luxus"],
    "mt": ["Tessuti","Kożmetiċi","Tindif","Skola & uffiċċju","Karozzi","Annimali","Ġnien","Sigurtà fuq ix-xogħol","Għodda","Dar","Għamara","Elettronika","Apparat tad-dar","Sport","Żraben","Basktijiet","Omm & tarbija","Ġugarelli","Passatempi","Agrikoltura","Kostruzzjoni","Elettriku & dawl","Ilma, tisħin","Kċina","Ikel & xorb","Ikel għall-annimali","Saħħa","Uffiċċju","Ippakkjar","Industrija","Sigurtà","Ivvjaġġar","Camping","Staġun","Dekorazzjoni","Elettronika personali","Ritratti & video","Kompjuter","Vetturi","Enerġija & solari","Offerti","Tessuti tad-dar","Dehbijiet & arloġġi","Kura personali","Spiżerija","Xorb","Tfal & skola","Mużika","Kotba, midja","Rigali & fjuri","Snajja & DIY","Pixxina, spa","Lussu"],
    "ga": ["Teicstílí","Cosmaidí","Glanadh","Scoil & oifig","Feithiclí","Peataí","Gairdín","Sábháilteacht oibre","Uirlisí","Baile","Troscán","Leictreonaic","Fearais tí","Spórt","Bróga","Málaí","Máthair & leanbh","Bréagáin","Caitheamh aimsire","Talmhaíocht","Tógáil","Leictreachas & soilsú","Uisce, teas","Cistin","Bia & deoch","Bia peataí","Sláinte","Oifig","Pacáistiú","Trealamh tionsclaíoch","Slándáil","Taisteal","Campáil","Séasúr","Maisiú","Leictreonaic phearsanta","Grianghraf & físeán","Ríomhaire","Feithiclí & soghluaisteacht","Fuinneamh & grian","Tairiscintí","Teicstílí tí","Seodra & uaireadóirí","Cúram pearsanta","Cógaslann","Deochanna","Páistí & scoil","Ceol","Leabhair, meáin","Bronntanais & bláthanna","Ceardaíocht & DIY","Linn, spa","Só"],
    "ca": ["Tèxtil","Cosmètica","Neteja","Escola & oficina","Automoció","Mascotes","Jardí","Seguretat laboral","Eines","Llar","Mobles","Electrònica","Electrodomèstics","Esport","Sabates","Bosses","Mare & nadó","Joguines","Hobys","Agricultura","Construcció","Electricitat & il·luminació","Aigua, calefacció","Cuina","Aliments & begudes","Pinso","Salut","Oficina","Embalatge","Equip industrial","Seguretat","Viatge","Càmping","Temporada","Decoració","Electrònica personal","Foto & vídeo","Ordinador","Vehicles","Energia & solar","Ofertes","Tèxtil de la llar","Joieria & rellotges","Cura personal","Farmàcia","Begudes","Infants & escola","Música","Llibres, mitjans","Regals & flors","Manualitats & DIY","Piscina, spa","Luxe"],
    "eu": ["Ehungintza","Kosmetika","Garbiketa","Eskola & bulegoa","Automozioa","Maskotak","Lorategia","Laneko segurtasuna","Tresnak","Etxea","Altzariak","Elektronika","Etxetresnak","Kirola","Oinetakoak","Poltsak","Ama & haurra","Jostailuak","Hobby","Nekazaritza","Eraikuntza","Elektrizitatea","Ura, berogailua","Sukaldea","Elikagaiak","Maskoten janaria","Osasuna","Bulegoa","Enbalajea","Industria","Segurtasuna","Bidaia","Kanpinak","Sasoia","Dekorazioa","Elektronika pertsonala","Argazkia","Ordenagailua","Ibilgailuak","Energia","Eskaintzak","Etxeko ehunak","Bitxiak","Zainketa pertsonala","Farmazia","Edariak","Haur & eskola","Musika","Liburuak","Opariak","Eskulangintza","Igerilekua, spa","Luxua"],
    "gl": ["Téxtil","Cosmética","Limpeza","Escola & oficina","Automoción","Mascotas","Xardín","Seguridade laboral","Ferramentas","Fogar","Mobles","Electrónica","Electrodomésticos","Deporte","Zapatos","Bolsos","Nai & bebé","Xoguetes","Aficións","Agricultura","Construción","Electricidade","Auga, calefacción","Cociña","Alimentos","Comida para mascotas","Saúde","Oficina","Embalaxe","Equipo industrial","Seguridade","Viaxe","Cámping","Tempada","Decoración","Electrónica persoal","Foto","Computador","Vehículos","Enerxía","Ofertas","Téxtil do fogar","Xoiería","Coidado persoal","Farmacia","Bebidas","Nenos & escola","Música","Libros","Agasallos","Manualidades","Piscina, spa","Lujo"],
}

def build_mains() -> dict:
    out = {cid: {"en": name, "de": DE_MAINS[cid], "tr": TR_MAINS[cid], "ar": AR_MAINS[cid]} for cid, name in EN_MAINS.items()}
    for loc, labels in {**EU, **MORE}.items():
        if loc == "it2":
            continue
        mapped = zip_locale(labels)
        for cid, label in mapped.items():
            out[cid][loc] = label
    for cid in EN_MAINS:
        for loc in LOCALES:
            out[cid].setdefault(loc, EN_MAINS[cid])
    return out


# Phrase-level translations for the 141 UI gap keys.
PHRASES = {
    "fr": {
        "header.tagline": "QUALITÉ. PERFORMANCE. CONFIANCE.",
        "header.homeAria": "Accueil Buzzard",
        "nav.aria": "Navigation principale",
        "nav.home": "ACCUEIL",
        "nav.offers": "OFFRES",
        "nav.new": "NOUVEAUTÉS",
        "nav.brands": "MARQUES",
        "nav.helpContact": "AIDE & CONTACT",
        "megaMenu.pickMain": "Choisissez une catégorie principale pour voir les sous-catégories.",
        "home.selectedCategory": "Catégorie sélectionnée",
        "home.viewCategory": "Voir toute la catégorie →",
        "home.discoverCategory": "Découvrir {name} →",
        "home.catalogDiscover": "Découvrez {name} dans le catalogue Buzzard.",
        "home.topOffers": "Meilleures offres",
        "home.recommendations": "Recommandations",
        "home.showAll": "Tout afficher →",
        "home.subcategories": "Sous-catégories",
        "home.allCategoriesCount": "Toutes les catégories ({count})",
        "home.close": "Fermer",
        "home.collapse": "réduire",
        "home.expand": "déplier",
        "home.mainCategories": "Catégories principales",
        "home.offerProfessional": "Solutions professionnelles",
        "home.offerVehicle": "Technique automobile",
        "home.offerSafety": "Équipement de travail & sécurité",
        "home.offerFallback": "Espace catalogue",
        "home.offerCta": "Découvrir",
        "home.servicesTitle": "Services Buzzard",
        "home.serviceAdvice": "Conseil d'experts",
        "home.serviceAdviceText": "Questions techniques sur les catégories, la compatibilité et le choix.",
        "home.serviceCatalog": "Catalogue & recherche",
        "home.serviceCatalogText": "Recherchez pièces, catégories et références au même endroit.",
        "home.serviceDelivery": "Livraison & service",
        "home.serviceDeliveryText": "Informations claires sur l'expédition et les retours.",
        "home.serviceSecure": "Processus sécurisés",
        "home.serviceSecureText": "Compte, panier et demandes avec des règles de protection claires.",
        "home.uspAria": "Avantages service",
        "home.uspShipping": "Expédition rapide",
        "home.uspReturns": "Retours 30 jours",
        "home.uspPayment": "Paiement sécurisé",
        "home.uspQuality": "Haute qualité",
        "home.uspSupport": "Service client",
        "home.mobileNav": "Navigation mobile rapide",
        "home.mobileHome": "Accueil",
        "home.mobileCategories": "Catégories",
        "home.mobileSearch": "Recherche",
        "home.mobileAccount": "Compte",
        "home.mobileCart": "Panier",
        "home.openCategories": "Ouvrir toutes les catégories",
        "home.trustSales": "Pourquoi Buzzard ?",
        "home.trustChoice": "Large choix de catégories",
        "home.trustInfo": "Informations transparentes",
        "home.trustSupport": "Support disponible",
        "home.trustAdvice": "Conseil personnalisé",
        "home.statusTitle": "Statut de la boutique",
        "home.statusText": "Buzzard24 est en mode catalogue. Produits et catégories sont disponibles — les prix suivront au lancement des ventes. D'ici là, envoyez-nous votre demande via Aide & Contact.",
        "home.learnMore": "En savoir plus → Aide & FAQ",
        "headerItems.count": "{count} articles",
        "search.megaPlaceholder": "Rechercher des catégories…",
        "search.megaHint": "Recherchez des catégories sur 3 niveaux",
        "search.megaSearching": "Recherche…",
        "search.megaNoHits": "Aucun résultat",
        "search.megaHits": "{count} résultats",
        "category.notFound": "Catégorie introuvable",
        "category.backHome": "Retour à l'accueil",
        "category.home": "Accueil",
        "category.subcount": "{count} sous-catégories disponibles",
        "category.filterAria": "Filtre de catégorie",
        "category.automotiveTitle": "Catégories automobile",
        "category.allAutomotive": "Toutes les catégories automobile",
        "category.filterAll": "Toutes les catégories",
        "category.jsonLdDescription": "{name} chez Buzzard24 — produits et sous-catégories du catalogue en ligne.",
        "mobile.home": "Accueil",
        "mobile.categories": "Catégories",
        "mobile.categoriesShort": "Cat.",
        "mobile.search": "Recherche",
        "mobile.cart": "Panier",
        "mobile.account": "Compte",
        "mobile.filter": "Filtrer",
        "mobile.sort": "Trier",
        "mobile.grid": "Grille",
        "mobile.list": "Liste",
        "mobile.startShopping": "Commencer les achats",
        "mobile.buyNow": "Acheter",
        "mobile.back": "Retour",
        "mobile.breadcrumb": "Fil d'Ariane",
        "mobile.navAria": "Navigation mobile",
        "mobile.heroAria": "Zone d'accueil",
        "mobile.heroTitle": "Les bonnes pièces pour votre véhicule",
        "mobile.heroText": "Large assortiment, fournisseurs fiables, livraison rapide.",
        "mobile.searchPlaceholder": "Produit, marque, catégorie ou pièce…",
        "mobile.categorySearchPlaceholder": "Rechercher dans la catégorie…",
        "mobile.productCount": "{count} produits",
        "mobile.loadingProducts": "Chargement des produits…",
        "mobile.promoCta": "Découvrir",
        "mobile.sortDefault": "Par défaut",
        "mobile.sortBestseller": "Meilleures ventes",
        "mobile.emptyCategories": "Aucune catégorie trouvée.",
        "mobile.emptyHint": "Essayez une autre recherche ou revenez d'un niveau.",
        "mobile.trustFast": "Livraison rapide",
        "mobile.trustReturn": "Retours faciles",
        "mobile.trustPay": "Paiement sécurisé",
    },
    "nl": {
        "mobile.home": "Home", "mobile.categories": "Categorieën", "mobile.categoriesShort": "Cat.",
        "mobile.search": "Zoeken", "mobile.cart": "Winkelwagen", "mobile.account": "Account",
        "mobile.filter": "Filteren", "mobile.sort": "Sorteren", "mobile.grid": "Raster", "mobile.list": "Lijst",
        "mobile.startShopping": "Begin met winkelen", "mobile.buyNow": "Nu kopen", "mobile.back": "Terug",
        "mobile.breadcrumb": "Kruimelpad", "mobile.navAria": "Mobiele navigatie", "mobile.heroAria": "Startgedeelte",
        "mobile.heroTitle": "De juiste onderdelen voor uw voertuig",
        "mobile.heroText": "Breed assortiment, betrouwbare leveranciers, snelle levering.",
        "mobile.searchPlaceholder": "Product, merk, categorie of onderdeel…",
        "mobile.categorySearchPlaceholder": "Zoeken in de categorie…",
        "mobile.productCount": "{count} producten", "mobile.loadingProducts": "Producten laden…",
        "mobile.promoCta": "Ontdek nu", "mobile.sortDefault": "Standaard", "mobile.sortBestseller": "Bestsellers",
        "mobile.emptyCategories": "Geen categorieën gevonden.",
        "mobile.emptyHint": "Probeer een andere zoekopdracht of ga een niveau terug.",
        "mobile.trustFast": "Snelle levering", "mobile.trustReturn": "Eenvoudig retourneren", "mobile.trustPay": "Veilig betalen",
        "category.home": "Home", "category.notFound": "Categorie niet gevonden", "category.backHome": "Terug naar home",
        "category.subcount": "{count} subcategorieën beschikbaar", "category.filterAll": "Alle categorieën",
        "category.filterAria": "Categoriefilter", "nav.home": "HOME", "home.subcategories": "Subcategorieën",
        "home.mobileHome": "Home", "home.mobileCategories": "Categorieën", "home.mobileSearch": "Zoeken",
        "home.mobileAccount": "Account", "home.mobileCart": "Winkelwagen",
    },
    "pl": {
        "mobile.home": "Start", "mobile.categories": "Kategorie", "mobile.categoriesShort": "Kat.",
        "mobile.search": "Szukaj", "mobile.cart": "Koszyk", "mobile.account": "Konto",
        "mobile.filter": "Filtruj", "mobile.sort": "Sortuj", "mobile.grid": "Siatka", "mobile.list": "Lista",
        "mobile.startShopping": "Zacznij zakupy", "mobile.buyNow": "Kup teraz", "mobile.back": "Wstecz",
        "mobile.breadcrumb": "Ścieżka nawigacji", "mobile.navAria": "Nawigacja mobilna",
        "mobile.heroTitle": "Właściwe części do Twojego pojazdu",
        "mobile.heroText": "Szeroki asortyment, niezawodni dostawcy, szybka dostawa.",
        "mobile.searchPlaceholder": "Produkt, marka, kategoria lub część…",
        "mobile.categorySearchPlaceholder": "Szukaj w kategorii…",
        "mobile.productCount": "{count} produktów", "mobile.loadingProducts": "Ładowanie produktów…",
        "mobile.promoCta": "Odkryj", "mobile.sortDefault": "Domyślne", "mobile.sortBestseller": "Bestsellery",
        "mobile.emptyCategories": "Nie znaleziono kategorii.",
        "mobile.emptyHint": "Spróbuj innego wyszukiwania lub wróć poziom wyżej.",
        "mobile.trustFast": "Szybka dostawa", "mobile.trustReturn": "Łatwy zwrot", "mobile.trustPay": "Bezpieczna płatność",
        "category.home": "Start", "category.notFound": "Nie znaleziono kategorii", "category.filterAll": "Wszystkie kategorie",
        "home.subcategories": "Podkategorie",
    },
    "it": {
        "mobile.home": "Home", "mobile.categories": "Categorie", "mobile.search": "Cerca",
        "mobile.cart": "Carrello", "mobile.account": "Account", "mobile.filter": "Filtra", "mobile.sort": "Ordina",
        "mobile.productCount": "{count} prodotti", "mobile.back": "Indietro", "category.home": "Home",
        "home.subcategories": "Sottocategorie", "mobile.emptyCategories": "Nessuna categoria trovata.",
        "mobile.startShopping": "Inizia lo shopping", "mobile.trustFast": "Consegna veloce",
    },
    "es": {
        "mobile.home": "Inicio", "mobile.categories": "Categorías", "mobile.search": "Buscar",
        "mobile.cart": "Cesta", "mobile.account": "Cuenta", "mobile.filter": "Filtrar", "mobile.sort": "Ordenar",
        "mobile.productCount": "{count} productos", "mobile.back": "Atrás", "category.home": "Inicio",
        "home.subcategories": "Subcategorías", "mobile.emptyCategories": "No se encontraron categorías.",
        "mobile.startShopping": "Empezar a comprar",
    },
}


def fill_gaps() -> dict:
    out = {}
    extras = [l for l in LOCALES if l not in ("de", "en", "tr", "ar")]
    for loc in extras:
        row = dict(EN_GAPS)
        row.update(PHRASES.get("fr" if loc in ("ca", "eu", "gl") and loc != "fr" else loc, {}))
        if loc in ("ca", "eu", "gl"):
            row.update(PHRASES.get("es", {}))
            row.update(PHRASES.get(loc, {}))
        if loc in PHRASES:
            row.update(PHRASES[loc])
        # remaining keys stay English — still not German/Turkish
        out[loc] = row
    # native overlays for ca/eu/gl already handled
    if "fr" in PHRASES:
        out["fr"] = {**EN_GAPS, **PHRASES["fr"]}
        # fill leftover shipping/consent/service from English (already in EN_GAPS merge)
        for k, v in EN_GAPS.items():
            out["fr"].setdefault(k, v)
        out["fr"].update(PHRASES["fr"])
    return out


def main() -> None:
    mains = build_mains()
    (ROOT / "data/i18n/category-mains.json").write_text(json.dumps(mains, ensure_ascii=False, indent=2) + "\n")
    fills = fill_gaps()
    (ROOT / "data/i18n/ui-gap-fills.json").write_text(json.dumps(fills, ensure_ascii=False, indent=2) + "\n")
    missing_locale = [loc for loc in LOCALES if loc not in next(iter(mains.values()))]
    print("mains", len(mains), "locales/sample", len(next(iter(mains.values()))), "gap locales", len(fills))
    print("missing locale on mains", missing_locale)


if __name__ == "__main__":
    main()
