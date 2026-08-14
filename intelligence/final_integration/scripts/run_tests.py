import subprocess,sys
from pathlib import Path
root=Path(__file__).parents[1]
raise SystemExit(subprocess.run([sys.executable,"-m","pytest",str(root/"04_tests"),"-q"],cwd=root).returncode)
