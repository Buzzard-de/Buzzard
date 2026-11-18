#!/usr/bin/env bash
# Run a command with server/data replaced by a throwaway directory.
#
# The API keeps admin users, sessions, audit, security and automation records
# as JSON under server/data. Tests that log in or emit events write there. This
# wrapper bind-mounts an empty directory over server/data inside a private
# mount namespace, so the command sees synthetic data only and the real files
# are untouched. Nothing is mounted for other processes.
#
# The catalog files in data/ are read-only inside; the API works on copies
# (BUZZARD_CATALOG_DIR). Both directories are compared before and after.
#
#   scripts/isolated/run.sh [--allow-network] [--] <command> [args...]
#
# The command also runs in its own network namespace with loopback only: it
# cannot reach suppliers, carriers, payment or AI providers, and it cannot
# reach the developer stack on ports 3000/3001 either.
#
#   --allow-network   keep the host network (only for commands that need it)
#   --no-network      accepted for older callers; this is the default
#
# Environment:
#   BUZZARD_ISOLATED_ROOT   reuse this directory instead of a new one under /tmp
#
# Exit status: the command's status, 90 if the real server/data or data/
# changed while the command ran, 91-94 if isolation could not be established.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA="$REPO/server/data"
CATALOG="$REPO/data"
SELF="$REPO/scripts/isolated/run.sh"

usage() {
  sed -n '2,26p' "$SELF" | sed 's/^# \{0,1\}//'
}

if [[ "${BUZZARD_ISOLATED_STAGE:-}" == "inner" ]]; then
  unset BUZZARD_ISOLATED_STAGE
  ROOT="$BUZZARD_ISOLATED_ROOT"
  mount --bind "$ROOT/data" "$DATA"
  if [[ ! -e "$DATA/.buzzard-isolated" || "$(stat -c %d:%i "$DATA")" != "$(stat -c %d:%i "$ROOT/data")" ]]; then
    echo "[isolated] ABORT: server/data is not the throwaway directory" >&2
    exit 91
  fi
  if [[ -n "${BUZZARD_ISOLATED_REAL_DB_INODE:-}" && -e "$DATA/buzzard.db" \
        && "$(stat -c %d:%i "$DATA/buzzard.db")" == "$BUZZARD_ISOLATED_REAL_DB_INODE" ]]; then
    echo "[isolated] ABORT: the real buzzard.db is visible inside the namespace" >&2
    exit 92
  fi
  # The catalog files in data/ are part of the checkout. The API rewrites some of
  # them while it runs; here it gets working copies, and data/ itself cannot be
  # written at all, so that a writer that was overlooked fails instead of
  # changing the checkout.
  mkdir -p "$ROOT/catalog"
  if [[ -d "$CATALOG" ]]; then
    mount --bind "$CATALOG" "$CATALOG" && mount -o remount,bind,ro "$CATALOG" || true
    if (: > "$CATALOG/.buzzard-write-probe") 2>/dev/null; then
      rm -f "$CATALOG/.buzzard-write-probe"
      echo "[isolated] ABORT: data/ could not be made read-only" >&2
      exit 91
    fi
  fi
  export BUZZARD_CATALOG_DIR="$ROOT/catalog"
  if [[ "${BUZZARD_ISOLATED_NET_OFF:-0}" == "1" ]]; then
    python3 - <<'PY' || { echo "[isolated] ABORT: could not bring up loopback" >&2; exit 93; }
import fcntl, socket, struct
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
flags = struct.unpack("16sh", fcntl.ioctl(s, 0x8913, struct.pack("16sh", b"lo", 0)))[1]
fcntl.ioctl(s, 0x8914, struct.pack("16sh", b"lo", flags | 1))
PY
    # Proof, not assumption: an address outside this machine must be unreachable.
    python3 - <<'PY' || { echo "[isolated] ABORT: the network is still reachable" >&2; exit 94; }
