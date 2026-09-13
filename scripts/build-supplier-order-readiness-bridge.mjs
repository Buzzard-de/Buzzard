import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "lib/supplier-order-readiness/serverEntry.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(root, "server/lib/supplierOrderReadiness.bundle.cjs"),
  alias: {
    "@": root,
  },
  banner: {
    js: 'const __import_meta_url__=require("url").pathToFileURL(__filename).href;',
  },
  define: {
    "import.meta.url": "__import_meta_url__",
  },
  external: ["better-sqlite3"],
  plugins: [
    {
      name: "resolve-server-lib",
      setup(build) {
        build.onResolve({ filter: /server\/lib\/.*\.js$/ }, (args) => {
          const normalized = args.path.replace(/^(\.\.\/)+/, "");
          return { path: path.join(root, normalized) };
        });
      },
    },
  ],
});

console.log("Built server/lib/supplierOrderReadiness.bundle.cjs");
