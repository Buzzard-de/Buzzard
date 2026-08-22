from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.suppliers.csv import CsvSupplierAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.rest import RestSupplierAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.xml import XmlSupplierAdapter
from buzzard_ai_complete.config import settings


def get_supplier_adapter(*, feed_type: str | None = None, feed_path: str | None = None):
    feed = (feed_type or settings.SUPPLIER_FEED_TYPE or "rest").strip().lower()
    if feed == "csv":
        path = feed_path or settings.SUPPLIER_FEED_PATH
        return CsvSupplierAdapter(path)
    if feed == "xml":
        path = feed_path or settings.SUPPLIER_FEED_PATH
        return XmlSupplierAdapter(path)
    return RestSupplierAdapter()


def supplier_feeds_configured() -> bool:
  adapter = get_supplier_adapter()
  return adapter.is_configured()
