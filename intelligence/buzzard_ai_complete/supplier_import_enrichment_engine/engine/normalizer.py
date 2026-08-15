import re

def clean_text(value):
    if value is None:
        return None
    value = str(value).strip()
    value = re.sub(r"\s+", " ", value)
    return value or None

def normalize_gtin(value):
    if value is None:
        return None
    s = re.sub(r"[^0-9]", "", str(value))
    if len(s) in (8, 12, 13, 14):
        return s.zfill(14)
    return s or None

def normalize_mpn(value):
    value = clean_text(value)
    if not value:
        return None
    return re.sub(r"\s+", "", value).upper()

def normalize_brand(value):
    value = clean_text(value)
    return value.title() if value else None

def normalize_price(value):
    if value is None or value == "":
        return None
    s = str(value).strip().replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return round(float(s), 4)
    except ValueError:
        return None

def normalize_stock(value):
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", ".")))
    except ValueError:
        return None

def normalize(raw, supplier_id):
    return {
        "supplier_id": supplier_id,
        "supplier_sku": clean_text(raw.get("supplier_sku") or raw.get("supplierSku") or raw.get("sku")),
        "sku": clean_text(raw.get("sku")),
        "gtin": normalize_gtin(raw.get("gtin") or raw.get("ean") or raw.get("EAN")),
        "mpn": normalize_mpn(raw.get("mpn") or raw.get("manufacturer_part_number") or raw.get("MPN")),
        "brand": normalize_brand(raw.get("brand") or raw.get("manufacturer_brand")),
        "manufacturer": clean_text(raw.get("manufacturer")),
        "title": clean_text(raw.get("title") or raw.get("name") or raw.get("product_name")) or "",
        "description": clean_text(raw.get("description") or raw.get("long_description")),
        "category_hint": clean_text(raw.get("category_hint") or raw.get("category") or raw.get("product_category")),
        "price": normalize_price(raw.get("price") or raw.get("purchase_price")),
        "currency": clean_text(raw.get("currency") or "EUR"),
        "stock": normalize_stock(raw.get("stock") or raw.get("quantity")),
        "lead_time_days": normalize_stock(raw.get("lead_time_days")),
        "images": raw.get("images") or [],
        "documents": raw.get("documents") or [],
        "attributes": raw.get("attributes") or {},
        "compatibility": raw.get("compatibility") or [],
        "raw": raw
    }
