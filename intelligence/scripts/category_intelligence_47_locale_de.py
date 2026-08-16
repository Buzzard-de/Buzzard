"""Deutsche UI- und Text-Hilfen für Category Intelligence 47 Konsolen."""

from __future__ import annotations

GERMAN_UI_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ('lang="tr"', 'lang="de"'),
    ("Merkez", "Zentrale"),
    ("Kategoriler", "Kategorien"),
    ("Rakipler", "Wettbewerber"),
    ("Analiz", "Analyse"),
    ("Doğrulama", "Verifizierung"),
    ("Araştırma", "Recherche"),
    ("Göster", "Anzeigen"),
    ("İçe aktar", "Importieren"),
    ("Matrisi göster", "Matrix anzeigen"),
    ("47 Kategori Kurmay Merkezi", "47-Kategorien-Kurmay-Zentrale"),
    (
        "47 kategori × 20 rakip = 940 doğrulama hedefi. Sistem kaynak olmadan piyasa bilgisini VERIFIED kabul etmez.",
        "47 Kategorien × 20 Wettbewerber = 940 Verifizierungsziel. "
        "Das System akzeptiert keine Marktdaten als VERIFIED ohne Quelle.",
    ),
    ("Kategori Kayıtları", "Kategorie-Register"),
    ("Taxonomy Karşılaştırma", "Taxonomie-Vergleich"),
    ("Evidence Doğrulama Paneli", "Evidence-Verifizierungs-Panel"),
    (
        "Aday rakipler yalnızca onaylı kanıt ile VERIFIED olur. candidate + evidence = review; onay = verified.",
        "Kandidaten werden nur mit genehmigtem Nachweis VERIFIED. "
        "Kandidat + Nachweis = Review; Freigabe = VERIFIED.",
    ),
    ("Executive özet", "Executive-Zusammenfassung"),
    ("Araştırma Matrisi", "Recherche-Matrix"),
    (
        "940 aday rakip hedefi — toplu içe aktarma CANDIDATE statüsünde tutar.",
        "940 Kandidaten-Ziel — Massenimport bleibt im Status CANDIDATE.",
    ),
    ('["Kategori",', '["Kategorie",'),
    ('["Rakip",', '["Wettbewerber",'),
    ('["Doğrulanmış rakip",', '["Verifizierte Wettbewerber",'),
    ('["Doğrulanmış düğüm",', '["Verifizierte Knoten",'),
    ('["Buzzard düğümü",', '["Buzzard-Knoten",'),
    ('["Bulgu",', '["Erkenntnisse",'),
    ('["Açık görev",', '["Offene Aufgaben",'),
    ('<th>Kod</th><th>Kategori</th><th>Seviye</th><th>Kaynak</th>', "<th>Code</th><th>Kategorie</th><th>Ebene</th><th>Quelle</th>"),
    ('<th>Zaman</th><th>Actor</th><th>Aksiyon</th><th>Entity</th><th>Detay</th>', "<th>Zeit</th><th>Akteur</th><th>Aktion</th><th>Entität</th><th>Detail</th>"),
    ('<th>#</th><th>Rakip</th><th>Domain</th><th>Tip</th><th>Gelir</th><th>GMV</th><th>Durum</th>', "<th>#</th><th>Wettbewerber</th><th>Domain</th><th>Typ</th><th>Umsatz</th><th>GMV</th><th>Status</th>"),
    ('"Rakip kapsamı:', '"Wettbewerber-Abdeckung:'),
    ("<h3>Ortak kategori yapıları</h3>", "<h3>Gemeinsame Kategoriestrukturen</h3>"),
    ("<h3>Buzzard eksik adayları</h3>", "<h3>Buzzard-Lücken-Kandidaten</h3>"),
    ("<h3>Nadir / benzersiz yapılar</h3>", "<h3>Seltene / einzigartige Strukturen</h3>"),
    ("<h3>Ortak özellikler</h3>", "<h3>Gemeinsame Merkmale</h3>"),
    (' rakip"', ' Wettbewerber"'),
    ('j.detail||"Hata"', 'j.detail||"Fehler"'),
    ('["Aday rakip",', '["Kandidaten",'),
    ('["Doğrulanmış",', '["Verifiziert",'),
    ('["Bekleyen kanıt",', '["Offene Nachweise",'),
    ('["Onaylı kanıt",', '["Freigegebene Nachweise",'),
    ('["Reddedilen",', '["Abgelehnte Nachweise",'),
    ("Turkish master taxonomy 48", "Deutsche Master-Taxonomie 48"),
    ("master_taxonomy_48_tr", "master_taxonomy_48_de"),
    ("Research matrix candidate — requires approved evidence before VERIFIED", "Recherche-Kandidat — erfordert genehmigten Nachweis vor VERIFIED"),
)


def germanize_console_html(html: str) -> str:
    for old, new in GERMAN_UI_REPLACEMENTS:
        html = html.replace(old, new)
    return html
