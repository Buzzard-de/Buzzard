#!/usr/bin/env python3
"""Buzzard project — run with: python app.py [api|voice|all]"""

from __future__ import annotations

import argparse
import os
import sys
import threading
import time
from pathlib import Path

BUZZARD_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BUZZARD_DIR.parent
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"

for path in (INTELLIGENCE_ROOT, BUZZARD_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from urls import BUZZARD_API_PORT, BUZZARD_API_URL, BUZZARD_HOST, BUZZARD_VOICE_PORT, BUZZARD_VOICE_URL


def _start_bey_agents() -> None:
    from buzzard_ai_complete.runtime.bey_runtime import start_bey_agents

    status = start_bey_agents()
    names = ", ".join(agent["name"] for agent in status["agents"])
    print(f"Bey agents started — {names}")


def run_api() -> None:
    import uvicorn

    host = os.environ.get("HOST", BUZZARD_HOST)
    port = int(os.environ.get("PORT", str(BUZZARD_API_PORT)))
    reload = os.environ.get("RELOAD", "0") == "1"
    _start_bey_agents()
    print(f"Buzzard API — http://{host}:{port}")
    print(f"  Bey status → http://{host}:{port}/bey/status")
    uvicorn.run(
        "buzzard_ai_complete.api.app:app",
        host=host,
        port=port,
        reload=reload,
    )


def run_voice() -> None:
    host = os.environ.get("HOST", BUZZARD_HOST)
    port = int(os.environ.get("VOICE_PORT", os.environ.get("PORT", str(BUZZARD_VOICE_PORT))))
    print(f"Buzzard Voice — {BUZZARD_VOICE_URL}")
    from voice_server import main as voice_main

    voice_main(host=host, port=port)


def run_all() -> None:
    print("Buzzard")
    print(f"  API   → {BUZZARD_API_URL}")
    print(f"  Voice → {BUZZARD_VOICE_URL}")
    _start_bey_agents()
    print(f"  Bey   → {BUZZARD_API_URL}/bey/status")

    api_env = os.environ.copy()
    api_env.setdefault("HOST", BUZZARD_HOST)
    api_env["PORT"] = str(BUZZARD_API_PORT)

    voice_env = os.environ.copy()
    voice_env.setdefault("HOST", BUZZARD_HOST)
    voice_env["PORT"] = str(BUZZARD_VOICE_PORT)

    def _api_thread() -> None:
        os.environ.update(api_env)
        run_api()

    def _voice_thread() -> None:
        os.environ.update(voice_env)
        run_voice()

    api_thread = threading.Thread(target=_api_thread, name="buzzard-api", daemon=True)
    voice_thread = threading.Thread(target=_voice_thread, name="buzzard-voice", daemon=True)

    api_thread.start()
    time.sleep(0.5)
    voice_thread.start()

    try:
        while api_thread.is_alive() or voice_thread.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Buzzard launcher")
    parser.add_argument(
        "mode",
        nargs="?",
        default="all",
        choices=("api", "voice", "all"),
        help=f"api → :{BUZZARD_API_PORT}, voice → :{BUZZARD_VOICE_PORT}, all → both (default)",
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
