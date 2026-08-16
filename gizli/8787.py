#!/usr/bin/env python3
"""Legacy alias — use Buzzard/voice.py"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(PROJECT_ROOT / "Buzzard" / "voice.py"), run_name="__main__")
