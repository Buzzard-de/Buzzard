import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The commerce SQLite the dry-run code must never create, grow or rewrite. */
export const PROTECTED_DB = fileURLToPath(new URL("../../data/buzzard.db", import.meta.url));

/**
 * Size and mtime of the protected database, or null when there is none: a
 * fresh checkout, CI, or an isolated run that hides server/data. "Absent
 * before and absent after" is the same guarantee as "unchanged".
 */
export function protectedDbState(file = PROTECTED_DB) {
  try {
    const stat = statSync(file);
    return { size: stat.size, mtimeMs: stat.mtimeMs };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
