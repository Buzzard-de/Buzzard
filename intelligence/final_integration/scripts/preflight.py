from pathlib import Path
import sys
root=Path(__file__).parents[1]
required=[
"01_integration/system_manifest.json","02_connectors/CONNECTOR_CHECKLIST.md",
"03_data_pipeline/PIPELINE_CHECKLIST.md","05_security/SECURITY_GATE.md",
"06_observability/MONITORING.md","07_backup/BACKUP_RESTORE.md",
"08_deployment/DEPLOYMENT.md","09_go_live/GO_LIVE_GATE.md"]
missing=[p for p in required if not (root/p).exists()]
if missing:
    print("PREFLIGHT FAILED")
    for p in missing: print("-",p)
    sys.exit(1)
print("PREFLIGHT OK")
