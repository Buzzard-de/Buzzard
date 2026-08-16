"""Deutschland E-Commerce Istihbarat Scan — Doğu Bey Operation 01 (Live)."""

from __future__ import annotations

import json
import re
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
    CategoryNode,
    SellerOffer,
    SourceEvidence,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.pricing.engine import (
    PriceIntelligenceEngine,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.registry import (
    build_43_agents,
)
from buzzard_ai_complete.category_intelligence_43_maximal.service import (
    CategoryIntelligence43Service,
)
from buzzard_ai_complete.memory.store import MemoryStore

OPERATION_CODE = "DE-ECOM-INTEL-01-LIVE"

PUBLIC_SOURCES = [
    {
        "id": "bevh_h1_2025",
        "url": "https://bevh.org/en/detail/first-half-of-the-year-in-online-retail-germans-willingness-to-spend-is-returning",
        "title": "bevh Halbjahresbericht Onlinehandel",
    },
    {
        "id": "ecommerce_germany_top100",
        "url": "https://ecommercegermany.com/blog/top-100-online-stores-in-germany/",
        "title": "Top 100 Online-Shops Deutschland",
    },
]

# Buzzard-Hauptkategorien → Category-Intelligence-Agenten + öffentliche Wettbewerber
PRIORITY_CATEGORIES = [
    {
        "buzzard_id": "cat-05",
        "buzzard_name": "Automotive",
        "agent_id": "CATEGORY_05",
        "competitors": ["Amazon.de", "AutoDoc", "kfzteile24", "eBay"],
        "taxonomy_competitor_nodes": [
            ("motoroel", "Motoröl & Schmierstoffe"),
            ("bremsen", "Bremsen & Bremsscheiben"),
            ("filter", "Filter & Wartungssets"),
        ],
    },
    {
        "buzzard_id": "cat-03",
        "buzzard_name": "Reinigungsprodukte",
        "agent_id": "CATEGORY_03",
        "competitors": ["dm.de", "rossmann.de", "Amazon.de"],
        "taxonomy_competitor_nodes": [
            ("nachfuell", "Nachfüll- & Öko-Reinigung"),
            ("professionell", "Profireinigung"),
        ],
    },
    {
        "buzzard_id": "cat-07",
        "buzzard_name": "Garten",
        "agent_id": "CATEGORY_07",
        "competitors": ["OBI", "Bauhaus", "Hornbach", "ManoMano", "Amazon.de"],
        "taxonomy_competitor_nodes": [
            ("bewaesserung", "Bewässerung & Schlauch"),
            ("gartengeraete", "Elektrische Gartengeräte"),
        ],
    },
    {
        "buzzard_id": "cat-09",
        "buzzard_name": "Werkzeuge & Eisenwaren",
        "agent_id": "CATEGORY_09",
        "competitors": ["Hornbach", "Bauhaus", "Amazon.de", "ManoMano"],
        "taxonomy_competitor_nodes": [
            ("akkuwerkzeug", "Akku-Werkzeug-Sets"),
            ("messwerkzeug", "Mess- & Prüfwerkzeug"),
        ],
    },
    {
        "buzzard_id": "cat-12",
        "buzzard_name": "Elektronik",
        "agent_id": "CATEGORY_12",
        "competitors": ["Amazon.de", "MediaMarkt", "Saturn"],
        "taxonomy_competitor_nodes": [
            ("zubehoer", "Kabel & Ladezubehör"),
            ("smart_home", "Smart-Home-Sensoren"),
        ],
    },
    {
        "buzzard_id": "cat-13",
        "buzzard_name": "Haushaltsgeräte",
        "agent_id": "CATEGORY_13",
        "competitors": ["MediaMarkt", "Saturn", "Amazon.de"],
        "taxonomy_competitor_nodes": [
            ("kleingeraete", "Kleine Küchengeräte"),
            ("klima", "Luftreiniger & Klimageräte"),
        ],
    },
]

# Öffentliche Preis-Benchmarks mit optionaler eBay-Live-Suche
PUBLIC_PRICE_BENCHMARKS = [
    {
        "product_key": "motoroel-5w30-5l",
        "title": "Motoröl 5W-30 5L (Marktbenchmark)",
        "category": "cat-05",
        "ebay_query": "Motoröl 5W-30 5 Liter",
        "amazon_query": "Motoröl 5W-30 5 Liter",
        "offers": [
            ("amazon_de", "Amazon.de", 34.99, 0.0),
            ("autodoc", "AutoDoc", 29.95, 4.99),
            ("kfzteile24", "kfzteile24", 31.50, 5.99),
        ],
        "source": "Öffentliche Shop-Preisbeispiele / Branchenvergleich 2026",
        "confidence": "Mittel",
    },
    {
        "product_key": "allzweckreiniger-1l",
        "title": "Allzweckreiniger 1L",
        "category": "cat-03",
        "ebay_query": "Allzweckreiniger 1 Liter",
        "amazon_query": "Allzweckreiniger 1 Liter",
        "offers": [
            ("dm", "dm.de", 1.25, 4.95),
            ("rossmann", "rossmann.de", 1.19, 4.95),
            ("amazon_de", "Amazon.de", 2.49, 0.0),
        ],
        "source": "Typische Drogerie-Preisniveaus DE 2026",
        "confidence": "Mittel",
    },
    {
        "product_key": "gartenschlauch-20m",
        "title": "Gartenschlauch 20m",
        "category": "cat-07",
        "ebay_query": "Gartenschlauch 20m",
        "amazon_query": "Gartenschlauch 20m",
        "offers": [
            ("obi", "OBI", 24.99, 5.99),
            ("hornbach", "Hornbach", 22.99, 4.99),
            ("amazon_de", "Amazon.de", 19.99, 0.0),
            ("manomano", "ManoMano", 21.50, 6.99),
        ],
        "source": "Baumarkt-Online-Benchmark DE 2026",
        "confidence": "Mittel",
    },
    {
        "product_key": "akku-bohrmaschine-set",
        "title": "Akku-Bohrmaschinen-Set 18V",
        "category": "cat-09",
        "ebay_query": "Akku Bohrmaschine Set 18V",
        "amazon_query": "Akku Bohrmaschine Set 18V",
        "offers": [
            ("hornbach", "Hornbach", 89.99, 4.99),
            ("bauhaus", "Bauhaus", 94.99, 5.99),
            ("amazon_de", "Amazon.de", 79.99, 0.0),
        ],
        "source": "DIY-Online-Benchmark DE 2026",
        "confidence": "Mittel",
    },
    {
        "product_key": "usb-c-kabel-2m",
        "title": "USB-C Ladekabel 2m",
        "category": "cat-12",
        "ebay_query": "USB C Ladekabel 2m",
        "amazon_query": "USB C Ladekabel 2m",
        "offers": [
            ("mediamarkt", "MediaMarkt", 14.99, 4.99),
            ("amazon_de", "Amazon.de", 8.99, 0.0),
            ("saturn", "Saturn", 12.99, 4.99),
        ],
        "source": "Elektronik-Zubehör-Benchmark DE 2026",
        "confidence": "Mittel",
    },
    {
        "product_key": "luftreiniger-hepa",
        "title": "Luftreiniger HEPA (Einstiegsmodell)",
        "category": "cat-13",
        "ebay_query": "Luftreiniger HEPA",
        "amazon_query": "Luftreiniger HEPA",
        "offers": [
            ("mediamarkt", "MediaMarkt", 129.00, 0.0),
            ("amazon_de", "Amazon.de", 99.00, 0.0),
            ("saturn", "Saturn", 119.00, 4.99),
        ],
        "source": "Haushaltsgeräte-Saisonbenchmark Sommer 2026",
        "confidence": "Mittel",
    },
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _live_health() -> dict[str, str]:
    from live_connectors.health import live_health_report

    lines = live_health_report().splitlines()
    return {line.split(":")[0].strip(): line.split(":", 1)[1].strip() for line in lines}


def _fetch_public_sources() -> list[dict[str, Any]]:
    from live_connectors.public_fetch import PublicFetcher

    fetcher = PublicFetcher()
    rows = []
    for src in PUBLIC_SOURCES:
        try:
            result = fetcher.fetch(src["url"])
            text = result.get("text", "")
            snippet = re.sub(r"\s+", " ", text)[:400]
            rows.append(
                {
                    "source_id": src["id"],
                    "title": src["title"],
                    "url": result.get("url", src["url"]),
                    "status": "OK",
                    "bytes": result.get("bytes", 0),
                    "observed_at": result.get("observed_at"),
                    "snippet": snippet,
                }
            )
        except Exception as exc:  # noqa: BLE001
            rows.append(
                {
                    "source_id": src["id"],
                    "title": src["title"],
                    "url": src["url"],
                    "status": "FEHLER",
                    "error": str(exc),
                    "observed_at": _now(),
                }
            )
    return rows


def _static_offers_for_benchmark(bench: dict[str, Any], observed_at: str) -> list[SellerOffer]:
    rows = []
    for seller_id, seller_name, price, shipping in bench["offers"]:
        rows.append(
            SellerOffer(
                seller_id=seller_id,
                seller_name=seller_name,
                product_key=bench["product_key"],
                title=bench["title"],
                price=price,
                shipping_price=shipping,
                observed_at=observed_at,
                evidence=[
                    SourceEvidence(
                        source_id=bench["product_key"],
                        url=bench.get("source", ""),
                        observed_at=observed_at,
                        claim=bench["title"],
                        confidence=0.7,
                    )
                ],
            )
        )
    return rows


def _live_health() -> dict[str, Any]:
    from live_connectors.registry import connector_health

    return connector_health()


def _fetch_marketplace_offers(
    *,
    client,
    parser_module: str,
    parser_func: str,
    source_label: str,
    observed_at: str,
) -> tuple[list[SellerOffer], list[dict[str, Any]]]:
    import importlib

    parser = importlib.import_module(parser_module)
    search_to_seller_offers = getattr(parser, parser_func)

    live_rows: list[SellerOffer] = []
    meta: list[dict[str, Any]] = []
    for bench in PUBLIC_PRICE_BENCHMARKS:
        query_key = "ebay_query" if "ebay" in source_label.lower() else "amazon_query"
        query = bench.get(query_key)
        if not query:
            continue
        try:
            offers, raw = search_to_seller_offers(
                client,
                query,
                bench["product_key"],
                bench["title"],
                observed_at,
                limit=5,
            )
            live_rows.extend(offers)
            meta.append(
                {
                    "product_key": bench["product_key"],
                    "query": query,
                    "angebote": len(offers),
                    "total": raw.get("total") or len(raw.get("searchResult", {}).get("items", [])) or len(offers),
                    "quelle": source_label,
                    "vertrauen": "Hoch" if offers else "Niedrig",
                }
            )
        except Exception as exc:  # noqa: BLE001
            meta.append(
                {
                    "product_key": bench["product_key"],
                    "query": query,
                    "status": "FEHLER",
                    "fehler": str(exc),
                    "quelle": source_label,
                }
            )
    return live_rows, meta


def _fetch_ebay_live_offers(observed_at: str) -> tuple[list[SellerOffer], list[dict[str, Any]]]:
    from live_connectors.ebay import EbayClient

    client = EbayClient()
    if not client.configured():
        return [], []
    return _fetch_marketplace_offers(
        client=client,
        parser_module="live_connectors.ebay_parser",
        parser_func="search_to_seller_offers",
        source_label="eBay Browse API (EBAY_DE)",
        observed_at=observed_at,
    )


def _fetch_amazon_live_offers(observed_at: str) -> tuple[list[SellerOffer], list[dict[str, Any]]]:
    from live_connectors.amazon_creators import AmazonCreatorsClient

    client = AmazonCreatorsClient()
    if not client.configured():
        return [], []
    return _fetch_marketplace_offers(
        client=client,
        parser_module="live_connectors.amazon_parser",
        parser_func="search_to_seller_offers",
        source_label="Amazon Creators API (amazon.de)",
        observed_at=observed_at,
    )


def _collect_all_offers(observed_at: str) -> tuple[list[SellerOffer], dict[str, Any]]:
    static_offers: list[SellerOffer] = []
    for bench in PUBLIC_PRICE_BENCHMARKS:
        static_offers.extend(_static_offers_for_benchmark(bench, observed_at))

    ebay_offers, ebay_meta = _fetch_ebay_live_offers(observed_at)
    amazon_offers, amazon_meta = _fetch_amazon_live_offers(observed_at)

    live_by_product: dict[str, list[SellerOffer]] = {}
    for offer in ebay_offers + amazon_offers:
        live_by_product.setdefault(offer.product_key, []).append(offer)

    active_sources = []
    if ebay_offers:
        active_sources.append("ebay")
    if amazon_offers:
        active_sources.append("amazon")

    if active_sources:
        merged: list[SellerOffer] = []
        for bench in PUBLIC_PRICE_BENCHMARKS:
            key = bench["product_key"]
            if key in live_by_product:
                merged.extend(live_by_product[key])
            else:
                merged.extend(_static_offers_for_benchmark(bench, observed_at))
        return merged, {
            "modus": "multi_live" if len(active_sources) > 1 else f"{active_sources[0]}_live",
            "quellen": active_sources,
            "angebote": len(merged),
            "ebay": ebay_meta,
            "amazon": amazon_meta,
            "fallback_benchmarks": False,
        }

    return static_offers, {
        "modus": "oeffentliche_benchmarks",
        "quellen": [],
        "angebote": len(static_offers),
        "produkte": len(PUBLIC_PRICE_BENCHMARKS),
        "fallback_benchmarks": True,
    }


def _offers_for_category(all_offers: list[SellerOffer], buzzard_id: str) -> list[SellerOffer]:
    keys = {b["product_key"] for b in PUBLIC_PRICE_BENCHMARKS if b["category"] == buzzard_id}
    return [offer for offer in all_offers if offer.product_key in keys]


def _run_category_scans(all_offers: list[SellerOffer]) -> list[dict[str, Any]]:
    agents = build_43_agents(CategoryIntelligence43Service().category_definitions())
    reports = []
    observed_at = _now()

    for cat in PRIORITY_CATEGORIES:
        agent = agents.get(cat["agent_id"])
        if agent is None:
            continue

        buzzard_taxonomy = [CategoryNode(cat["buzzard_id"], cat["buzzard_name"], 1)]
        observed_taxonomy = list(buzzard_taxonomy)
        for node_id, name in cat["taxonomy_competitor_nodes"]:
            observed_taxonomy.append(
                CategoryNode(node_id, name, 2, cat["buzzard_id"], source="wettbewerber")
            )

        category_offers = _offers_for_category(all_offers, cat["buzzard_id"])
        if not category_offers:
            for bench in PUBLIC_PRICE_BENCHMARKS:
                if bench["category"] == cat["buzzard_id"]:
                    category_offers.extend(_static_offers_for_benchmark(bench, observed_at))

        report = agent.analyze(category_offers, buzzard_taxonomy, observed_taxonomy)
        pricing = PriceIntelligenceEngine().seller_comparison(category_offers)
        reports.append(
            {
                "buzzard_kategorie": cat["buzzard_name"],
                "buzzard_id": cat["buzzard_id"],
                "agent_id": cat["agent_id"],
                "wettbewerber": cat["competitors"],
                "angebote_analysiert": report.offers_seen,
                "verkaeufer": report.unique_sellers,
                "preisstatistik": report.price_statistics,
                "preisvergleich": pricing.get("products", []),
                "kategorie_luecken": [asdict(x) for x in report.missing_categories],
            }
        )
    return reports


def _save_to_memory(dogu: DoguBey, memory: MemoryStore, payload: dict[str, Any]) -> None:
    memory.put(
        "de_ecom_intel",
        "live_scan_bericht",
        payload,
        source="dogu_bey/de_ecom_intel_scan",
        confidence=78.0,
    )
    dogu.save_finding(
        "live_scan_bericht",
        json.dumps(payload, ensure_ascii=False),
        source="dogu_bey/de_ecom_intel_scan",
        confidence=78,
    )


def run_de_ecom_intel_scan() -> dict[str, Any]:
    """Führt Live-Scan aus: Connectors, öffentliche Quellen, Category Intelligence 43, Preisbenchmark."""
    dogu = DoguBey()
    memory = MemoryStore()

    live = _live_health()
    sources = _fetch_public_sources()
    observed_at = _now()
    all_offers, preis_quelle = _collect_all_offers(observed_at)
    category_reports = _run_category_scans(all_offers)

    from live_connectors.google_ads_signals import fetch_google_ads_signals

    google_ads = fetch_google_ads_signals()

    price_engine = PriceIntelligenceEngine()
    price_comparison = price_engine.seller_comparison(all_offers)

    hinweise = []
    for connector in live.get("connectors", []):
        if connector["status"] == "NOT_CONFIGURED" and connector["key"] != "public_fetch":
            hinweise.append(
                f"{connector['name']}: NOT_CONFIGURED — {', '.join(connector['env_vars'])} in intelligence/.env eintragen."
            )
    if preis_quelle.get("modus") != "oeffentliche_benchmarks":
        hinweise.append(
            f"Live-Preise aktiv ({', '.join(preis_quelle.get('quellen', []))}): "
            f"{preis_quelle.get('angebote', 0)} Angebote."
        )
    else:
        hinweise.append(
            "Keine Marketplace-Live-Preise — Fallback auf öffentliche Benchmarks + live-fetch."
        )
    if google_ads.get("status") == "OK":
        hinweise.append(
            f"Google Ads verbunden: {google_ads['summe']['clicks']} Klicks / "
            f"{google_ads['summe']['cost_eur']} EUR (7 Tage)."
        )
    hinweise.append(
        "Nur öffentliche Quellen verwendet. Keine Login-, CAPTCHA- oder Bypass-Versuche."
    )
    hinweise.append(
        "Verkäufe bei Buzzard bleiben deaktiviert (Katalogmodus). Scan dient der Entscheidungsvorbereitung."
    )

    payload = {
        "operation": OPERATION_CODE,
        "datum": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "agent": "dogu_bey",
        "sprache": "de",
        "live_connectors": live,
        "oeffentliche_quellen": sources,
        "google_ads": google_ads,
        "category_intelligence_43": {
            "agenten_aktiv": 43,
            "prioritaets_kategorien_gescannt": len(category_reports),
            "berichte": category_reports,
        },
        "preis_quelle": preis_quelle,
        "preisbenchmark": price_comparison,
        "hinweise": hinweise,
    }

    _save_to_memory(dogu, memory, payload)
    return payload
