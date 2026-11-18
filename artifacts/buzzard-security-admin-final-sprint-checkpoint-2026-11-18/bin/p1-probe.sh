#!/usr/bin/env bash
c() { curl -s -o /dev/null -m 5 -w '%{http_code}' "$@"; }
echo "health            $(c $API_URL/api/health)"
echo "bad-percent api   $(c "$API_URL/api/%E0%A4%A")"
sleep 0.5
echo "alive after bad%  $(kill -0 $API_PID 2>/dev/null && echo yes || echo NO-CRASHED)"
echo "health again      $(c $API_URL/api/health)"
echo "bad host header   $(c -H 'Host: a b' $API_URL/api/health)"
echo "alive             $(kill -0 $API_PID 2>/dev/null && echo yes || echo NO-CRASHED)"
echo "invalid json      $(c -X POST -H 'content-type: application/json' -d '{bad' $API_URL/api/admin/login)"
echo "cors null origin: $(curl -s -m 5 -D - -o /dev/null -H 'Origin: null' $API_URL/api/health | grep -i access-control-allow-origin | tr -d '\r')"
echo "cors evil origin: $(curl -s -m 5 -D - -o /dev/null -H 'Origin: https://evil.example' $API_URL/api/health | grep -ci access-control-allow-origin)"
tail -5 $ISO_ROOT/api.log | cut -c1-200
