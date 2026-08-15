#!/usr/bin/env bash
set -euo pipefail
: "${APP_DOMAIN:?}"
getent hosts "$APP_DOMAIN" >/dev/null
curl --fail --silent --show-error "https://${APP_DOMAIN}/" >/dev/null
echo "DNS_SSL_OK"
