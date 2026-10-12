import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve("desktop-bridge");
const portable = path.join(root, "portable");
const src = path.join(root, "src");
const stagedSrc = path.join(portable, "src");
const zipPath = path.join(root, "BuzzardDesktopBridge.zip");

fs.rmSync(stagedSrc, { recursive: true, force: true });
fs.cpSync(src, stagedSrc, { recursive: true });

if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

const zipCmd = process.platform === "win32" ? "powershell" : "zip";
if (zipCmd === "zip") {
  execFileSync("zip", ["-r", "-q", path.basename(zipPath), "START.cmd", "MASAUSTUNE-KOY.ps1", "OKU.txt", "src"], {
    cwd: portable,
  });
  fs.renameSync(path.join(portable, path.basename(zipPath)), zipPath);
} else {
  execFileSync(
    "powershell",
    ["-NoProfile", "-Command", `Compress-Archive -Path START.cmd,MASAUSTUNE-KOY.ps1,OKU.txt,src -DestinationPath '${zipPath}' -Force`],
    { cwd: portable }
  );
}

const stat = fs.statSync(zipPath);
if (stat.size < 1000) throw new Error("Zip is too small");
process.stdout.write(`Wrote ${zipPath} (${stat.size} bytes)\n`);
