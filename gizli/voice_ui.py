#!/usr/bin/env python3
"""Buzzard gizli — Voice UI. Run: python voice_ui.py → http://127.0.0.1:8787"""

from __future__ import annotations

import os
import sys
from pathlib import Path

GIZLI_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = GIZLI_DIR.parent
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))
if str(GIZLI_DIR) not in sys.path:
    sys.path.insert(0, str(GIZLI_DIR))

from voice_server import main as voice_main


def main() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8787"))
    print(f"Buzzard gizli Voice — http://{host}:{port}")
    voice_main(host=host, port=port)


if __name__ == "__main__":
    main()
