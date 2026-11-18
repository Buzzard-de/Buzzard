import os from "node:os";
import path from "node:path";

/**
 * Admin and commerce specs log in, create carts and write security events.
 * Against the developer API that lands in the real server/data. Refuse to
 * start unless the API under test keeps its data in throwaway storage.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.BUZZARD_E2E_ALLOW_SHARED_STACK === "1") return;

  const api = (
    process.env.BUZZARD_API_URL ||
    process.env.NEXT_PUBLIC_BUZZARD_API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  let health: { database?: { path?: string }; adminData?: { isolated?: boolean } };
  try {
    const res = await fetch(`${api}/api/health`, { headers: { Accept: "application/json" } });
    health = await res.json();
  } catch {
    return; // No API: nothing can be written anywhere.
  }

  const tmp = os.tmpdir() + path.sep;
  const dbPath = health.database?.path ? path.resolve(health.database.path) : "";
  const problems: string[] = [];
  if (dbPath && !dbPath.startsWith(tmp)) {
    problems.push(`its database is ${dbPath}, not a temporary file`);
  }
  if (process.env.BUZZARD_ISOLATED !== "1" && health.adminData?.isolated !== true) {
    problems.push("its admin sessions and security/audit logs are not known to be isolated");
  }
  if (problems.length === 0) return;

  throw new Error(
    [
      `Playwright will not run against ${api}: ${problems.join("; ")}.`,
      "Run the suite on a private stack with synthetic data instead:",
      "  scripts/isolated/e2e.sh [--limiter on|off] [-- playwright arguments]",
      "Set BUZZARD_E2E_ALLOW_SHARED_STACK=1 only if writing test data to that API is intended.",
    ].join("\n")
  );
}
