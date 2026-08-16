#!/usr/bin/env python3
"""Buzzard — Voice UI (gizli). Run: python voice_ui.py → http://127.0.0.1:8787"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))


def main() -> None:
    from voice.server import main as voice_main

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8787"))
    print(f"Buzzard Voice UI — http://{host}:{port}")
    voice_main(host=host, port=port)


if __name__ == "__main__":
    main()
