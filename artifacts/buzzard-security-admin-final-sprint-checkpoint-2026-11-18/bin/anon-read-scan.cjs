// Fetch every route an anonymous caller can read and look for values that should not be public.
const fs = require("fs");
const rows = JSON.parse(fs.readFileSync("/tmp/buzzard-final-sprint/sweep-p5.json", "utf8"));
const api = process.env.API_URL;
const root = process.env.ISO_ROOT;
const patterns = [
  ["filesystem path", new RegExp(`${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|/tmp/buzzard|/workspace|/var/data|/home/`, "i")],
  ["secret-like key with value", /"(?:[a-z_]*(?:secret|password|passwd|token|api_?key|private_?key)[a-z_]*)"\s*:\s*"[^"]{6,}"/i],
  ["hash", /scrypt:|\$2[aby]\$|[a-f0-9]{64}/i],
  ["e-mail address", /[a-z0-9._%+-]+@(?!example\.|buzzard24\.de|buzzard\.de)[a-z0-9.-]+\.[a-z]{2,}/i],
  ["stack trace", /\n\s+at .+\(.+:\d+:\d+\)/],
  ["env dump", /"(?:JWT_SECRET|ADMIN_PASSWORD|STRIPE_SECRET_KEY|DATABASE_URL)"/],
];
(async () => {
  const open = rows.filter((r) => r.method === "GET" && r.anon.status === 200);
  const findings = [];
  for (const r of open) {
    const url = api + r.path.split("/").map((s) => (s.startsWith(":") ? "x1" : s)).join("/");
    const text = await (await fetch(url)).text();
    for (const [name, re] of patterns) {
      const m = text.match(re);
      if (m) findings.push(`${r.path}  [${name}]  …${text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, " ")}…`);
    }
  }
  console.log("anonymous GET 200 routes scanned:", open.length, "| findings:", findings.length);
  for (const f of findings) console.log("  ", f.slice(0, 260));
})();
