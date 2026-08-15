import hashlib
import json

def identity_keys(r):
    keys = []
    if r.get("gtin"):
        keys.append(("gtin", r["gtin"]))
    if r.get("brand") and r.get("mpn"):
        keys.append(("brand_mpn", r["brand"].casefold()+"|"+r["mpn"].casefold()))
    if r.get("supplier_id") and r.get("supplier_sku"):
        keys.append(("supplier_sku", r["supplier_id"]+"|"+r["supplier_sku"]))
    return keys

def content_hash(r):
    payload = {
        k: r.get(k) for k in
        ["title","description","brand","mpn","gtin","category_hint","price","currency","attributes"]
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def classify_duplicate(record, seen):
    matches = []
    for key in identity_keys(record):
        if key in seen:
            matches.append({"key": key[0], "existing_product_id": seen[key]})
    return matches
