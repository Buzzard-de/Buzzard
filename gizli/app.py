#!/usr/bin/env python3
"""Buzzard — Intelligence API (gizli). Run: python app.py"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))


def main() -> None:
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "0") == "1"

    print(f"Buzzard Intelligence API — http://{host}:{port}")

    uvicorn.run(
        "buzzard_ai_complete.api.app:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
