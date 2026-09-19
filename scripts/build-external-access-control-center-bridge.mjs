import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "lib/external-access-control-center/serverEntry.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(root, "server/lib/externalAccessControlCenter.bundle.cjs"),
  alias: { "@": root },
  banner: { js: 'const __import_meta_url__=require("url").pathToFileURL(__filename).href;' },
  define: { "import.meta.url": "__import_meta_url__" },
  external: ["better-sqlite3", "./server/lib/production-access/persistentStore.js"],
});

console.log("Built server/lib/externalAccessControlCenter.bundle.cjs");