import socket, sys
# Interfaces of this namespace (not /sys, which still shows the host's).
if [name for _, name in socket.if_nameindex()] != ["lo"]:
    sys.exit(1)
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(("192.0.2.1", 443))
    sys.exit(1)
except OSError as err:
    sys.exit(0 if err.errno in (101, 113) else 1)  # ENETUNREACH / EHOSTUNREACH
PY
    export BUZZARD_ISOLATED_NETWORK=loopback-only
  else
    export BUZZARD_ISOLATED_NETWORK=host
  fi
  export BUZZARD_ISOLATED=1
  export BUZZARD_SALES_ENABLED=0
  export BUZZARD_BACKUP_DIR="${BUZZARD_BACKUP_DIR:-$ROOT/backups}"
  exec "$@"
fi

NET_OFF=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-network) NET_OFF=1; shift ;;
    --allow-network) NET_OFF=0; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
if [[ $# -eq 0 ]]; then
  usage >&2
  exit 64
fi

ROOT="${BUZZARD_ISOLATED_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/buzzard-isolated.XXXXXX")}"
ROOT="$(realpath -m "$ROOT")"
case "$ROOT/" in
  "$REPO/"*)
    echo "[isolated] refusing an isolated root inside the repository: $ROOT" >&2
    exit 64
    ;;
esac
mkdir -p "$ROOT/data" "$ROOT/backups" "$DATA"
chmod 700 "$ROOT"
: > "$ROOT/data/.buzzard-isolated"

snapshot() {
  # Every file below server/data, with its mode; lock and temp files of a running server included.
  (cd "$DATA" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum)
  (cd "$DATA" && find . -printf '%m %y %p\n' | sort)
  # The catalog files of the checkout.
  if [[ -d "$CATALOG" ]]; then
    (cd "$CATALOG" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum | sed 's#  \./#  data/#')
  fi
}

snapshot > "$ROOT/protected-before.sha256"
REAL_DB_INODE=""
if [[ -e "$DATA/buzzard.db" ]]; then
  REAL_DB_INODE="$(stat -c %d:%i "$DATA/buzzard.db")"
fi

# If the machine runs out of memory, the kernel is to end this run first and
# leave everything else alone (for example a developer stack on 3000/3001).
# The setting is inherited by every process started below.
echo 1000 > /proc/self/oom_score_adj 2>/dev/null || true

UNSHARE=(unshare --user --map-root-user --mount)
if [[ "$NET_OFF" == "1" ]]; then
  UNSHARE+=(--net)
fi

set +e
BUZZARD_ISOLATED_STAGE=inner \
BUZZARD_ISOLATED_ROOT="$ROOT" \
BUZZARD_ISOLATED_NET_OFF="$NET_OFF" \
BUZZARD_ISOLATED_REAL_DB_INODE="$REAL_DB_INODE" \
  "${UNSHARE[@]}" -- "$SELF" "$@"
status=$?
set -e

snapshot > "$ROOT/protected-after.sha256"
count="$(grep -c '^[0-9a-f]\{64\}  \./' "$ROOT/protected-before.sha256" || true)"
catalog_count="$(grep -c '^[0-9a-f]\{64\}  data/' "$ROOT/protected-before.sha256" || true)"
if cmp -s "$ROOT/protected-before.sha256" "$ROOT/protected-after.sha256"; then
  echo "[isolated] real server/data unchanged ($count files, SHA-256 before = after); data/ unchanged ($catalog_count files); network: $([[ "$NET_OFF" == "1" ]] && echo loopback-only || echo host); root: $ROOT" >&2
else
  echo "[isolated] WARNING: real server/data or data/ changed while the command ran:" >&2
  diff "$ROOT/protected-before.sha256" "$ROOT/protected-after.sha256" | sed 's/^\([<>]\) [0-9a-f]\{52\}/\1 …/' >&2 || true
  if [[ $status -eq 0 ]]; then
    status=90
  fi
fi
exit "$status"
