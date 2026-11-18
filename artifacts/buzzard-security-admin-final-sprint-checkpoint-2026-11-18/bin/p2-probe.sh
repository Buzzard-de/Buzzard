#!/usr/bin/env bash
# Phase 2: anonymous access to store files that really exist under server/data (throwaway bind mount).
c() { curl -s -o /dev/null -m 5 --path-as-is -w '%{http_code}' "$@"; }
D="$ISO_ROOT/data"
node -e '
const c=JSON.parse(require("fs").readFileSync(process.env.CREDS,"utf8")).administrator;
fetch(process.env.API_URL+"/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(c)}).then(r=>r.json()).then(j=>{if(!j.token)process.exit(1)})'
for f in audit-log.json automation-events.json; do [[ -e "$D/$f" ]] || echo '[{"id":"decoy"}]' > "$D/$f"; done
echo decoy > "$D/buzzard.db"
echo "files present in server/data: $(ls "$D" | tr '\n' ' ')"
W=/tmp/buzzard-final-sprint/work
for f in admin-users.json admin-sessions.json security-log.json audit-log.json automation-events.json buzzard.db; do
  [[ -e "$W/server/data/$f" ]] || echo "MISSING decoy $f"
done
fail=0
for p in /server/data/admin-users.json /server/data/admin-sessions.json /server/data/security-log.json /server/data/audit-log.json \
  /server/data/automation-events.json /server/data/buzzard.db /server/data/admin-users.json.bak /data/buzzard_admin_users.seed.json \
  /public/../server/data/admin-users.json /public/%2e%2e/server/data/admin-sessions.json /public/..%2fserver%2fdata%2fsecurity-log.json \
  /public/%252e%252e/server/data/audit-log.json /public/..%5cserver%5cdata%5cautomation-events.json //server/data/buzzard.db \
  /logo/../server/data/admin-users.json /styles/..%2f..%2fserver/data/admin-users.json "$D/admin-users.json" "/public/$D/admin-users.json" \
  /server/lib/auth.js /package.json /render.yaml /.env.example /api/../server/data/admin-users.json /api/%2e%2e/server/data/admin-users.json; do
  code=$(c "$API_URL$p")
  printf "%-62s %s\n" "$p" "$code"
  [[ "$code" == 404 || "$code" == 400 ]] || fail=1
done
printf "%-62s %s\n" "/public/manifest.json (intended)" "$(c $API_URL/public/manifest.json)"
for r in /api/admin/audit /api/admin/security/events /api/admin/sessions /api/admin/automation/overview; do
  printf "%-62s %s\n" "$r (anonymous)" "$(c $API_URL$r)"
done
echo "RESULT: $([[ $fail == 0 ]] && echo ALL-BLOCKED || echo LEAK)"
exit $fail
