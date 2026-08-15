import csv
import json
import xml.etree.ElementTree as ET

from buzzard_ai_complete.production.catalog import Product


def normalize_record(row):
    return Product(
        sku=str(row["sku"]).strip(),
        name=str(row["name"]).strip(),
        category=str(row.get("category", "Uncategorized")).strip(),
        price=float(row.get("price", 0)),
        stock=int(row.get("stock", 0)),
        active=str(row.get("active", "1")).lower() not in {"0", "false", "no"},
        brand=str(row.get("brand", "")).strip(),
        supplier_id=str(row.get("supplier_id", "")).strip() or None,
    )


def import_json(payload):
    data = json.loads(payload)
    if isinstance(data, dict):
        data = data.get("products", [])
    return [normalize_record(row) for row in data]


def import_csv(payload):
    return [normalize_record(row) for row in csv.DictReader(payload.splitlines())]


def import_xml(payload):
    root = ET.fromstring(payload)
    rows = []
    for node in root.findall(".//product"):
        rows.append({child.tag: child.text or "" for child in node})
    return [normalize_record(row) for row in rows]
