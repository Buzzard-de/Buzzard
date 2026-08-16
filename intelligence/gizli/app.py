#!/usr/bin/env python3
"""Buzzard gizli (intelligence alias) — delegates to project root gizli/app.py"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GIZLI_APP = PROJECT_ROOT / "gizli" / "app.py"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

runpy.run_path(str(GIZLI_APP), run_name="__main__")
