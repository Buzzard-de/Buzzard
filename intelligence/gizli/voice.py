#!/usr/bin/env python3
"""Buzzard gizli (intelligence alias) — http://127.0.0.1:8787"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VOICE_PY = PROJECT_ROOT / "gizli" / "voice.py"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

runpy.run_path(str(VOICE_PY), run_name="__main__")
