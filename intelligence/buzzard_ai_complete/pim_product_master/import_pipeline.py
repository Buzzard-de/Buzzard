def normalize(raw):
    return {
        "supplier_sku": str(raw.get("supplier_sku") or raw.get("sku") or "").strip(),
        "brand": str(raw.get("brand") or "").strip(),
        "mpn": str(raw.get("mpn") or "").strip(),
        "gtin": str(raw.get("gtin") or raw.get("ean") or "").strip(),
        "title": str(raw.get("title") or raw.get("name") or "").strip(),
        "category_hint": str(raw.get("category_hint") or raw.get("category") or "").strip(),
        "raw": raw,
    }


def dedupe_key(record):
    if record["gtin"]:
        return "gtin:" + record["gtin"]
    if record["brand"] and record["mpn"]:
        return "brand-mpn:" + record["brand"].casefold() + "|" + record["mpn"].casefold()
    return "supplier-sku:" + record["supplier_sku"]


def process(records):
    seen = set()
    accepted = []
    duplicates = []
    for raw in records:
        record = normalize(raw)
        key = dedupe_key(record)
        if key in seen:
            duplicates.append(record)
        else:
            accepted.append(record)
        seen.add(key)
    return {"accepted_candidates": accepted, "duplicates": duplicates}
