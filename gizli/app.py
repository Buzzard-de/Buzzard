#!/usr/bin/env python3
"""Buzzard gizli — run with: python app.py [api|voice|all]"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import threading
import time
from pathlib import Path

GIZLI_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = GIZLI_DIR.parent
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"

for path in (INTELLIGENCE_ROOT, GIZLI_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))


def _load_main(script_name: str):
    path = GIZLI_DIR / script_name
    spec = importlib.util.spec_from_file_location(f"buzzard_gizli_{script_name}", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main


def run_api() -> None:
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "0") == "1"
    print(f"Buzzard gizli API — http://{host}:{port}")
    uvicorn.run(
        "buzzard_ai_complete.api.app:app",
        host=host,
        port=port,
        reload=reload,
    )


def run_voice() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("VOICE_PORT", os.environ.get("PORT", "8787")))
    print(f"Buzzard gizli Voice — http://{host}:{port}")
    from voice_server import main as voice_main

    voice_main(host=host, port=port)


def run_all() -> None:
    print("Buzzard gizli")
    print("  API   → http://127.0.0.1:8000")
    print("  Voice → http://127.0.0.1:8787")

    api_env = os.environ.copy()
    api_env.setdefault("HOST", "127.0.0.1")
    api_env["PORT"] = "8000"

    voice_env = os.environ.copy()
    voice_env.setdefault("HOST", "127.0.0.1")
    voice_env["PORT"] = "8787"

    def _api_thread() -> None:
        os.environ.update(api_env)
        run_api()

    def _voice_thread() -> None:
        os.environ.update(voice_env)
        run_voice()

    api_thread = threading.Thread(target=_api_thread, name="buzzard-gizli-api", daemon=True)
    voice_thread = threading.Thread(target=_voice_thread, name="buzzard-gizli-voice", daemon=True)

    api_thread.start()
    time.sleep(0.5)
    voice_thread.start()

    try:
        while api_thread.is_alive() or voice_thread.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Buzzard gizli launcher")
    parser.add_argument(
        "mode",
        nargs="?",
        default="api",
        choices=("api", "voice", "all"),
        help="api → :8000, voice → :8787, all → both",
    )
    args = parser.parse_args(argv)

    if args.mode == "api":
        run_api()
    elif args.mode == "voice":
        run_voice()
    else:
        run_all()


if __name__ == "__main__":
    main()
