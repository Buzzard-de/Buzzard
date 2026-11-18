#!/usr/bin/env bash
TOKEN=$(node -e '
const c=JSON.parse(require("fs").readFileSync(process.env.CREDS,"utf8"));
const a=(c.accounts||c).administrator||Object.values(c.accounts||c)[0];
fetch(process.env.API_URL+"/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:a.email,password:a.password})}).then(r=>r.json()).then(j=>process.stdout.write(j.token||""))')
curl -s -D- -o /tmp/p9dbg.body -X POST "$API_URL/api/admin/automation/schedules" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}' | grep -iE "HTTP|x-request-id"
cut -c1-200 /tmp/p9dbg.body; echo
node -e '
const fs=require("fs");const d=process.env.ISO_ROOT;
const find=(dir)=>{for(const n of fs.readdirSync(dir)){const p=dir+"/"+n;if(n==="audit-log.json")return p;if(fs.statSync(p).isDirectory()&&n!=="node_modules"){const r=find(p);if(r)return r}}};
const f=find(d);console.log(f?JSON.parse(fs.readFileSync(f,"utf8")).map(e=>[e.action,e.result,e.requestId].join(" | ")).join("\n"):"no audit file")'
