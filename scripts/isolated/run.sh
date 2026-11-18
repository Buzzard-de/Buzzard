#!/usr/bin/env bash
# Run a command with server/data replaced by a throwaway directory.
#
# The API keeps admin users, sessions, audit, security and automation records
# as JSON under server/data. Tests that log in or emit events write there. This
# wrapper bind-mounts an empty directory over server/data inside a private
# mount namespace, so the command sees synthetic data only and the real files
# are untouched. Nothing is mounted for other processes.
#
#   scripts/isolated/run.sh [--no-network] [--] <command> [args...]
#
#   --no-network   also detach from the network (loopback only), so the command
#                  cannot reach suppliers, carriers, payment or AI providers.
#
# Environment:
#   BUZZARD_ISOLATED_ROOT   reuse this directory instead of a new one under /tmp
#
# Exit status: the command's status, 90 if the real server/data changed while
# the command ran, 91-93 if isolation could not be established.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA="$REPO/server/data"
SELF="$REPO/scripts/isolated/run.sh"

usage() {
  sed -n '2,19p' "$SELF" | sed 's/^# \{0,1\}//'
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
  if [[ "${BUZZARD_ISOLATED_NET_OFF:-0}" == "1" ]]; then
    python3 - <<'PY' || { echo "[isolated] ABORT: could not bring up loopback" >&2; exit 93; }
import fcntl, socket, struct
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
flags = struct.unpack("16sh", fcntl.ioctl(s, 0x8913, struct.pack("16sh", b"lo", 0)))[1]
fcntl.ioctl(s, 0x8914, struct.pack("16sh", b"lo", flags | 1))
PY
  fi
  export BUZZARD_ISOLATED=1
  export BUZZARD_SALES_ENABLED=0
  export BUZZARD_BACKUP_DIR="${BUZZARD_BACKUP_DIR:-$ROOT/backups}"
  exec "$@"
fi

NET_OFF=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-network) NET_OFF=1; shift ;;
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
  (cd "$DATA" && find . -maxdepth 1 -type f -print0 | sort -z | xargs -0 -r sha256sum)
}

snapshot > "$ROOT/protected-before.sha256"
REAL_DB_INODE=""
if [[ -e "$DATA/buzzard.db" ]]; then
  REAL_DB_INODE="$(stat -c %d:%i "$DATA/buzzard.db")"
fi

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
count="$(wc -l < "$ROOT/protected-before.sha256")"
if cmp -s "$ROOT/protected-before.sha256" "$ROOT/protected-after.sha256"; then
  echo "[isolated] real server/data unchanged ($count files, SHA-256 before = after); root: $ROOT" >&2
else
  echo "[isolated] WARNING: real server/data changed while the command ran:" >&2
  diff "$ROOT/protected-before.sha256" "$ROOT/protected-after.sha256" | sed 's/^\([<>]\) [0-9a-f]\{52\}/\1 …/' >&2 || true
  if [[ $status -eq 0 ]]; then
    status=90
  fi
fi
exit "$status"
