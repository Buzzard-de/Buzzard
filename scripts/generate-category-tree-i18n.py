#!/usr/bin/env python3
"""Build L1–L3 category labels for all 30 locales from shop IDs + German slugs.

Does not rewrite buzzard_categories.json (IDs, slugs, order stay).
Turkish leftover display names are not used as English/Arabic source.
Unmapped tokens fall back to English and are recorded.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "data/buzzard_categories.json").read_text())
MAINS = json.loads((ROOT / "data/i18n/category-mains.json").read_text())
LOCALES = json.loads((ROOT / "lib/i18n/supported-locales.json").read_text())

TR_RE = re.compile(r"[İıŞşĞğÜüÖöÇç]|Giyim|Elbise|Bluz|Gömlek|Pantolon|Kazak|Hırka|Etek|Şort|Ceket|Kaban|Tişört|Aksesuar|iclik|termal|elbisesi")

# High-confidence lexical map: slug/word → locale. Missing locale uses English.
TOKENS: dict[str, dict[str, str]] = {
    "elbisesi": {"de": "Kleid", "en": "Dress", "tr": "Elbise", "ar": "فستان", "fr": "Robe", "nl": "Jurk", "it": "Vestito", "es": "Vestido", "pl": "Sukienka"},
    "kleid": {"de": "Kleid", "en": "Dress", "tr": "Elbise", "ar": "فستان", "fr": "Robe", "nl": "Jurk", "it": "Vestito", "es": "Vestido", "pl": "Sukienka", "pt": "Vestido", "cs": "Šaty", "hu": "Ruha", "ro": "Rochie", "bg": "Рокля", "hr": "Haljina", "el": "Φόρεμα", "da": "Kjole", "sv": "Klänning", "fi": "Mekko", "sk": "Šaty", "sl": "Obleka"},
    "spreyi": {"de": "Spray", "en": "Spray", "tr": "Sprey", "ar": "بخاخ", "fr": "Spray"},
    "vucut": {"de": "Körper", "en": "Body", "tr": "Vücut", "ar": "جسم", "fr": "Corps"},
    "sensoru": {"de": "Sensor", "en": "Sensor", "tr": "Sensör", "ar": "حساس", "fr": "Capteur"},
    "sensor": {"de": "Sensor", "en": "Sensor", "tr": "Sensör", "ar": "حساس", "fr": "Capteur"},
    "alternator": {"de": "Lichtmaschine", "en": "Alternator", "tr": "Alternatör", "ar": "دينامو", "fr": "Alternateur"},
    "role": {"de": "Relais", "en": "Relay", "tr": "Röle", "ar": "مرحل", "fr": "Relais"},
    "jant": {"de": "Felge", "en": "Rim", "tr": "Jant", "ar": "جنط", "fr": "Jante"},
    "kurek": {"de": "Schaufel", "en": "Shovel", "tr": "Kürek", "ar": "مجرفة", "fr": "Pelle"},
    "aksesuarlar": {"de": "Zubehör", "en": "Accessories", "tr": "Aksesuarlar", "ar": "إكسسوارات", "fr": "Accessoires"},
    "ekipmanlar": {"de": "Ausrüstung", "en": "Equipment", "tr": "Ekipman", "ar": "معدات", "fr": "Équipement"},
    "atolye": {"de": "Werkstatt", "en": "Workshop", "tr": "Atölye", "ar": "ورشة", "fr": "Atelier"},
    "sarj": {"de": "Ladegerät", "en": "Charger", "tr": "Şarj", "ar": "شاحن", "fr": "Chargeur"},
    "adaptoru": {"de": "Adapter", "en": "Adapter", "tr": "Adaptör", "ar": "محول", "fr": "Adaptateur"},
    "cuzdan": {"de": "Geldbörse", "en": "Wallet", "tr": "Cüzdan", "ar": "محفظة", "fr": "Portefeuille"},
    "kosu": {"de": "Lauf", "en": "Running", "tr": "Koşu", "ar": "جري", "fr": "Course"},
    "tisortu": {"de": "T-Shirt", "en": "T-shirt", "tr": "Tişört", "ar": "تيشيرت", "fr": "T-shirt"},
    "pantolonu": {"de": "Hose", "en": "Trousers", "tr": "Pantolon", "ar": "بنطال", "fr": "Pantalon"},
    "mevsim": {"de": "Saison", "en": "Season", "tr": "Mevsim", "ar": "موسم", "fr": "Saison"},
    "dort": {"de": "Allwetter", "en": "All-season", "tr": "Dört mevsim", "ar": "لجميع الفصول", "fr": "Toutes saisons"},
    "guvenligi": {"de": "Sicherheit", "en": "Safety", "tr": "Güvenlik", "ar": "سلامة", "fr": "Sécurité"},
    "baslang": {"de": "Starter", "en": "Starter", "tr": "Başlangıç", "ar": "بداية", "fr": "Démarrage"},
    "hygiene": {"de": "Hygiene", "en": "Hygiene", "tr": "Hijyen", "ar": "نظافة", "fr": "Hygiène"},
    "persoenliche": {"de": "Persönliche", "en": "Personal", "tr": "Kişisel", "ar": "شخصية", "fr": "Personnel"},
    "personliche": {"de": "Persönliche", "en": "Personal", "tr": "Kişisel", "ar": "شخصية", "fr": "Personnel"},
    "haar": {"de": "Haar", "en": "Hair", "tr": "Saç", "ar": "شعر", "fr": "Cheveux"},
    "oel": {"de": "Öl", "en": "Oil", "tr": "Yağ", "ar": "زيت", "fr": "Huile"},
    "ol": {"de": "Öl", "en": "Oil", "tr": "Yağ", "ar": "زيت", "fr": "Huile"},
    "bluse": {"de": "Bluse", "en": "Blouse", "tr": "Bluz", "ar": "بلوزة", "fr": "Chemisier", "nl": "Blouse", "it": "Camicetta", "es": "Blusa", "pl": "Bluzka", "pt": "Blusa"},
    "hemd": {"de": "Hemd", "en": "Shirt", "tr": "Gömlek", "ar": "قميص", "fr": "Chemise", "nl": "Overhemd", "it": "Camicia", "es": "Camisa", "pl": "Koszula", "pt": "Camisa"},
    "t-shirt": {"de": "T-Shirt", "en": "T-shirt", "tr": "Tişört", "ar": "تيشيرت", "fr": "T-shirt", "nl": "T-shirt", "it": "T-shirt", "es": "Camiseta", "pl": "T-shirt", "pt": "T-shirt"},
    "tshirt": {"de": "T-Shirt", "en": "T-shirt", "tr": "Tişört", "ar": "تيشيرت", "fr": "T-shirt"},
    "pullover": {"de": "Pullover", "en": "Sweater", "tr": "Kazak", "ar": "كنزة", "fr": "Pull", "nl": "Trui", "it": "Maglione", "es": "Jersey", "pl": "Sweter", "pt": "Suéter"},
    "strick": {"de": "Strick", "en": "Knitwear", "tr": "Triko", "ar": "تريكو", "fr": "Maille", "nl": "Breisel", "it": "Maglia", "es": "Punto", "pl": "Dzianina"},
    "strickjacke": {"de": "Strickjacke", "en": "Cardigan", "tr": "Hırka", "ar": "كارديغان", "fr": "Gilet", "nl": "Vest", "it": "Cardigan", "es": "Cárdigan", "pl": "Kardigan"},
    "hose": {"de": "Hose", "en": "Trousers", "tr": "Pantolon", "ar": "بنطال", "fr": "Pantalon", "nl": "Broek", "it": "Pantaloni", "es": "Pantalón", "pl": "Spodnie", "pt": "Calças"},
    "jean": {"de": "Jeans", "en": "Jeans", "tr": "Jean", "ar": "جينز", "fr": "Jean", "nl": "Jeans", "it": "Jeans", "es": "Vaqueros", "pl": "Jeansy"},
    "jeans": {"de": "Jeans", "en": "Jeans", "tr": "Jean", "ar": "جينز"},
    "rock": {"de": "Rock", "en": "Skirt", "tr": "Etek", "ar": "تنورة", "fr": "Jupe", "nl": "Rok", "it": "Gonna", "es": "Falda", "pl": "Spódnica", "pt": "Saia"},
    "shorts": {"de": "Shorts", "en": "Shorts", "tr": "Şort", "ar": "شورت", "fr": "Short", "nl": "Short", "it": "Shorts", "es": "Shorts", "pl": "Szorty"},
    "jacke": {"de": "Jacke", "en": "Jacket", "tr": "Ceket", "ar": "سترة", "fr": "Veste", "nl": "Jas", "it": "Giacca", "es": "Chaqueta", "pl": "Kurtka", "pt": "Casaco"},
    "mantel": {"de": "Mantel", "en": "Coat", "tr": "Mont", "ar": "معطف", "fr": "Manteau", "nl": "Mantel", "it": "Cappotto", "es": "Abrigo", "pl": "Płaszcz"},
    "kaban": {"de": "Mantel", "en": "Coat", "tr": "Kaban", "ar": "معطف"},
    "polo": {"de": "Polo", "en": "Polo", "tr": "Polo", "ar": "بولو", "fr": "Polo"},
    "sweatshirt": {"de": "Sweatshirt", "en": "Sweatshirt", "tr": "Sweatshirt", "ar": "سويت شيرت"},
    "damenbekleidung": {"de": "Damenbekleidung", "en": "Women's clothing", "tr": "Kadın giyim", "ar": "ملابس نسائية", "fr": "Vêtements femme", "nl": "Dameskleding", "it": "Abbigliamento donna", "es": "Ropa de mujer", "pl": "Odzież damska", "pt": "Roupa feminina", "cs": "Dámské oblečení", "hu": "Női ruházat", "ro": "Îmbrăcăminte damă", "bg": "Дамско облекло", "hr": "Ženska odjeća", "el": "Γυναικεία ρούχα", "da": "Damebeklædning", "sv": "Damkläder", "fi": "Naisten vaatteet", "sk": "Dámske oblečenie", "sl": "Ženska oblačila"},
    "herrenbekleidung": {"de": "Herrenbekleidung", "en": "Men's clothing", "tr": "Erkek giyim", "ar": "ملابس رجالية", "fr": "Vêtements homme", "nl": "Herenkleding", "it": "Abbigliamento uomo", "es": "Ropa de hombre", "pl": "Odzież męska", "pt": "Roupa masculina"},
    "kinderbekleidung": {"de": "Kinderbekleidung", "en": "Children's clothing", "tr": "Çocuk giyim", "ar": "ملابس أطفال", "fr": "Vêtements enfant", "nl": "Kinderkleding", "it": "Abbigliamento bambino", "es": "Ropa infantil", "pl": "Odzież dziecięca"},
    "babybekleidung": {"de": "Babybekleidung", "en": "Baby clothing", "tr": "Bebek giyim", "ar": "ملابس الرضع", "fr": "Vêtements bébé", "nl": "Babykleding", "it": "Abbigliamento neonato", "es": "Ropa de bebé", "pl": "Odzież niemowlęca"},
    "unterwaesche": {"de": "Unterwäsche", "en": "Underwear", "tr": "İç giyim", "ar": "ملابس داخلية", "fr": "Sous-vêtements", "nl": "Ondergoed", "it": "Intimo", "es": "Ropa interior", "pl": "Bielizna"},
    "thermo": {"de": "Thermo", "en": "Thermal", "tr": "Termal", "ar": "حراري", "fr": "Thermique", "nl": "Thermo", "it": "Termico", "es": "Térmico", "pl": "Termo"},
    "termal": {"de": "Thermo", "en": "Thermal", "tr": "Termal", "ar": "حراري", "fr": "Thermique"},
    "iclik": {"de": "Unterwäsche", "en": "Underwear", "tr": "İçlik", "ar": "ملابس داخلية", "fr": "Sous-vêtements"},
    "bekleidung": {"de": "Bekleidung", "en": "Clothing", "tr": "Giyim", "ar": "ملابس", "fr": "Vêtements", "nl": "Kleding", "it": "Abbigliamento", "es": "Ropa", "pl": "Odzież"},
    "schuhe": {"de": "Schuhe", "en": "Shoes", "tr": "Ayakkabı", "ar": "أحذية", "fr": "Chaussures", "nl": "Schoenen", "it": "Scarpe", "es": "Zapatos", "pl": "Buty", "pt": "Sapatos"},
    "damen": {"de": "Damen", "en": "Women", "tr": "Kadın", "ar": "نساء", "fr": "Femme", "nl": "Dames", "it": "Donna", "es": "Mujer", "pl": "Damskie"},
    "herren": {"de": "Herren", "en": "Men", "tr": "Erkek", "ar": "رجال", "fr": "Homme", "nl": "Heren", "it": "Uomo", "es": "Hombre", "pl": "Męskie"},
    "kinder": {"de": "Kinder", "en": "Kids", "tr": "Çocuk", "ar": "أطفال", "fr": "Enfants", "nl": "Kinderen", "it": "Bambini", "es": "Niños", "pl": "Dzieci"},
    "baby": {"de": "Baby", "en": "Baby", "tr": "Bebek", "ar": "رضيع", "fr": "Bébé", "nl": "Baby", "it": "Neonato", "es": "Bebé", "pl": "Niemowlę"},
    "pflege": {"de": "Pflege", "en": "Care", "tr": "Bakım", "ar": "عناية", "fr": "Soins", "nl": "Verzorging", "it": "Cura", "es": "Cuidado", "pl": "Pielęgnacja"},
    "reinigung": {"de": "Reinigung", "en": "Cleaning", "tr": "Temizlik", "ar": "تنظيف", "fr": "Nettoyage", "nl": "Reiniging", "it": "Pulizia", "es": "Limpieza", "pl": "Czyszczenie"},
    "motoroele": {"de": "Motoröle", "en": "Motor oils", "tr": "Motor yağları", "ar": "زيوت المحرك", "fr": "Huiles moteur", "nl": "Motorolie", "it": "Oli motore", "es": "Aceites de motor", "pl": "Oleje silnikowe"},
    "fluessigkeiten": {"de": "Flüssigkeiten", "en": "Fluids", "tr": "Sıvılar", "ar": "سوائل", "fr": "Liquides", "nl": "Vloeistoffen", "it": "Liquidi", "es": "Líquidos", "pl": "Płyny"},
    "motorol": {"de": "Motoröl", "en": "Engine oil", "tr": "Motor yağı", "ar": "زيت المحرك", "fr": "Huile moteur"},
    "motor": {"de": "Motor", "en": "Engine", "tr": "Motor", "ar": "محرك", "fr": "Moteur", "nl": "Motor", "it": "Motore", "es": "Motor", "pl": "Silnik"},
    "yag": {"de": "Öl", "en": "Oil", "tr": "Yağ", "ar": "زيت", "fr": "Huile"},
    "antifriz": {"de": "Frostschutz", "en": "Antifreeze", "tr": "Antifriz", "ar": "مانع التجمد", "fr": "Antigel"},
    "hidroligi": {"de": "Hydraulik", "en": "Hydraulic", "tr": "Hidrolik", "ar": "هيدروليك", "fr": "Hydraulique"},
    "sanz": {"de": "Getriebe", "en": "Gearbox", "tr": "Şanzıman", "ar": "علبة التروس", "fr": "Boîte de vitesses"},
    "man": {"de": "Handschaltung", "en": "Manual", "tr": "Manuel", "ar": "يدوي", "fr": "Manuelle"},
    "filter": {"de": "Filter", "en": "Filters", "tr": "Filtreler", "ar": "فلاتر", "fr": "Filtres", "nl": "Filters", "it": "Filtri", "es": "Filtros", "pl": "Filtry"},
    "bremse": {"de": "Bremse", "en": "Brake", "tr": "Fren", "ar": "فرامل", "fr": "Frein", "nl": "Rem", "it": "Freno", "es": "Freno", "pl": "Hamulec"},
    "bremssystem": {"de": "Bremssystem", "en": "Brake system", "tr": "Fren sistemi", "ar": "نظام الفرامل", "fr": "Système de freinage"},
    "batterie": {"de": "Batterie", "en": "Battery", "tr": "Akü", "ar": "بطارية", "fr": "Batterie", "nl": "Accu", "it": "Batteria", "es": "Batería", "pl": "Akumulator"},
    "elektrik": {"de": "Elektrik", "en": "Electrics", "tr": "Elektrik", "ar": "كهرباء", "fr": "Électricité"},
    "zubehoer": {"de": "Zubehör", "en": "Accessories", "tr": "Aksesuar", "ar": "إكسسوارات", "fr": "Accessoires", "nl": "Accessoires", "it": "Accessori", "es": "Accesorios", "pl": "Akcesoria", "pt": "Acessórios"},
    "accessoires": {"de": "Accessoires", "en": "Accessories", "tr": "Aksesuar", "ar": "إكسسوارات"},
    "sets": {"de": "Sets", "en": "Sets", "tr": "Setler", "ar": "أطقم", "fr": "Ensembles", "nl": "Sets", "it": "Set", "es": "Sets", "pl": "Zestawy"},
    "set": {"de": "Set", "en": "Set", "tr": "Set", "ar": "طقم", "fr": "Set"},
    "standard": {"de": "Standard", "en": "Standard", "tr": "Standart", "ar": "قياسي", "fr": "Standard"},
    "premium": {"de": "Premium", "en": "Premium", "tr": "Premium", "ar": "فاخر", "fr": "Premium"},
    "sparpakete": {"de": "Sparpakete", "en": "Value packs", "tr": "Ekonomik paketler", "ar": "باقات اقتصادية", "fr": "Lots économiques"},
    "garten": {"de": "Garten", "en": "Garden", "tr": "Bahçe", "ar": "حديقة", "fr": "Jardin", "nl": "Tuin", "it": "Giardino", "es": "Jardín", "pl": "Ogród"},
    "camping": {"de": "Camping", "en": "Camping", "tr": "Kamp", "ar": "تخييم", "fr": "Camping", "nl": "Camping", "it": "Campeggio", "es": "Camping", "pl": "Camping"},
    "werkzeuge": {"de": "Werkzeuge", "en": "Tools", "tr": "Aletler", "ar": "أدوات", "fr": "Outils", "nl": "Gereedschap", "it": "Utensili", "es": "Herramientas", "pl": "Narzędzia"},
    "werkzeug": {"de": "Werkzeug", "en": "Tool", "tr": "Alet", "ar": "أداة", "fr": "Outil"},
    "moebel": {"de": "Möbel", "en": "Furniture", "tr": "Mobilya", "ar": "أثاث", "fr": "Meubles", "nl": "Meubels", "it": "Mobili", "es": "Muebles", "pl": "Meble"},
    "kueche": {"de": "Küche", "en": "Kitchen", "tr": "Mutfak", "ar": "مطبخ", "fr": "Cuisine", "nl": "Keuken", "it": "Cucina", "es": "Cocina", "pl": "Kuchnia"},
    "haus": {"de": "Haus", "en": "Home", "tr": "Ev", "ar": "منزل", "fr": "Maison", "nl": "Huis", "it": "Casa", "es": "Casa", "pl": "Dom"},
    "sicherheit": {"de": "Sicherheit", "en": "Safety", "tr": "Güvenlik", "ar": "سلامة", "fr": "Sécurité", "nl": "Veiligheid", "it": "Sicurezza", "es": "Seguridad", "pl": "Bezpieczeństwo"},
    "beleuchtung": {"de": "Beleuchtung", "en": "Lighting", "tr": "Aydınlatma", "ar": "إضاءة", "fr": "Éclairage", "nl": "Verlichting", "it": "Illuminazione", "es": "Iluminación", "pl": "Oświetlenie"},
    "wasser": {"de": "Wasser", "en": "Water", "tr": "Su", "ar": "ماء", "fr": "Eau", "nl": "Water", "it": "Acqua", "es": "Agua", "pl": "Woda"},
    "heizung": {"de": "Heizung", "en": "Heating", "tr": "Isıtma", "ar": "تدفئة", "fr": "Chauffage", "nl": "Verwarming", "it": "Riscaldamento", "es": "Calefacción", "pl": "Ogrzewanie"},
    "solar": {"de": "Solar", "en": "Solar", "tr": "Solar", "ar": "شمسي", "fr": "Solaire"},
    "kamera": {"de": "Kamera", "en": "Camera", "tr": "Kamera", "ar": "كاميرا", "fr": "Caméra", "nl": "Camera", "it": "Fotocamera", "es": "Cámara", "pl": "Kamera"},
    "spielzeug": {"de": "Spielzeug", "en": "Toys", "tr": "Oyuncak", "ar": "ألعاب", "fr": "Jouets", "nl": "Speelgoed", "it": "Giocattoli", "es": "Juguetes", "pl": "Zabawki"},
    "fahrrad": {"de": "Fahrrad", "en": "Bicycle", "tr": "Bisiklet", "ar": "دراجة", "fr": "Vélo", "nl": "Fiets", "it": "Bicicletta", "es": "Bicicleta", "pl": "Rower"},
    "fahrzeug": {"de": "Fahrzeug", "en": "Vehicle", "tr": "Araç", "ar": "مركبة", "fr": "Véhicule", "nl": "Voertuig", "it": "Veicolo", "es": "Vehículo", "pl": "Pojazd"},
    "ersatzteile": {"de": "Ersatzteile", "en": "Spare parts", "tr": "Yedek parça", "ar": "قطع غيار", "fr": "Pièces détachées", "nl": "Onderdelen", "it": "Ricambi", "es": "Recambios", "pl": "Części zamienne"},
    "innen": {"de": "Innen", "en": "Interior", "tr": "İç", "ar": "داخلي", "fr": "Intérieur", "nl": "Binnen", "it": "Interno", "es": "Interior", "pl": "Wnętrze"},
    "aussen": {"de": "Außen", "en": "Exterior", "tr": "Dış", "ar": "خارجي", "fr": "Extérieur", "nl": "Buiten", "it": "Esterno", "es": "Exterior", "pl": "Zewnątrz"},
    "professionell": {"de": "Professionell", "en": "Professional", "tr": "Profesyonel", "ar": "احترافي", "fr": "Professionnel"},
    "organizer": {"de": "Organizer", "en": "Organizer", "tr": "Organizer", "ar": "منظم"},
    "led": {"de": "LED", "en": "LED", "tr": "LED", "ar": "LED", "fr": "LED"},
    "pro": {"de": "Pro", "en": "Pro", "tr": "Pro", "ar": "احترافي"},
    "hautpflege": {"de": "Hautpflege", "en": "Skincare", "tr": "Cilt bakımı", "ar": "العناية بالبشرة", "fr": "Soin de la peau", "nl": "Huidverzorging", "it": "Cura della pelle", "es": "Cuidado de la piel", "pl": "Pielęgnacja skóry"},
    "haarpflege": {"de": "Haarpflege", "en": "Hair care", "tr": "Saç bakımı", "ar": "العناية بالشعر", "fr": "Soin des cheveux"},
    "makeup": {"de": "Make-up", "en": "Make-up", "tr": "Makyaj", "ar": "مكياج", "fr": "Maquillage"},
    "parfuem": {"de": "Parfüm", "en": "Perfume", "tr": "Parfüm", "ar": "عطر", "fr": "Parfum"},
    "socken": {"de": "Socken", "en": "Socks", "tr": "Çorap", "ar": "جوارب", "fr": "Chaussettes", "nl": "Sokken", "it": "Calze", "es": "Calcetines", "pl": "Skarpetki"},
    "taschen": {"de": "Taschen", "en": "Bags", "tr": "Çanta", "ar": "حقائب", "fr": "Sacs", "nl": "Tassen", "it": "Borse", "es": "Bolsos", "pl": "Torby"},
    "haushaltstextilien": {"de": "Haushaltstextilien", "en": "Home textiles", "tr": "Ev tekstili", "ar": "منسوجات منزلية", "fr": "Textiles de maison"},
    "bettwaesche": {"de": "Bettwäsche", "en": "Bedding", "tr": "Nevresim", "ar": "مفروشات السرير", "fr": "Linge de lit"},
    "trockenfutter": {"de": "Trockenfutter", "en": "Dry food", "tr": "Kuru mama", "ar": "طعام جاف", "fr": "Croquettes"},
    "nassfutter": {"de": "Nassfutter", "en": "Wet food", "tr": "Yaş mama", "ar": "طعام رطب", "fr": "Pâtée"},
    "und": {"de": "&", "en": "&", "tr": "&", "ar": "و", "fr": "&", "nl": "&", "it": "&", "es": "&", "pl": "i"},
}

# German L2 display phrases that are already native
PHRASE_EN = {
    "Damenbekleidung": "Women's clothing",
    "Herrenbekleidung": "Men's clothing",
    "Kinderbekleidung": "Children's clothing",
    "Babybekleidung": "Baby clothing",
    "Unterwäsche": "Underwear",
    "Haushaltstextilien": "Home textiles",
    "Hautpflege": "Skincare",
    "Haarpflege": "Hair care",
    "Make-up": "Make-up",
    "Parfüm": "Perfume",
    "Mund- & Zahnpflege": "Oral care",
    "Körperpflege": "Body care",
    "Rasur & Herrenpflege": "Shaving & men's care",
    "Persönliche Hygiene": "Personal hygiene",
    "Arbeits- & Outdoor-Textilien": "Work & outdoor textiles",
    "Taschen & Accessoires": "Bags & accessories",
    "Fahrzeugpflege & Reinigung": "Vehicle care & cleaning",
    "Batterie & Elektrik": "Battery & electrics",
    "Lastik & Jant" if False else "Reifen & Felgen": "Tires & rims",
}

# Fix accidental key - write properly
PHRASE_EN["Reifen & Felgen"] = "Tires & rims"
PHRASE_EN.pop("Lastik & Jant", None)

SKIP = {"k", "s", "t", "c", "b", "l", "r", "n", "und", "and", "ue", "ae", "oe"}


def walk(nodes, level=1):
    for node in nodes:
        yield level, node
        yield from walk(node.get("children") or [], level + 1)


def looks_turkish(name: str) -> bool:
    return bool(TR_RE.search(name or ""))


def slug_tokens(slug: str) -> list[str]:
    parts = re.split(r"[-_]+", slug.lower())
    return [p for p in parts if p and p not in SKIP]


def token_label(token: str, locale: str) -> tuple[str, bool]:
    row = TOKENS.get(token) or TOKENS.get(token.replace("ue", "u").replace("ae", "a").replace("oe", "o"))
    if row:
        if locale in row:
            return row[locale], True
        if "en" in row:
            return row["en"], locale == "en"
    pretty = token.replace("ue", "ü").replace("oe", "ö").replace("ae", "ä")
    pretty = pretty[:1].upper() + pretty[1:]
    return pretty, False


def compose_from_slug(slug: str, locale: str) -> tuple[str, bool]:
    tokens = slug_tokens(slug)
    if not tokens:
        return slug, False
    labels = []
    confident = True
    for tok in tokens:
        lab, ok = token_label(tok, locale)
        labels.append(lab)
        confident = confident and ok
    joiner = " و " if locale == "ar" else " & "
    return joiner.join(labels), confident


def german_source(node: dict) -> str:
    name = node.get("name") or ""
    slug = node.get("slug") or ""
    if looks_turkish(name) and slug:
        label, _ = compose_from_slug(slug, "de")
        return label
    return name


def translate_phrase(source: str, locale: str) -> tuple[str, bool]:
    if locale == "de":
        return source, True
    if source in PHRASE_EN and locale == "en":
        return PHRASE_EN[source], True
    # word-wise
    bits = re.split(r"(\s+|&|/)", source)
    out = []
    confident = True
    known_any = False
    for bit in bits:
        if re.fullmatch(r"\s+|&|/", bit or ""):
            out.append("و" if locale == "ar" and bit.strip() == "&" else bit)
            continue
        key = bit.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
        lab, ok = token_label(key, locale)
        if ok:
            known_any = True
            out.append(lab)
        else:
            # try exact token as-is
            lab2, ok2 = token_label(bit.lower(), locale)
            if ok2:
                known_any = True
                out.append(lab2)
            else:
                confident = False
                out.append(bit)
    text = "".join(out).strip()
    if locale == "en" and source in PHRASE_EN:
        return PHRASE_EN[source], True
    return text, confident and known_any


def main() -> None:
    tree: dict[str, dict[str, str]] = {}
    flags: list[dict[str, str]] = []

    for _level, node in walk(CATALOG["categories"]):
        cid = node["id"]
        entry: dict[str, str] = {}
        if cid in MAINS:
            for loc in LOCALES:
                val = MAINS[cid].get(loc) or MAINS[cid].get("en")
                entry[loc] = val
                if loc not in MAINS[cid]:
                    flags.append({"id": cid, "locale": loc, "reason": "english-l1-fallback"})
        else:
            de_src = german_source(node)
            slug = node.get("slug") or ""
            turkish_src = looks_turkish(node.get("name") or "") or looks_turkish(slug)
            for loc in LOCALES:
                if loc == "de":
                    entry[loc] = de_src
                    continue
                from_slug, slug_ok = compose_from_slug(slug, loc) if slug else ("", False)
                from_phrase, phrase_ok = translate_phrase(de_src, loc)
                if not turkish_src and phrase_ok:
                    entry[loc] = from_phrase
                elif slug_ok:
                    entry[loc] = from_slug
                elif phrase_ok:
                    entry[loc] = from_phrase
                else:
                    en_label, en_ok = compose_from_slug(slug, "en") if slug else ("", False)
                    if not en_ok:
                        en_label, en_ok = translate_phrase(de_src, "en")
                    entry[loc] = en_label or de_src
                    flags.append({"id": cid, "locale": loc, "reason": "english-fallback", "source": de_src})
        tree[cid] = entry

    out = ROOT / "data/i18n/category-tree.json"
    out.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n")
    from collections import Counter
    by_locale = Counter(item["locale"] for item in flags)
    (ROOT / "data/i18n/category-tree-fallbacks.json").write_text(
        json.dumps(
            {
                "count": len(flags),
                "byLocale": dict(sorted(by_locale.items())),
                "examples": flags[:200],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {len(tree)} ids, fallback flags {len(flags)}")


if __name__ == "__main__":
    main()
