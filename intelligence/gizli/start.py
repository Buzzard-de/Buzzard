#!/usr/bin/env python3
"""Start Buzzard Intelligence API + Voice UI together from gizli."""

from __future__ import annotations

import importlib.util
import os
import sys
import threading
import time
from pathlib import Path

GIZLI_DIR = Path(__file__).resolve().parent
INTELLIGENCE_ROOT = GIZLI_DIR.parent
if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))


def _load_main(script_name: str):
    path = GIZLI_DIR / script_name
    spec = importlib.util.spec_from_file_location(f"gizli_{script_name}", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main


def _run_api() -> None:
    os.environ.setdefault("HOST", "127.0.0.1")
    os.environ.setdefault("PORT", "8000")
    _load_main("app.py")()


def _run_voice() -> None:
    os.environ.setdefault("HOST", "127.0.0.1")
    os.environ.setdefault("PORT", "8787")
    _load_main("voice_ui.py")()


def main() -> None:
    print("Buzzard gizli — API http://127.0.0.1:8000 | Voice http://127.0.0.1:8787")

    api_thread = threading.Thread(target=_run_api, name="buzzard-api", daemon=True)
    voice_thread = threading.Thread(target=_run_voice, name="buzzard-voice", daemon=True)

    api_thread.start()
    time.sleep(0.5)
    voice_thread.start()

    try:
        while api_thread.is_alive() or voice_thread.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
