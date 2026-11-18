#!/usr/bin/env bash
# Run Playwright against a private API + storefront that only see synthetic data.
#
#   scripts/isolated/e2e.sh [options] [--] [playwright test arguments]
#
#   --limiter on|off   admin login rate limiter. "off" (default) starts the API
#                      with BUZZARD_TEST_MODE=1, as the regular E2E stack does;
#                      "on" leaves it enforced (8 logins per 15 min and address).
#   --api-port N       default 3011
#   --web-port N       default 3010
#   --no-network       loopback only: nothing can reach an external provider
#   --serve-only       start the stack and wait instead of running Playwright
#
# Ports 3000 and 3001 are refused: they belong to the developer stack, which
# works on the real server/data. Admin specs log in with synthetic accounts
# created for this run (see seed-synthetic-admins.cjs).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SELF="$REPO/scripts/isolated/e2e.sh"

if [[ "${BUZZARD_E2E_STAGE:-}" != "inner" ]]; then
  LIMITER=off
  API_PORT=3011
  WEB_PORT=3010
  SERVE_ONLY=0
  RUN_ARGS=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --limiter) LIMITER="$2"; shift 2 ;;
      --api-port) API_PORT="$2"; shift 2 ;;
      --web-port) WEB_PORT="$2"; shift 2 ;;
      --no-network) RUN_ARGS+=(--no-network); shift ;;
      --serve-only) SERVE_ONLY=1; shift ;;
      -h|--help) sed -n '2,17p' "$SELF" | sed 's/^# \{0,1\}//'; exit 0 ;;
      --) shift; break ;;
      *) break ;;
    esac
  done
  case "$LIMITER" in on|off) ;; *) echo "--limiter expects on or off" >&2; exit 64 ;; esac
  for port in "$API_PORT" "$WEB_PORT"; do
    if [[ "$port" == "3000" || "$port" == "3001" ]]; then
      echo "ports 3000 and 3001 are reserved for the developer stack" >&2
      exit 64
    fi
  done
  # A second `next dev` in the same checkout shares .next with the first and
  # clears it on start, which breaks the pages the first one is serving. This
  # has to be decided here: inside the namespace /proc/<pid>/cwd of outside
  # processes is unreadable. A Next.js process whose directory cannot be read
  # counts as using this checkout.
  PRIVATE_WEB=0
  for dir in /proc/[0-9]*; do
    cmd="$(tr '\0' ' ' < "$dir/cmdline" 2>/dev/null || true)"
    [[ "$cmd" =~ next(-server|\ dev) ]] || continue
    cwd="$(readlink "$dir/cwd" 2>/dev/null || echo unreadable)"
    if [[ "$cwd" == "$REPO" || "$cwd" == "unreadable" ]]; then
      PRIVATE_WEB=1
      break
    fi
  done
  export BUZZARD_E2E_STAGE=inner BUZZARD_E2E_LIMITER="$LIMITER" BUZZARD_E2E_API_PORT="$API_PORT" \
    BUZZARD_E2E_WEB_PORT="$WEB_PORT" BUZZARD_E2E_SERVE_ONLY="$SERVE_ONLY" BUZZARD_E2E_PRIVATE_WEB="$PRIVATE_WEB"
  exec "$REPO/scripts/isolated/run.sh" "${RUN_ARGS[@]}" -- "$SELF" "$@"
fi

unset BUZZARD_E2E_STAGE
ROOT="$BUZZARD_ISOLATED_ROOT"
API_URL="http://127.0.0.1:$BUZZARD_E2E_API_PORT"
WEB_URL="http://127.0.0.1:$BUZZARD_E2E_WEB_PORT"

node "$REPO/scripts/isolated/seed-synthetic-admins.cjs" "$ROOT/data" "$ROOT/synthetic-admins.json"

WEB_DIR="$REPO"
if [[ "${BUZZARD_E2E_PRIVATE_WEB:-1}" != "0" ]]; then
  WEB_DIR="$ROOT/web"
fi
if [[ "$WEB_DIR" != "$REPO" ]]; then
  echo "[isolated-e2e] another Next.js dev server uses this checkout; serving a private copy" >&2
  rm -rf "$WEB_DIR"
  mkdir -p "$WEB_DIR"
  tar -C "$REPO" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./out \
    --exclude=./server --exclude=./intelligence --exclude=./test-results --exclude=./playwright-report \
    -cf - . | tar -C "$WEB_DIR" -xf -
  ln -s "$REPO/node_modules" "$WEB_DIR/node_modules"
fi

pids=()
cleanup() {
  for pid in "${pids[@]}"; do
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

api_env=(
  PORT="$BUZZARD_E2E_API_PORT"
  BUZZARD_DB_PATH="$ROOT/catalog.sqlite"
  BUZZARD_E2E_DB=1
  BUZZARD_COMMERCE_CORE=1
  BUZZARD_SALES_ENABLED=0
  BUZZARD_CORS_ORIGINS="$WEB_URL"
  JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
)
if [[ "$BUZZARD_E2E_LIMITER" == "off" ]]; then
  api_env+=(BUZZARD_TEST_MODE=1)
fi
(cd "$REPO" && exec env -u BUZZARD_TEST_MODE -u BUZZARD_RATE_LIMIT_DISABLED "${api_env[@]}" node server/server.js) \
  > "$ROOT/api.log" 2>&1 &
pids+=($!)

(cd "$WEB_DIR" && exec env NEXT_PUBLIC_SALES_ENABLED=0 NEXT_PUBLIC_COMMERCE_CORE=1 \
  NEXT_PUBLIC_BUZZARD_API_URL="$API_URL" NEXT_TELEMETRY_DISABLED=1 \
  node "$REPO/node_modules/next/dist/bin/next" dev -p "$BUZZARD_E2E_WEB_PORT" -H 127.0.0.1) \
  > "$ROOT/web.log" 2>&1 &
pids+=($!)

wait_for() {
  local url="$1" label="$2" deadline=$((SECONDS + 180))
  until curl -fs -o /dev/null -m 5 "$url"; do
    if (( SECONDS > deadline )); then
      echo "[isolated-e2e] $label did not become ready; see $ROOT" >&2
      exit 94
    fi
    sleep 1
  done
  echo "[isolated-e2e] $label ready at ${url%/api/health}" >&2
}
wait_for "$API_URL/api/health" "API (limiter $BUZZARD_E2E_LIMITER)"
wait_for "$WEB_URL/" "storefront"

if [[ "$BUZZARD_E2E_SERVE_ONLY" == "1" ]]; then
  echo "[isolated-e2e] serving; credentials file: $ROOT/synthetic-admins.json" >&2
  wait
  exit 0
fi

read -r ADMIN_EMAIL ADMIN_PASSWORD < <(node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).administrator;
  process.stdout.write(c.email + " " + c.password + "\n");
' "$ROOT/synthetic-admins.json")

cd "$REPO"
set +e
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL="$WEB_URL" \
BUZZARD_API_URL="$API_URL" \
NEXT_PUBLIC_BUZZARD_API_URL="$API_URL" \
BUZZARD_ADMIN_EMAIL="$ADMIN_EMAIL" \
BUZZARD_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
BUZZARD_E2E_CREDENTIALS_FILE="$ROOT/synthetic-admins.json" \
BUZZARD_E2E_LIMITER="$BUZZARD_E2E_LIMITER" \
  node "$REPO/node_modules/@playwright/test/cli.js" test --output "$ROOT/test-results" "$@"
status=$?
set -e
exit "$status"
