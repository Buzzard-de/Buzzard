#!/usr/bin/env bash
set -euo pipefail
: "${APP_BASE_URL:?}"
curl --fail --silent --show-error "$APP_BASE_URL/api/system/health" >/dev/null
echo "HEALTH_OK"
