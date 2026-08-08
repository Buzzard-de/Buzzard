import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const sourceFile = path.join(rootDir, "data", "buzzard_redirects.json");
const targetFile = path.join(rootDir, "public", "_redirects");

if (!fs.existsSync(sourceFile)) process.exit(0);

const redirects = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const lines = redirects.map((rule) => {
  const from = String(rule.from || "").replace(/\/$/, "");
  const to = String(rule.to || "");
  const code = rule.permanent === false ? "302" : "301";
  return `${from} ${to} ${code}`;
});

fs.writeFileSync(targetFile, `${lines.join("\n")}\n`, "utf8");
console.log(`sync-redirects: wrote ${lines.length} rule(s) to public/_redirects`);
