#!/usr/bin/env bash
# Checks the isolation tooling itself: that a command under run.sh sees only
# throwaway data and no network, that e2e.sh refuses the developer ports, and
# that the Playwright global setup and the scripts that write to a running API
# refuse every stack that is not isolated.
#
#   scripts/isolated/selftest.sh
#
# Uses stand-in servers on private loopback ports only (stub-server.cjs). It
# never contacts ports 3000/3001 and never writes below the real server/data.
# One check changes server/data from outside on purpose to see the alarm; it
# runs only when this checkout is a private copy below the temp directory and
# is reported as SKIPPED otherwise.
#
# Exit status: 0 when no check failed, 1 otherwise.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN="$REPO/scripts/isolated/run.sh"
E2E="$REPO/scripts/isolated/e2e.sh"
SELFTEST="$REPO/scripts/isolated/selftest"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/buzzard-selftest.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
skip=0
ok() { pass=$((pass + 1)); echo "PASS  $1"; }
bad() { fail=$((fail + 1)); echo "FAIL  $1${2:+ — $2}"; }
skipped() { skip=$((skip + 1)); echo "SKIP  $1 — $2"; }
expect_status() { # name, wanted status, command...
  local name="$1" wanted="$2" status
  shift 2
  "$@" > "$WORK/last.out" 2>&1
  status=$?
  if [[ "$status" == "$wanted" ]]; then ok "$name"; else bad "$name" "status $status, expected $wanted: $(tail -n 2 "$WORK/last.out" | tr '\n' ' ')"; fi
}

real_state() { (cd "$REPO" && find server/data data -type f -print0 2>/dev/null | sort -z | xargs -0 -r sha256sum | sha256sum); }
real_before="$(real_state)"

echo "== run.sh =="
"$RUN" -- bash -c 'ls -A server/data | tr "\n" " "' > "$WORK/inside.out" 2> "$WORK/inside.err"
if [[ "$(cat "$WORK/inside.out")" == ".buzzard-isolated " ]]; then ok "server/data inside holds the marker and nothing else"; else bad "server/data inside holds the marker and nothing else" "$(cat "$WORK/inside.out")"; fi

"$RUN" -- bash -c 'echo "[]" > server/data/selftest-probe.json && echo "{}" > server/data/admin-users.json' > /dev/null 2> "$WORK/write.err"
status=$?
if [[ $status -eq 0 && ! -e "$REPO/server/data/selftest-probe.json" ]] && grep -q "real server/data unchanged" "$WORK/write.err"; then
  ok "a write to server/data inside does not reach the real directory"
else
  bad "a write to server/data inside does not reach the real directory" "status $status"
fi

"$RUN" -- bash -c 'echo "{}" > data/buzzard_suppliers.json; echo "write=$?"; echo x > data/selftest-new-file.json; echo "create=$?"; [[ -d "$BUZZARD_CATALOG_DIR" && "$BUZZARD_CATALOG_DIR" != "$PWD"/* ]] && echo "copies=outside"' > "$WORK/catalog.out" 2> /dev/null
if [[ "$(tr '\n' ' ' < "$WORK/catalog.out")" == "write=1 create=1 copies=outside " && ! -e "$REPO/data/selftest-new-file.json" ]]; then
  ok "the catalog files in data/ cannot be written inside; working copies are outside the checkout"
else
  bad "the catalog files in data/ cannot be written inside; working copies are outside the checkout" "$(tr '\n' ' ' < "$WORK/catalog.out")"
fi

"$RUN" -- python3 - > "$WORK/net.out" 2>&1 <<'PY'
import socket
print("interfaces", [name for _, name in socket.if_nameindex()])
for label, target in (("outside address", ("192.0.2.1", 443)), ("developer API 3001", ("127.0.0.1", 3001)), ("developer storefront 3000", ("127.0.0.1", 3000))):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        s.connect(target)
        print(label, "REACHABLE")
    except OSError as err:
        print(label, "unreachable")
try:
    socket.getaddrinfo("example.com", 443)
    print("name lookup", "ANSWERED")
except OSError:
    print("name lookup", "no answer")
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(("127.0.0.1", 0))
server.listen(1)
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect(server.getsockname())
print("own loopback", "works")
PY
for wanted in "interfaces ['lo']" "outside address unreachable" "developer API 3001 unreachable" "developer storefront 3000 unreachable" "name lookup no answer" "own loopback works"; do
  if grep -qxF "$wanted" "$WORK/net.out"; then ok "network inside: $wanted"; else bad "network inside: $wanted" "$(tr '\n' ';' < "$WORK/net.out")"; fi
done

expect_status "an isolated root inside the repository is refused" 64 env BUZZARD_ISOLATED_ROOT="$REPO/.isolated-root" "$RUN" -- true
[[ -e "$REPO/.isolated-root" ]] && bad "refused root left nothing behind" || ok "refused root left nothing behind"
expect_status "the command's own failure is passed on" 7 "$RUN" -- bash -c 'exit 7'

