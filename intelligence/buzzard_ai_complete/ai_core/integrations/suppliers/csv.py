from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Any

from buzzard_ai_complete.ai_core.integrations.suppliers.base import SupplierAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.security import enforce_import_size_limit, validate_csv_row


class CsvSupplierAdapter(SupplierAdapter):
    adapter_type = "csv"

    def __init__(self, file_path: str | Path | None = None) -> None:
        self._file_path = Path(file_path) if file_path else None

    def is_configured(self) -> bool:
        return self._file_path is not None and self._file_path.is_file()

    def fetch_catalog(self, *, supplier_id: str) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "NO_DATA_AVAILABLE",
                "adapter": self.adapter_type,
                "message": "CSV supplier feed path not configured",
            }
        raw_bytes = self._file_path.read_bytes()
        enforce_import_size_limit(raw_bytes)
        text = raw_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        records: list[dict[str, str]] = []
        for row in reader:
            records.append(validate_csv_row(row))
        return {
            "status": "ok",
            "adapter": self.adapter_type,
            "supplier_id": supplier_id,
            "records": records,
            "count": len(records),
        }
