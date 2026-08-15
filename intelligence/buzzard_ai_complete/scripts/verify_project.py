import importlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INTELLIGENCE_ROOT = ROOT.parent
sys.path.insert(0, str(INTELLIGENCE_ROOT))

result = subprocess.run(
    [sys.executable, "-m", "pytest", "-q", str(ROOT / "tests")],
    cwd=str(INTELLIGENCE_ROOT),
    capture_output=True,
    text=True,
)
print(result.stdout)
if result.returncode:
    print(result.stderr)
    raise SystemExit(result.returncode)

errors = []
for path in ROOT.rglob("*.py"):
    if "__pycache__" in path.parts:
        continue
    rel = path.relative_to(ROOT)
    module = "buzzard_ai_complete." + ".".join(rel.with_suffix("").parts)
    try:
        importlib.import_module(module)
    except Exception as exc:
        errors.append((module, str(exc)))

if errors:
    for module, error in errors:
        print(f"IMPORT ERROR: {module}: {error}")
    raise SystemExit(2)

print("ALL CHECKS PASSED")
