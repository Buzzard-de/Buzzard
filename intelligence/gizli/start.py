#!/usr/bin/env python3
"""Legacy alias — delegates to Buzzard/app.py all"""

from __future__ import annotations

import runpy
from pathlib import Path

runpy.run_path(
    str(Path(__file__).resolve().parents[2] / "Buzzard" / "app.py"),
    run_name="__main__",
    run_args=["all"],
)
