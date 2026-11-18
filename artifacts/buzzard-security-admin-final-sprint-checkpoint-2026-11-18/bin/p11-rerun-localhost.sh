#!/usr/bin/env bash
cd /tmp/buzzard-final-sprint/work || exit 1
L=/tmp/buzzard-final-sprint/logs
scripts/isolated/e2e.sh --limiter off --host localhost -- --project=chromium-desktop e2e/admin.spec.ts e2e/admin-session.spec.ts e2e/admin-pim-core.spec.ts e2e/admin-roles.spec.ts > "$L/p11-final2-admin-localhost.log" 2>&1
echo "EXIT=$?" >> "$L/p11-final2-admin-localhost.log"
