#!/usr/bin/env python3
"""Buzzard Intelligence Voice UI (gizli) — http://127.0.0.1:8787

Run: python voice_ui.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

INTELLIGENCE_ROOT = Path(__file__).resolve().parents[1]
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))


def main() -> None:
    from voice.server import main as voice_main

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8787"))
    voice_main(host=host, port=port)


if __name__ == "__main__":
    main()
