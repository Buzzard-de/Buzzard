#!/usr/bin/env python3
"""
Buzzard Intelligence v11 — Voice Interface server (alias).

Canonical implementation: Buzzard/voice_server.py → http://127.0.0.1:8787
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BUZZARD_VOICE = PROJECT_ROOT / "Buzzard" / "voice_server.py"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def main(host="127.0.0.1", port=8787):
    spec = importlib.util.spec_from_file_location("buzzard_voice_server", BUZZARD_VOICE)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {BUZZARD_VOICE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.main(host=host, port=port)


if __name__ == "__main__":
    main()
