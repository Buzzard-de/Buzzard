#!/usr/bin/env bash
# Start an isolated API with synthetic admin accounts and run a command against it.
#
#   scripts/isolated/api.sh [--port N] [--limiter on|off] [--allow-network] [VAR=value ...] -- <command> [args...]
#
# For scripts that talk to a running API (scripts/part3-security.mjs,
# scripts/final-audit.mjs, scripts/production-safety.mjs): those refuse an API
# that keeps its data in the regular place, and this is how they get one that
# does not. The command sees:
#
#   BUZZARD_API_URL            address of the isolated API
#   BUZZARD_SYNTHETIC_ADMINS   file with one synthetic account per role (mode 0600)
#
# Database, admin accounts, sessions and logs live in a throwaway directory;
# the real server/data is hidden (see run.sh). Ports 3000 and 3001 are refused.
#
# Exit status: that of the command; 64 for wrong usage, 95 when the API did
# not start or the port is taken, 90-94 as in run.sh.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SELF="$REPO/scripts/isolated/api.sh"

if [[ "${BUZZARD_API_STAGE:-}" != "inner" ]]; then
  PORT=3011
  LIMITER=on
  RUN_ARGS=()
  SETTINGS=()
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    case "$1" in
      --port) PORT="${2:-}"; shift 2 ;;
      --limiter) LIMITER="${2:-}"; shift 2 ;;
      --allow-network) RUN_ARGS+=(--allow-network); shift ;;
      [A-Z_]*=*) SETTINGS+=("$1"); shift ;;
      *) echo "unknown option: $1" >&2; exit 64 ;;
    esac
  done
  if [[ "${1:-}" != "--" || $# -lt 2 ]]; then
    echo "usage: scripts/isolated/api.sh [--port N] [--limiter on|off] [--allow-network] [VAR=value ...] -- <command> [args...]" >&2
    exit 64
  fi
  shift
  if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1024 || PORT > 65535 )); then
    echo "port must be a number between 1024 and 65535" >&2
    exit 64
  fi
  if [[ "$PORT" == "3000" || "$PORT" == "3001" ]]; then
    echo "ports 3000 and 3001 belong to the developer stack; choose another" >&2
    exit 64
  fi
  if [[ "$LIMITER" != "on" && "$LIMITER" != "off" ]]; then
    echo "--limiter must be on or off" >&2
    exit 64
  fi
  for setting in "${SETTINGS[@]}"; do
    case "${setting%%=*}" in
      PORT | BUZZARD_DB_PATH | BUZZARD_DATA_DIR | BUZZARD_BACKUP_DIR | BUZZARD_BIND_HOST)
        echo "${setting%%=*} is set by this script and cannot be overridden" >&2
        exit 64
        ;;
    esac
  done
  export BUZZARD_API_STAGE=inner BUZZARD_API_STAGE_PORT="$PORT" BUZZARD_API_STAGE_LIMITER="$LIMITER"
  BUZZARD_API_STAGE_SETTINGS="$(printf '%s\n' "${SETTINGS[@]}")"
  export BUZZARD_API_STAGE_SETTINGS
  exec "$REPO/scripts/isolated/run.sh" "${RUN_ARGS[@]}" -- "$SELF" "$@"
fi

unset BUZZARD_API_STAGE
ROOT="$BUZZARD_ISOLATED_ROOT"
PORT="$BUZZARD_API_STAGE_PORT"
API_URL="http://127.0.0.1:$PORT"

if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "[isolated-api] port $PORT is already in use; choose another with --port" >&2
  exit 95
fi

node "$REPO/scripts/isolated/seed-synthetic-admins.cjs" "$ROOT/data" "$ROOT/synthetic-admins.json"

api_env=(
  BUZZARD_E2E_DB=1
  BUZZARD_COMMERCE_CORE=1
  BUZZARD_SALES_ENABLED=0
  JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
)
if [[ "$BUZZARD_API_STAGE_LIMITER" == "off" ]]; then
  api_env+=(BUZZARD_TEST_MODE=1)
fi
while IFS= read -r setting; do
  [[ -n "$setting" ]] && api_env+=("$setting")
done <<< "${BUZZARD_API_STAGE_SETTINGS:-}"
# Last, so that nothing above can point the API anywhere else.
api_env+=(
  PORT="$PORT"
  BUZZARD_DB_PATH="$ROOT/catalog.sqlite"
  BUZZARD_DATA_DIR="$ROOT/data"
  BUZZARD_BACKUP_DIR="$ROOT/backups"
  BUZZARD_BIND_HOST=127.0.0.1
)
unset BUZZARD_API_STAGE_PORT BUZZARD_API_STAGE_LIMITER BUZZARD_API_STAGE_SETTINGS

(cd "$REPO" && exec env -u BUZZARD_TEST_MODE -u BUZZARD_RATE_LIMIT_DISABLED "${api_env[@]}" node server/server.js) > "$ROOT/api.log" 2>&1 &
api_pid=$!
cleanup() {
  kill -TERM "$api_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ready=0
for _ in $(seq 1 120); do
  if curl -fs -o /dev/null -m 2 "$API_URL/api/health"; then
    ready=1
    break
  fi
  kill -0 "$api_pid" 2>/dev/null || break
  sleep 0.5
done
if [[ $ready != 1 ]]; then
  echo "[isolated-api] the API did not start; last lines of its log:" >&2
  tail -n 20 "$ROOT/api.log" >&2
  exit 95
fi
echo "[isolated-api] API (limiter $([[ " ${api_env[*]} " == *" BUZZARD_TEST_MODE=1 "* ]] && echo off || echo on)) ready at $API_URL" >&2

set +e
BUZZARD_API_URL="$API_URL" BUZZARD_SYNTHETIC_ADMINS="$ROOT/synthetic-admins.json" "$@"
status=$?
set -e
exit "$status"
