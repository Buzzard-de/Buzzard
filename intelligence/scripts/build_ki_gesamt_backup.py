#!/usr/bin/env python3
"""Sammelt alle Buzzard-KI-Bausteine in intelligence/buzzard_ki_gesamt/ (Sicherungskopie)."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
KI_ROOT = REPO / "intelligence" / "buzzard_ki_gesamt"
SNAPSHOTS = KI_ROOT / "snapshots"

SKIP_DIRS = {
    "__pycache__",
    ".pytest_cache",
    ".git",
    "node_modules",
    ".next",
}
SKIP_SUFFIXES = {".pyc", ".pyo"}


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def should_skip(path: Path, *, check_name_only: bool = False) -> bool:
    if path.suffix in SKIP_SUFFIXES:
        return True
    names = [path.name] if check_name_only or path.is_file() else list(path.parts)
    return any(part in SKIP_DIRS for part in names)


def copy_tree(src: Path, dest: Path) -> int:
    if not src.exists():
        return 0
    count = 0
    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        return 1
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = Path(root).relative_to(src)
        if any(should_skip(rel / d) for d in ["."] if False):
            pass
        for name in files:
            src_file = Path(root) / name
            if should_skip(src_file, check_name_only=True):
                continue
            rel_file = rel / name
            if should_skip(rel_file, check_name_only=True):
                continue
            out = dest / rel_file
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, out)
            count += 1
    return count


def symlink_relative(link: Path, target: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.is_symlink() or link.exists():
        if link.is_symlink() or link.is_file():
            link.unlink()
        elif link.is_dir():
            shutil.rmtree(link)
    rel = os.path.relpath(target.resolve(), link.parent.resolve())
    link.symlink_to(rel)


def collect_manifests(dest: Path) -> list[dict]:
    patterns = ("*manifest*.json", "*MANIFEST*.json")
    rows: list[dict] = []
    search_roots = [
        REPO / "data" / "taxonomy",
        REPO / "intelligence" / "buzzard_ai_complete" / "docs",
        REPO / "intelligence" / "archive",
        REPO / "intelligence" / "final_integration",
        REPO / "intelligence" / "master_integration",
        REPO / "intelligence" / "production",
        REPO / "intelligence" / "website_monitoring",
    ]
    seen: set[str] = set()
    for root in search_roots:
        if not root.is_dir():
            continue
        for pattern in patterns:
            for src in root.rglob(pattern):
                if should_skip(src, check_name_only=True):
                    continue
                key = src.name
                if key in seen:
                    key = f"{src.parent.name}_{src.name}"
                seen.add(key)
                out = dest / key
                shutil.copy2(src, out)
                rows.append(
                    {
                        "file": str(src.relative_to(REPO)),
                        "backup": str(out.relative_to(KI_ROOT)),
                        "bytes": src.stat().st_size,
                    }
                )
    return rows


def inventory() -> dict:
    areas = [
        ("python_complete", REPO / "intelligence" / "buzzard_ai_complete"),
        ("python_v1_v200", REPO / "intelligence" / "buzzard_intelligence"),
        ("python_gesamt", REPO / "intelligence" / "buzzard_ai_gesamt"),
        ("python_archive", REPO / "intelligence" / "archive"),
        ("python_connectors", REPO / "intelligence" / "live_connectors"),
        ("python_scripts", REPO / "intelligence" / "scripts"),
        ("launcher_buzzard", REPO / "Buzzard"),
        ("launcher_gizli", REPO / "gizli"),
        ("taxonomy_data", REPO / "data" / "taxonomy"),
        ("frontend_ai", REPO / "components" / "ai"),
        ("frontend_lib_ai", REPO / "lib" / "ai"),
        ("frontend_lib_ai_center", REPO / "lib" / "aiCenter"),
    ]
    counts = {}
    for name, path in areas:
        if not path.exists():
            counts[name] = 0
            continue
        if path.is_file():
            counts[name] = 1
            continue
        total = 0
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for file in files:
                fp = Path(root) / file
                if not should_skip(fp, check_name_only=True):
                    total += 1
        counts[name] = total

    server_ai_files = [
        "server/lib/aiCenter.js",
        "server/lib/aiChatService.js",
        "server/lib/intelligenceBridge.js",
        "server/lib/embeddedIntelligence.js",
        "server/lib/embeddedSmartMenu48.js",
        "server/lib/phoneAssistantService.js",
        "server/lib/recommendationService.js",
        "server/plugins/aiCenterPlugin.js",
        "server/plugins/aiAutomationPlugin.js",
        "server/plugins/intelligenceProductionBridgePlugin.js",
        "server/plugins/masterTaxonomyPlugin.js",
        "server/plugins/smartMenu48Plugin.js",
    ]
    counts["server_ai"] = sum(1 for rel in server_ai_files if (REPO / rel).is_file())

    return {
        "schema": "buzzard.ki-gesamt.inventory.v1",
        "generated_at": utc_iso(),
        "ki_root": str(KI_ROOT.relative_to(REPO)),
        "areas": counts,
        "total_files_estimated": sum(counts.values()),
        "agents": {
            "category_specialists": 43,
            "ai_council_18": 18,
            "council_orchestrator_v20": 8,
            "bey_agents": 3,
            "customs_council_19": 1,
            "named_agents_total": 73,
        },
        "intelligence_modules_v1_v200": counts.get("python_v1_v200", 0),
    }


def build_symlinks(aktiv: Path) -> list[dict]:
    links = [
        ("buzzard_ai_complete", REPO / "intelligence" / "buzzard_ai_complete"),
        ("buzzard_intelligence", REPO / "intelligence" / "buzzard_intelligence"),
        ("buzzard_ai_gesamt", REPO / "intelligence" / "buzzard_ai_gesamt"),
        ("archive", REPO / "intelligence" / "archive"),
        ("live_connectors", REPO / "intelligence" / "live_connectors"),
        ("scripts", REPO / "intelligence" / "scripts"),
        ("main_py", REPO / "intelligence" / "main.py"),
        ("Buzzard", REPO / "Buzzard"),
        ("gizli", REPO / "gizli"),
        ("taxonomy", REPO / "data" / "taxonomy"),
        ("public_taxonomy", REPO / "public" / "taxonomy"),
    ]
    rows = []
    for name, target in links:
        link = aktiv / name
        symlink_relative(link, target)
        rows.append({"name": name, "target": str(target.relative_to(REPO))})
    return rows


def copy_small_layers(ki_root: Path) -> dict:
    stats: dict[str, int] = {}
    frontend_pairs = [
        (REPO / "components" / "ai", ki_root / "frontend" / "components" / "ai"),
        (REPO / "lib" / "ai", ki_root / "frontend" / "lib" / "ai"),
        (REPO / "lib" / "aiCenter", ki_root / "frontend" / "lib" / "aiCenter"),
        (REPO / "lib" / "api" / "intelligence.ts", ki_root / "frontend" / "lib" / "api" / "intelligence.ts"),
        (REPO / "lib" / "categories" / "kfzTree.ts", ki_root / "frontend" / "lib" / "categories" / "kfzTree.ts"),
    ]
    for src, dest in frontend_pairs:
        stats[str(dest.relative_to(ki_root))] = copy_tree(src, dest)

    server_pairs = [
        (REPO / "server" / "lib" / "aiCenter.js", ki_root / "server" / "lib" / "aiCenter.js"),
        (REPO / "server" / "lib" / "aiChatService.js", ki_root / "server" / "lib" / "aiChatService.js"),
        (REPO / "server" / "lib" / "intelligenceBridge.js", ki_root / "server" / "lib" / "intelligenceBridge.js"),
        (REPO / "server" / "lib" / "embeddedIntelligence.js", ki_root / "server" / "lib" / "embeddedIntelligence.js"),
        (REPO / "server" / "lib" / "embeddedSmartMenu48.js", ki_root / "server" / "lib" / "embeddedSmartMenu48.js"),
        (REPO / "server" / "lib" / "phoneAssistantService.js", ki_root / "server" / "lib" / "phoneAssistantService.js"),
        (REPO / "server" / "lib" / "recommendationService.js", ki_root / "server" / "lib" / "recommendationService.js"),
        (REPO / "server" / "plugins" / "aiCenterPlugin.js", ki_root / "server" / "plugins" / "aiCenterPlugin.js"),
        (REPO / "server" / "plugins" / "aiAutomationPlugin.js", ki_root / "server" / "plugins" / "aiAutomationPlugin.js"),
        (REPO / "server" / "plugins" / "intelligenceProductionBridgePlugin.js", ki_root / "server" / "plugins" / "intelligenceProductionBridgePlugin.js"),
        (REPO / "server" / "plugins" / "masterTaxonomyPlugin.js", ki_root / "server" / "plugins" / "masterTaxonomyPlugin.js"),
        (REPO / "server" / "plugins" / "smartMenu48Plugin.js", ki_root / "server" / "plugins" / "smartMenu48Plugin.js"),
    ]
    for src, dest in server_pairs:
        stats[str(dest.relative_to(ki_root))] = copy_tree(src, dest)

    launcher_pairs = [
        (REPO / "Buzzard", ki_root / "launchers" / "Buzzard"),
        (REPO / "gizli", ki_root / "launchers" / "gizli"),
        (REPO / "intelligence" / "gizli", ki_root / "launchers" / "gizli_intelligence"),
    ]
    for src, dest in launcher_pairs:
        stats[str(dest.relative_to(ki_root))] = copy_tree(src, dest)

    return stats


def create_zip_snapshot(snapshot_dir: Path, zip_path: Path) -> int:
    file_count = 0
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(snapshot_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for name in files:
                fp = Path(root) / name
                if should_skip(fp, check_name_only=True):
                    continue
                arc = fp.relative_to(snapshot_dir)
                zf.write(fp, arcname=str(arc))
                file_count += 1
    return file_count


def build_snapshot(ki_root: Path, *, full: bool) -> dict:
    stamp = utc_stamp()
    snapshot_dir = SNAPSHOTS / stamp
    latest_dir = SNAPSHOTS / "latest"
    if snapshot_dir.exists():
        shutil.rmtree(snapshot_dir)
    if latest_dir.exists() or latest_dir.is_symlink():
        if latest_dir.is_symlink() or latest_dir.is_file():
            latest_dir.unlink()
        else:
            shutil.rmtree(latest_dir)

    snapshot_dir.mkdir(parents=True, exist_ok=True)
    copied: dict[str, int] = {}

    trees = [
        ("buzzard_ai_complete", REPO / "intelligence" / "buzzard_ai_complete"),
        ("buzzard_intelligence", REPO / "intelligence" / "buzzard_intelligence"),
        ("buzzard_ai_gesamt", REPO / "intelligence" / "buzzard_ai_gesamt"),
        ("archive", REPO / "intelligence" / "archive"),
        ("live_connectors", REPO / "intelligence" / "live_connectors"),
        ("Buzzard", REPO / "Buzzard"),
        ("gizli", REPO / "gizli"),
        ("taxonomy", REPO / "data" / "taxonomy"),
        ("frontend", ki_root / "frontend"),
        ("server", ki_root / "server"),
        ("manifests", ki_root / "manifests"),
    ]
    if full:
        trees.extend(
            [
                ("version_json", REPO / "intelligence"),
            ]
        )

    for label, src in trees:
        if label == "version_json":
            dest = snapshot_dir / "version_json"
            dest.mkdir(parents=True, exist_ok=True)
            count = 0
            for src_file in (REPO / "intelligence").glob("buzzard_v*.json"):
                shutil.copy2(src_file, dest / src_file.name)
                count += 1
            copied[label] = count
            continue
        dest = snapshot_dir / label
        copied[label] = copy_tree(src, dest)

    symlink_relative(latest_dir, snapshot_dir)
    zip_path = SNAPSHOTS / f"buzzard_ki_gesamt_{stamp}.zip"
    zipped = create_zip_snapshot(snapshot_dir, zip_path)

    return {
        "snapshot_dir": str(snapshot_dir.relative_to(REPO)),
        "latest_link": str(latest_dir.relative_to(REPO)),
        "zip": str(zip_path.relative_to(REPO)),
        "zip_bytes": zip_path.stat().st_size if zip_path.exists() else 0,
        "zip_files": zipped,
        "copied": copied,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Buzzard KI Gesamt backup folder")
    parser.add_argument("--full-snapshot", action="store_true", help="Include full dated snapshot + zip")
    parser.add_argument("--skip-snapshot", action="store_true", help="Only refresh index, symlinks, manifests")
    args = parser.parse_args()

    KI_ROOT.mkdir(parents=True, exist_ok=True)
    (KI_ROOT / "aktiv").mkdir(parents=True, exist_ok=True)
    (KI_ROOT / "manifests").mkdir(parents=True, exist_ok=True)
    (KI_ROOT / "frontend").mkdir(parents=True, exist_ok=True)
    (KI_ROOT / "server").mkdir(parents=True, exist_ok=True)
    (KI_ROOT / "launchers").mkdir(parents=True, exist_ok=True)
    SNAPSHOTS.mkdir(parents=True, exist_ok=True)

    manifest = inventory()
    manifest["symlinks"] = build_symlinks(KI_ROOT / "aktiv")
    manifest["manifests"] = collect_manifests(KI_ROOT / "manifests")
    manifest["copied_layers"] = copy_small_layers(KI_ROOT)

    if args.full_snapshot and not args.skip_snapshot:
        manifest["snapshot"] = build_snapshot(KI_ROOT, full=True)
    elif not args.skip_snapshot:
        manifest["snapshot"] = build_snapshot(KI_ROOT, full=False)

    manifest_path = KI_ROOT / "MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    index = KI_ROOT / "INDEX.md"
    index.write_text(
        "\n".join(
            [
                "# Buzzard KI Gesamt — Sicherungsordner",
                "",
                f"Stand: {manifest['generated_at']}",
                "",
                "Alle KI-/Intelligence-Bausteine von Buzzard an einem Ort.",
                "",
                "## Struktur",
                "",
                "| Ordner | Inhalt |",
                "|--------|--------|",
                "| `aktiv/` | Symlinks zu den live Python-/Taxonomie-Pfaden |",
                "| `frontend/` | Kopie der Next.js KI-Komponenten und Clients |",
                "| `server/` | Kopie der Node.js KI-Services und Plugins |",
                "| `launchers/` | Kopie von Buzzard/ und gizli/ Startern |",
                "| `manifests/` | Alle Intelligence-Manifeste (JSON) |",
                "| `snapshots/` | Datierter Vollsicherungs-Snapshot + ZIP |",
                "",
                "## Befehle",
                "",
                "```bash",
                "npm run backup:ki",
                "cd intelligence && python3 main.py complete-build-ki-gesamt-backup --full-snapshot",
                "```",
                "",
                f"Geschätzte Dateien: **{manifest['total_files_estimated']}**",
                f"Benannte Agenten: **{manifest['agents']['named_agents_total']}**",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"OK: KI-Gesamt-Ordner → {KI_ROOT}")


if __name__ == "__main__":
    main()
