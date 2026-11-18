#!/usr/bin/env bash
node -e '
const creds = JSON.parse(require("fs").readFileSync(process.env.CREDS,"utf8"));
(async()=>{
  const a = creds.administrator, t = creds.read_only;
  const l = await (await fetch(process.env.API_URL+"/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:a.email,password:a.password})})).json();
  const r = await fetch(process.env.API_URL+"/api/admin/users/"+t.id+"/role",{method:"PATCH",headers:{"content-type":"application/json",authorization:"Bearer "+l.token},body:JSON.stringify({role:"staff"})});
  console.log(r.status, await r.text());
})();'
