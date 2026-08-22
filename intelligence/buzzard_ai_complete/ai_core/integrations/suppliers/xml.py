from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from buzzard_ai_complete.ai_core.integrations.suppliers.base import SupplierAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.security import sanitize_text, validate_xml_content


class XmlSupplierAdapter(SupplierAdapter):
    adapter_type = "xml"

    def __init__(self, file_path: str | Path | None = None) -> None:
        self._file_path = Path(file_path) if file_path else None

    def is_configured(self) -> bool:
        return self._file_path is not None and self._file_path.is_file()

    def fetch_catalog(self, *, supplier_id: str) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "NO_DATA_AVAILABLE",
                "adapter": self.adapter_type,
                "message": "XML supplier feed path not configured",
            }
        xml_text = self._file_path.read_text(encoding="utf-8")
        validate_xml_content(xml_text)
        root = ET.fromstring(xml_text)
        records: list[dict[str, str]] = []
        for product in root.findall(".//product"):
            record = {child.tag: sanitize_text(child.text or "") for child in product}
            if record:
                records.append(record)
        return {
            "status": "ok",
            "adapter": self.adapter_type,
            "supplier_id": supplier_id,
            "records": records,
            "count": len(records),
        }
