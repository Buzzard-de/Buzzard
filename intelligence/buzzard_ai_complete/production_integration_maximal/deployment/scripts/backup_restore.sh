#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_DB:?}"
: "${POSTGRES_USER:?}"
: "${BACKUP_FILE:?}"
if [[ "${1:-}" == "backup" ]]; then
  pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
elif [[ "${1:-}" == "restore" ]]; then
  pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$BACKUP_FILE"
else
  echo "usage: backup_restore.sh backup|restore"
  exit 2
fi
