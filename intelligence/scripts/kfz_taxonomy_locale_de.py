"""Deutsche UI-Hilfen für KFZ-Taxonomie-Konsolen."""

from __future__ import annotations

from sync_kfz_category_tree import NAME_DE

KFZ_HTML_UI_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ('lang="tr"', 'lang="de"'),
    ("Buzzard Master Kfz Category Intelligence V1", "Buzzard Master Kfz-Kategoriebaum V1"),
    ("MASTER KFZ CATEGORY INTELLIGENCE", "MASTER KFZ KATEGORIE-INTELLIGENCE"),
    ("Canonical Category Tree • V1 • 43 Hauptkategorien", "Kanonischer Kategoriebaum • V1 • 43 Hauptkategorien"),
    ('placeholder="Kategori, alt kategori veya kelime ara..."', 'placeholder="Kategorie, Unterkategorie oder Stichwort suchen…"'),
    ("Tümünü Aç", "Alle öffnen"),
    ("Tümünü Kapat", "Alle schließen"),
    ("JSON Dışa Aktar", "JSON exportieren"),
    ("<small>Ana kategori</small>", "<small>Hauptkategorien</small>"),
    ("<small>Alt kategori</small>", "<small>Unterkategorien</small>"),
    ("<small>Alt-alt / ürün grubu için hazır</small>", "<small>Alt-Unterkategorien / Produktgruppen vorbereitet</small>"),
    ("<small>Uyumluluk katmanı: araç, OEM, TecDoc</small>", "<small>Kompatibilität: Fahrzeug, OEM, TecDoc</small>"),
    (
        "<strong>Mimari kural:</strong> Araç marka/model/yıl, HSN/TSN, OEM numarası, TecDoc ID, üretici parça no, viskozite, ölçü ve benzeri değerler kategori değil; ayrı Product Attribute / Compatibility katmanında tutulmalıdır.",
        "<strong>Architekturregel:</strong> Fahrzeug Marke/Modell/Baujahr, HSN/TSN, OEM-Nummer, TecDoc-ID, Herstellerteilenummer, Viskosität, Maße und ähnliche Werte sind keine Kategorien — sie gehören in die Product-Attribute-/Kompatibilitätsschicht.",
    ),
    ("alt kategori", "Unterkategorien"),
    ("Aramanızla eşleşen kategori bulunamadı.", "Keine passende Kategorie gefunden."),
    ("toLocaleLowerCase('tr-TR')", "toLocaleLowerCase('de-DE')"),
    ("Kategori Ağacı", "Kategoriebaum"),
    ("Rakipler", "Wettbewerber"),
    ("Gap Analizi", "Gap-Analyse"),
    ("Dashboard", "Dashboard"),
    (
        "<b style=\"color:var(--gold)\">Kategori ile ürün özelliklerini ayır.</b> Araç marka/model/yıl, HSN/TSN, TecDoc ID, OEM numarası, EAN/GTIN, üretici marka, motor, ölçü, viskozite ve homologasyon gibi alanlar kategori değil; Product Attribute + Compatibility katmanında tutulmalıdır. Bu sayede kategori ağacı gereksiz yere milyonlarca dala bölünmez.",
        "<b style=\"color:var(--gold)\">Kategorien von Produkteigenschaften trennen.</b> Fahrzeug Marke/Modell/Baujahr, HSN/TSN, TecDoc-ID, OEM-Nummer, EAN/GTIN, Herstellermarke, Motor, Maße, Viskosität und Homologation sind keine Kategorien — sie gehören in die Product-Attribute-/Kompatibilitätsschicht.",
    ),
    ("<h1>Canonical Kategori Ağacı</h1>", "<h1>Kanonischer Kategoriebaum</h1>"),
    (
        "<p>Ana → alt → alt-alt. Arama bütün üç seviyede çalışır. Alt-alt örnekleri başlangıç veri setidir ve daha sonra gerçek katalog taramasıyla genişletilebilir.</p>",
        "<p>Haupt → Unter → Unter-Unter. Die Suche funktioniert auf allen drei Ebenen. Unter-Unter-Beispiele sind Startdaten und können später per Katalog-Scan erweitert werden.</p>",
    ),
    ('placeholder="Kategori / alt kategori / alt-alt ara..."', 'placeholder="Kategorie / Unterkategorie / Unter-Unter suchen…"'),
    ('placeholder="Kategori ara..."', 'placeholder="Kategorie suchen…"'),
    ("<option value=\"gaps\">Buzzard fırsatı</option>", "<option value=\"gaps\">Buzzard-Chance</option>"),
    ("<option value=\"common\">Çoğu rakipte var</option>", "<option value=\"common\">Bei den meisten Wettbewerbern</option>"),
    ("<option value=\"all\">Tümü</option>", "<option value=\"all\">Alle</option>"),
    ("<th>Kategori</th>", "<th>Kategorie</th>"),
    ("<th>Kapsama</th>", "<th>Abdeckung</th>"),
    ("<th>Rakip kapsaması</th>", "<th>Wettbewerber-Abdeckung</th>"),
    ("<th>Rakipte yok</th>", "<th>Nicht beim Wettbewerber</th>"),
    ("<th>Fırsat skoru</th>", "<th>Chancen-Score</th>"),
    ("<th>Öneri</th>", "<th>Empfehlung</th>"),
    ("<th>Öncelik</th>", "<th>Priorität</th>"),
    ('"Rakip kapsaması:', '"Wettbewerber-Abdeckung:'),
    ("<span>Ana kategori</span>", "<span>Hauptkategorien</span>"),
    ("<span>Alt kategori</span>", "<span>Unterkategorien</span>"),
    ("<span>Alt-alt kategori</span>", "<span>Alt-Unterkategorien</span>"),
    ("<span>Rakip referans</span>", "<span>Wettbewerber-Referenz</span>"),
    ("Tümünü aç", "Alle öffnen"),
    ("Tümünü kapat", "Alle schließen"),
    ("KPI Dashboard", "KPI-Dashboard"),
    ("Wettbewerber-Matrix", "Wettbewerber-Matrix"),
)


def apply_main_names_de(categories: list[dict]) -> None:
    for cat in categories:
        if cat.get("id") in NAME_DE:
            cat["name"] = NAME_DE[cat["id"]]


def germanize_kfz_html(html: str) -> str:
    for old, new in KFZ_HTML_UI_REPLACEMENTS:
        html = html.replace(old, new)
    return html
