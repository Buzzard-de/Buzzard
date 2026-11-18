#!/usr/bin/env bash
# Phase 11 final evidence runs, one isolated stack at a time.
cd /tmp/buzzard-final-sprint/work || exit 1
L=/tmp/buzzard-final-sprint/logs
SPECS="e2e/admin.spec.ts e2e/admin-session.spec.ts e2e/admin-pim-core.spec.ts e2e/admin-roles.spec.ts"
run() { # name, args...
  local name="$1"; shift
  scripts/isolated/e2e.sh "$@" > "$L/$name.log" 2>&1
  echo "EXIT=$?" >> "$L/$name.log"
}
run p11-final3-admin-127        --limiter off --host 127.0.0.1 -- --project=chromium-desktop $SPECS
run p11-final3-admin-localhost  --limiter off --host localhost -- --project=chromium-desktop $SPECS
run p11-final3-limiter-on-127   --limiter on  --host 127.0.0.1 -- --project=api --project=chromium-desktop e2e/admin-login-limiter.spec.ts e2e/admin-roles.spec.ts -g "limiter|five wrong|locked account|login form message"
run p11-final3-limiter-on-localhost --limiter on --host localhost -- --project=api --project=chromium-desktop e2e/admin-login-limiter.spec.ts e2e/admin-roles.spec.ts -g "limiter|five wrong|locked account|login form message"
run p11-final3-limiter-off-127  --limiter off --host 127.0.0.1 -- --project=api e2e/admin-login-limiter.spec.ts
echo ALL-DONE > "$L/p11-final3.done"
