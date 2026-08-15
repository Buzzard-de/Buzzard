import csv
import json
import xml.etree.ElementTree as ET

def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def read_json(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("products", [])

def read_xml(path):
    root = ET.parse(path).getroot()
    records = []
    for p in root.findall(".//product"):
        records.append({child.tag: child.text for child in p})
    return records

def read_feed(path, kind):
    return {"csv": read_csv, "json": read_json, "xml": read_xml}[kind](path)
