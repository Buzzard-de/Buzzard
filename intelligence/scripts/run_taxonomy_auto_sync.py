#!/usr/bin/env python3
"""Orchestriert die vollständige Taxonomie-Auto-Sync-Kette (Master → Shop → Intelligence)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def run_step(label: str, script_name: str, *, dry_run: bool = False, extra_args: list[str] | None = None) -> dict:
    script = SCRIPTS / script_name
    if not script.is_file():
        raise SystemExit(f"Missing script: {script}")
    if dry_run and script_name == "sync_shop_categories_from_master.py":
        cmd = [sys.executable, str(script), "--dry-run"]
    else:
        cmd = [sys.executable, str(script), *(extra_args or [])]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return {"step": label, "script": script_name, "output": result.stdout.strip()}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Buzzard taxonomy auto-sync pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Shop sync report only; skip downstream writes")
    parser.add_argument("--skip-builds", action="store_true", help="Skip HTML console rebuilds")
    args = parser.parse_args()

    started = _utc_now()
    steps: list[dict] = []

    if not args.dry_run:
        steps.append(run_step("expand_shop_to_48", "expand_shop_to_48_master_categories.py"))
        steps.append(run_step("german_48_main_categories", "sync_german_48_main_categories.py"))
    steps.append(
        run_step(
            "shop_categories_from_master",
            "sync_shop_categories_from_master.py",
            dry_run=args.dry_run,
        )
    )
    if not args.dry_run:
        steps.append(run_step("kfz_category_tree", "sync_kfz_category_tree.py"))
        steps.append(run_step("category_intelligence_43", "sync_category_intelligence_43.py"))
        if not args.skip_builds:
            build_script = SCRIPTS / "build_category_intelligence_maximum.py"
            if build_script.is_file():
                result = subprocess.run(
                    [sys.executable, str(build_script)],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                steps.append(
                    {
                        "step": "category_intelligence_maximum_build",
                        "script": "build_category_intelligence_maximum.py",
                        "output": result.stdout.strip(),
                    }
                )

    summary = {
        "schema": "buzzard.taxonomy-auto-sync.pipeline.v1",
        "started_at": started,
        "finished_at": _utc_now(),
        "dry_run": args.dry_run,
        "steps": steps,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
