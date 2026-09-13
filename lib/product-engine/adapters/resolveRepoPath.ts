import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Resolve a repo-relative file path regardless of process.cwd() (API may run from server/). */
export function resolveRepoFile(...segments: string[]): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const roots = [
    process.cwd(),
    path.join(process.cwd(), ".."),
    path.resolve(moduleDir, "../.."),
    path.resolve(moduleDir, "../../.."),
  ];

  for (const root of roots) {
    const candidate = path.join(root, ...segments);
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.join(process.cwd(), ...segments);
}
