#!/usr/bin/env python3
"""Buzzard Intelligence API — delegates to Buzzard/app.py"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BUZZARD_APP = PROJECT_ROOT / "Buzzard" / "app.py"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

runpy.run_path(str(BUZZARD_APP), run_name="__main__")
