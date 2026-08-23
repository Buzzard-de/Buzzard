from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class StructuredLogger:
    def __init__(self, name: str = "buzzard.ai_core") -> None:
        self._logger = logging.getLogger(name)
        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self._logger.addHandler(handler)
            self._logger.setLevel(logging.INFO)

    def log(self, level: str, event: str, **fields: Any) -> None:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "event": event,
            **fields,
        }
        line = json.dumps(payload, default=str)
        if level.upper() == "ERROR":
            self._logger.error(line)
        elif level.upper() == "WARNING":
            self._logger.warning(line)
        else:
            self._logger.info(line)


_default_logger = StructuredLogger()


def get_structured_logger() -> StructuredLogger:
    return _default_logger
