// Times GET routes on the isolated API per role (status and milliseconds).
import fs from "node:fs";
const api = process.env.BUZZARD_API_URL;
const accounts = JSON.parse(fs.readFileSync(process.env.BUZZARD_SYNTHETIC_ADMINS, "utf8"));
const roles = (process.env.P11_ROLES || "administrator,read_only").split(",");
for (const role of roles) {
  const login = await fetch(`${api}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accounts[role]) });
  const token = (await login.json()).token;
  for (const route of process.argv.slice(2)) {
    const started = Date.now();
    try {
      const res = await fetch(`${api}${route}`, { headers: { Authorization: `Bearer ${token}`, Origin: "http://127.0.0.1:3010" }, signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      console.log(role.padEnd(14), String(res.status).padEnd(4), String(Date.now() - started).padStart(6), "ms", String(text.length).padStart(7), "bytes", route);
    } catch (error) {
      console.log(role.padEnd(14), "ERR ", String(Date.now() - started).padStart(6), "ms", error.name, route);
    }
  }
}
