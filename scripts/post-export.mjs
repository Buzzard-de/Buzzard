import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const redirectFiles = [
  path.join(rootDir, "data", "buzzard_redirects.json"),
  path.join(rootDir, "data", "category_legacy_redirects.json"),
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeRedirectPage(targetDir, targetUrl) {
  ensureDir(targetDir);
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <link rel="canonical" href="${targetUrl}" />
  <title>Weiterleitung…</title>
  <script>location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
  <p><a href="${targetUrl}">Weiter zum Ziel</a></p>
</body>
</html>`;
  fs.writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
}

if (!fs.existsSync(outDir)) {
  console.error("post-export: out/ directory not found");
  process.exit(1);
}

fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");
console.log("post-export: wrote .nojekyll");

const redirects = [];
for (const redirectsFile of redirectFiles) {
  if (!fs.existsSync(redirectsFile)) continue;
  redirects.push(...JSON.parse(fs.readFileSync(redirectsFile, "utf8")));
}

if (redirects.length > 0) {
  for (const rule of redirects) {
    const from = String(rule.from || "").replace(/^\/+|\/+$/g, "");
    const to = String(rule.to || "");
    if (!from || !to) continue;
    const targetDir = path.join(outDir, ...from.split("/"));
    writeRedirectPage(targetDir, to.startsWith("http") ? to : `${process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de"}${to}`);
    console.log(`post-export: redirect /${from}/ -> ${to}`);
  }
}

console.log("post-export: complete");
