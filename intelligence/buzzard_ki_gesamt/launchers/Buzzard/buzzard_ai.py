#!/usr/bin/env python3
"""Buzzard AI — einheitlicher Startpunkt (API + Voice + Bey-Agenten)."""

from __future__ import annotations

import sys
from pathlib import Path

BUZZARD_DIR = Path(__file__).resolve().parent

if str(BUZZARD_DIR) not in sys.path:
    sys.path.insert(0, str(BUZZARD_DIR))

from app import main

if __name__ == "__main__":
    main()
