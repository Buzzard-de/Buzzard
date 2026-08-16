#!/usr/bin/env python3
"""Legacy alias — delegates to Buzzard/app.py"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(PROJECT_ROOT / "Buzzard" / "app.py"), run_name="__main__")
