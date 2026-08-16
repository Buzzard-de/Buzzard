#!/usr/bin/env python3
"""Buzzard gizli — run with: python app.py [api|voice|all]"""

from __future__ import annotations

import argparse
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

from urls import GIZLI_API_PORT, GIZLI_API_URL, GIZLI_HOST, GIZLI_VOICE_PORT, GIZLI_VOICE_URL


def run_api() -> None:
    import uvicorn

    host = os.environ.get("HOST", GIZLI_HOST)
    port = int(os.environ.get("PORT", str(GIZLI_API_PORT)))
    reload = os.environ.get("RELOAD", "0") == "1"
    print(f"Buzzard gizli API — http://{host}:{port}")
    uvicorn.run(
        "buzzard_ai_complete.api.app:app",
        host=host,
        port=port,
        reload=reload,
    )


def run_voice() -> None:
    host = os.environ.get("HOST", GIZLI_HOST)
    port = int(os.environ.get("VOICE_PORT", os.environ.get("PORT", str(GIZLI_VOICE_PORT))))
    print(f"Buzzard gizli Voice — {GIZLI_VOICE_URL}")
    from voice_server import main as voice_main

    voice_main(host=host, port=port)


def run_all() -> None:
    print("Buzzard gizli")
    print(f"  API   → {GIZLI_API_URL}")
    print(f"  Voice → {GIZLI_VOICE_URL}")

    api_env = os.environ.copy()
    api_env.setdefault("HOST", GIZLI_HOST)
    api_env["PORT"] = str(GIZLI_API_PORT)

    voice_env = os.environ.copy()
    voice_env.setdefault("HOST", GIZLI_HOST)
    voice_env["PORT"] = str(GIZLI_VOICE_PORT)

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
        default="all",
        choices=("api", "voice", "all"),
        help=f"api → :{GIZLI_API_PORT}, voice → :{GIZLI_VOICE_PORT}, all → both (default)",
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
