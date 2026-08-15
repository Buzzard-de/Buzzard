import re

INTENTS = {
    "product_search": ["suche", "haben sie", "gesucht", "search", "looking for", "chercher", "busco", "arıyorum", "أبحث"],
    "availability": ["verfügbar", "lager", "stock", "available", "disponible", "stok", "متوفر"],
    "price": ["preis", "price", "prix", "precio", "fiyat", "سعر"],
    "compatibility": ["passt", "kompatibel", "compatible", "fit", "uyumlu", "متوافق"],
    "order_status": ["bestellung", "order", "commande", "sipariş", "طلب"],
    "human": ["mitarbeiter", "mensch", "agent", "human", "person", "insan", "موظف"],
}


def detect_intent(text):
    q = (text or "").casefold()
    scores = {k: sum(1 for token in v if token in q) for k, v in INTENTS.items()}
    return max(scores, key=scores.get) if max(scores.values(), default=0) else "general"


def extract_entities(text):
    q = text or ""
    return {
        "gtin": next(iter(re.findall(r"\b\d{8,14}\b", q)), None),
        "mpn": None,
        "vehicle_model": None,
        "oem": None,
    }
