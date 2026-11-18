#!/usr/bin/env bash
# with-api.sh [VAR=value ...] -- <command...>
# Starts the staging API on 127.0.0.1:3011 inside a private mount + network
# namespace with synthetic admins, runs the command (API_URL, CREDS, ISO_ROOT
# exported), stops the API. Never touches /workspace or ports 3000/3001.
set -uo pipefail
WORK="${WORK_TREE:-/tmp/buzzard-final-sprint/work}"
if [[ "${WITH_API_STAGE:-}" != "inner" ]]; then
  envs=()
  while [[ $# -gt 0 && "$1" != "--" ]]; do envs+=("$1"); shift; done
  shift
  printf '%s\n' "${envs[@]}" > /tmp/buzzard-final-sprint/.with-api-env.$$
  WITH_API_STAGE=inner WITH_API_ENVFILE=/tmp/buzzard-final-sprint/.with-api-env.$$ \
    "$WORK/scripts/isolated/run.sh" --no-network -- "$0" "$@"
  st=$?
  rm -f /tmp/buzzard-final-sprint/.with-api-env.$$
  exit $st
fi
unset WITH_API_STAGE
ROOT="$BUZZARD_ISOLATED_ROOT"
mapfile -t envs < "$WITH_API_ENVFILE"
node "$WORK/scripts/isolated/seed-synthetic-admins.cjs" "$ROOT/data" "$ROOT/synthetic-admins.json" >/dev/null
api_env=(PORT=3011 BUZZARD_DB_PATH="$ROOT/catalog.sqlite" BUZZARD_E2E_DB=1 BUZZARD_COMMERCE_CORE=1 BUZZARD_SALES_ENABLED=0
  JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')")
for e in "${envs[@]}"; do [[ -n "$e" ]] && api_env+=("$e"); done
(cd "$WORK" && exec env -u BUZZARD_TEST_MODE -u BUZZARD_RATE_LIMIT_DISABLED "${api_env[@]}" node server/server.js) > "$ROOT/api.log" 2>&1 &
pid=$!
ok=0
for i in $(seq 1 120); do
  if curl -fs -o /dev/null -m 2 http://127.0.0.1:3011/api/health; then ok=1; break; fi
  kill -0 $pid 2>/dev/null || break
  sleep 0.5
done
export API_URL=http://127.0.0.1:3011 CREDS="$ROOT/synthetic-admins.json" ISO_ROOT="$ROOT" API_PID=$pid API_UP=$ok
if [[ $ok != 1 && "${ALLOW_API_DOWN:-0}" != 1 ]]; then
  echo "[with-api] API did not start; log tail:" >&2; tail -20 "$ROOT/api.log" >&2; kill $pid 2>/dev/null; exit 95
fi
"$@"
st=$?
kill $pid 2>/dev/null; wait $pid 2>/dev/null
exit $st
