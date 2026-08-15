"""Run the COMPLETE maintenance scheduler (Docker / systemd entrypoint)."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent))

try:
    from buzzard_ai_complete.runtime.maintenance import run_scheduler_loop
except ImportError:
    from runtime.maintenance import run_scheduler_loop

if __name__ == "__main__":
    run_scheduler_loop()