case "$REPO/" in
  "$(realpath "${TMPDIR:-/tmp}")"/*)
    # Something outside the namespace changes the real directory while a command runs: must be noticed.
    ( sleep 1; echo "[]" > "$REPO/server/data/selftest-outside-change.json" ) &
    "$RUN" -- sleep 3 > /dev/null 2> "$WORK/alarm.err"
    status=$?
    wait
    rm -f "$REPO/server/data/selftest-outside-change.json"
    if [[ $status -eq 90 ]] && grep -q "changed while the command ran" "$WORK/alarm.err"; then ok "a change of the real server/data during a run is reported (status 90)"; else bad "a change of the real server/data during a run is reported (status 90)" "status $status"; fi
    ( sleep 1; echo "[]" > "$REPO/data/selftest-outside-change.json" ) &
    "$RUN" -- sleep 3 > /dev/null 2> "$WORK/alarm.err"
    status=$?
    wait
    rm -f "$REPO/data/selftest-outside-change.json"
    if [[ $status -eq 90 ]] && grep -q "changed while the command ran" "$WORK/alarm.err"; then ok "a change of the catalog files in data/ during a run is reported (status 90)"; else bad "a change of the catalog files in data/ during a run is reported (status 90)" "status $status"; fi
    ;;
  *)
    skipped "a change of the real server/data during a run is reported (status 90)" "would write to the real server/data; runs only in a private copy below the temp directory"
    skipped "a change of the catalog files in data/ during a run is reported (status 90)" "would write to the real data/; runs only in a private copy below the temp directory"
    ;;
esac

echo "== e2e.sh arguments =="
expect_status "API port 3001 is refused" 64 "$E2E" --api-port 3001
expect_status "storefront port 3000 is refused" 64 "$E2E" --web-port 3000
expect_status "API port 3000 is refused" 64 "$E2E" --api-port 3000
expect_status "the same port twice is refused" 64 "$E2E" --api-port 3015 --web-port 3015
expect_status "an unknown limiter mode is refused" 64 "$E2E" --limiter maybe
expect_status "a host other than 127.0.0.1 or localhost is refused" 64 "$E2E" --host example.com
expect_status "a privileged or non-numeric port is refused" 64 "$E2E" --api-port 80

echo "== api.sh arguments =="
API="$REPO/scripts/isolated/api.sh"
expect_status "api.sh refuses port 3001" 64 "$API" --port 3001 -- true
expect_status "api.sh refuses port 3000" 64 "$API" --port 3000 -- true
expect_status "api.sh refuses to be pointed at another data directory" 64 "$API" BUZZARD_DATA_DIR="$REPO/server/data" -- true
expect_status "api.sh refuses to be pointed at another database" 64 "$API" BUZZARD_DB_PATH="$REPO/server/data/buzzard.db" -- true
expect_status "api.sh without a command is refused" 64 "$API" --limiter on

echo "== Playwright global setup and API scripts =="
# One namespace for all cases: stand-in servers on private loopback ports.
cat > "$WORK/cases.sh" <<'CASES'
set -uo pipefail
REPO="$1"; SELFTEST="$2"; OUT="$3"
export STUB_STATE_DIR="$OUT"
pids=()
start() { node "$SELFTEST/stub-server.cjs" "$@" > /dev/null 2>&1 & pids+=($!); }
start api 4011 isolated
start api 4012 isolated
start api 4013 shared
start api 4014 nonsense
start storefront 4021 http://127.0.0.1:4011
start storefront 4022 http://127.0.0.1:4012
start storefront 4023 http://127.0.0.1:4013
start storefront 4024 http://localhost:4011
for port in 4011 4012 4013 4014 4021 4022 4023 4024; do
  for _ in $(seq 1 50); do (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break; sleep 0.1; done
done
playwright() { # case name, env assignments...
  local name="$1"; shift
  rm -f "$OUT/mark"
  (cd "$REPO" && env -u BUZZARD_ISOLATED -u BUZZARD_E2E_ALLOW_SHARED_STACK -u BUZZARD_API_URL -u NEXT_PUBLIC_BUZZARD_API_URL \
    BUZZARD_SELFTEST_MARK="$OUT/mark" "$@" \
    node node_modules/@playwright/test/cli.js test -c "$SELFTEST/playwright.config.ts" --output "$OUT/pw-results") > "$OUT/$name.out" 2>&1
  echo "$name status=$? started=$([[ -e "$OUT/mark" ]] && echo yes || echo no)" >> "$OUT/results"
}
playwright isolated-pair            BUZZARD_API_URL=http://127.0.0.1:4011 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4021
playwright isolated-pair-localhost  BUZZARD_API_URL=http://127.0.0.1:4011 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4024
playwright shared-api               BUZZARD_API_URL=http://127.0.0.1:4013 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023
playwright shared-api-env-claim     BUZZARD_API_URL=http://127.0.0.1:4013 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023 BUZZARD_ISOLATED=1
playwright nonsense-api             BUZZARD_API_URL=http://127.0.0.1:4014 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4021
playwright storefront-other-api     BUZZARD_API_URL=http://127.0.0.1:4011 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4022
playwright storefront-shared-api    BUZZARD_API_URL=http://127.0.0.1:4011 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023
playwright api-down-storefront-up   BUZZARD_API_URL=http://127.0.0.1:4099 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023
playwright nothing-running          BUZZARD_API_URL=http://127.0.0.1:4099 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4098
playwright override-remote          BUZZARD_API_URL=http://203.0.113.10:3001 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023 BUZZARD_E2E_ALLOW_SHARED_STACK=1
playwright override-local           BUZZARD_API_URL=http://127.0.0.1:4013 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4023 BUZZARD_E2E_ALLOW_SHARED_STACK=1
script() { # case name, script, API address
  (cd "$REPO" && env -u BUZZARD_SYNTHETIC_ADMINS BUZZARD_API_URL="$3" node "scripts/$2") > "$OUT/$1.out" 2>&1
  echo "$1 status=$?" >> "$OUT/results"
}
for name in part3-security final-audit production-safety; do
  script "script-$name-shared" "$name.mjs" http://127.0.0.1:4013
  script "script-$name-nonsense" "$name.mjs" http://127.0.0.1:4014
  script "script-$name-down" "$name.mjs" http://127.0.0.1:4099
done
for port in 4011 4012 4013 4014; do echo "writes-$port=$(cat "$OUT/$port.writes")" >> "$OUT/results"; done
kill "${pids[@]}" 2>/dev/null
wait 2>/dev/null
exit 0
CASES
mkdir -p "$WORK/cases"
"$RUN" -- bash "$WORK/cases.sh" "$REPO" "$SELFTEST" "$WORK/cases" > "$WORK/cases.log" 2>&1

result() { grep -m1 "^$1 " "$WORK/cases/results" 2>/dev/null || echo "$1 missing"; }
accepted() { # case, description
  if [[ "$(result "$1")" == "$1 status=0 started=yes" ]]; then ok "$2"; else bad "$2" "$(result "$1"); $(grep -m1 'will not run' "$WORK/cases/$1.out" 2>/dev/null)"; fi
}
refused() { # case, description, text the refusal must contain
  local line
  line="$(result "$1")"
  if [[ "$line" == "$1 status=1 started=no" ]] && grep -q "Playwright will not run against" "$WORK/cases/$1.out" && grep -qF "$3" "$WORK/cases/$1.out"; then
    ok "$2"
  else
    bad "$2" "$line; $(grep -m1 -A1 'will not run' "$WORK/cases/$1.out" 2>/dev/null | tr '\n' ' ')"
  fi
}
accepted isolated-pair "isolated API with a storefront that uses it: the run starts"
accepted isolated-pair-localhost "the same server named localhost and 127.0.0.1 counts as one"
refused shared-api "an API on its regular database is refused" "not a temporary file"
refused shared-api-env-claim "BUZZARD_ISOLATED=1 in the test process does not make a shared API acceptable" "not known to be isolated"
refused nonsense-api "an API that does not answer with a health report is refused" "not with a health report"
refused storefront-other-api "a storefront that talks to another API than the one under test is refused" "talks to http://127.0.0.1:4012"
refused storefront-shared-api "a storefront that talks to a shared API is refused although the API under test is isolated" "talks to http://127.0.0.1:4013"
refused api-down-storefront-up "a storefront whose API was not checked is refused when the API under test is down" "talks to http://127.0.0.1:4013"
accepted nothing-running "with no API and no storefront nothing can be written: the run starts"
refused override-remote "the override is not accepted for a server on another machine" "not accepted for a server on another machine"
accepted override-local "the explicit override for a local stack is honoured"
for name in part3-security final-audit production-safety; do
  for kind in shared nonsense down; do
    if [[ "$(result "script-$name-$kind")" == "script-$name-$kind status=78" ]] && grep -q "will not run against" "$WORK/cases/script-$name-$kind.out"; then
      ok "scripts/$name.mjs refuses an API that is $kind"
    else
      bad "scripts/$name.mjs refuses an API that is $kind" "$(result "script-$name-$kind")"
    fi
  done
done
for port in 4011 4012 4013 4014; do
  if grep -qx "writes-$port=0" "$WORK/cases/results" 2>/dev/null; then ok "stand-in API $port received nothing but health checks"; else bad "stand-in API $port received nothing but health checks" "$(grep "writes-$port" "$WORK/cases/results" 2>/dev/null)"; fi
done

echo "== real data =="
real_after="$(real_state)"
if [[ "$real_before" == "$real_after" ]]; then ok "server/data and data/ of this checkout are byte-identical before and after the self-test"; else bad "server/data and data/ of this checkout are byte-identical before and after the self-test"; fi

echo
echo "isolation self-test: $pass passed, $fail failed, $skip skipped"
if [[ $fail -gt 0 ]]; then
  cp -r "$WORK" "${WORK}.kept" 2>/dev/null && echo "details kept in ${WORK}.kept"
  exit 1
fi
exit 0
