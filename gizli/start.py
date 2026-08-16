#!/usr/bin/env python3
"""Legacy alias — use Buzzard/app.py all"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(PROJECT_ROOT / "Buzzard" / "app.py"), run_name="__main__", run_args=["all"])
