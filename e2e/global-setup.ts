import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Admin and commerce specs log in, create carts and write security events.
 * Against the developer API that lands in the real server/data. The suite
 * therefore starts only when
 *
 *   1. the API under test says that its database and its JSON stores are
 *      throwaway storage, and
 *   2. the storefront under test sends its requests to that same API, not to
 *      another one (the developer API on port 3001, for example).
 *
 * Neither check writes anything: the first is one GET of /api/health, the
 * second loads the login page and intercepts the request the form would send,
 * which never leaves the browser.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function endpoint(url: string): { host: string; port: string; loopback: boolean } {
  const parsed = new URL(url);
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const loopback = LOOPBACK.has(parsed.hostname);
  // localhost and 127.0.0.1 name the same server.
  return { host: loopback ? "loopback" : parsed.hostname, port, loopback };
}

function sameServer(a: string, b: string): boolean {
  const left = endpoint(a);
  const right = endpoint(b);
  return left.host === right.host && left.port === right.port;
}

function refuse(target: string, problems: string[]): never {
  throw new Error(
    [
      `Playwright will not run against ${target}: ${problems.join("; ")}.`,
      "Run the suite on a private stack with synthetic data instead:",
      "  scripts/isolated/e2e.sh [--limiter on|off] [--host 127.0.0.1|localhost] [-- playwright arguments]",
      "BUZZARD_E2E_ALLOW_SHARED_STACK=1 lifts this for an API on this machine only, when writing test data to it is intended.",
    ].join("\n")
  );
}

/** Which API does the storefront talk to? Found out without letting a request through. */
async function apiUsedByStorefront(baseUrl: string): Promise<string | null | "unreachable"> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    let seen: string | null = null;
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (sameServer(url, baseUrl)) {
        if (new URL(url).pathname.startsWith("/api/") && route.request().method() !== "GET") {
          // The storefront has no API configured and posts to itself.
          seen = seen ?? new URL(url).origin;
          return route.abort();
        }
        return route.continue();
      }
      if (new URL(url).pathname.startsWith("/api/")) seen = seen ?? new URL(url).origin;
      // Nothing addressed to another server is sent.
      return route.abort();
    });
    const page = await context.newPage();
    try {
      await page.goto(new URL("/admin/login/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    } catch {
      return "unreachable";
    }
    const submit = page.locator("form.admin-login-card button[type=submit]");
    try {
      await submit.waitFor({ state: "visible", timeout: 30_000 });
      await page.fill("#email", "isolation-check@synthetic.invalid");
      await page.fill("#password", "not-a-real-password");
      await submit.click();
    } catch {
      return seen;
    }
    const deadline = Date.now() + 15_000;
    while (!seen && Date.now() < deadline) await page.waitForTimeout(100);
    return seen;
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(): Promise<void> {
  const api = (
    process.env.BUZZARD_API_URL ||
    process.env.NEXT_PUBLIC_BUZZARD_API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
  const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  if (process.env.BUZZARD_E2E_ALLOW_SHARED_STACK === "1") {
    if (!endpoint(api).loopback || !endpoint(baseUrl).loopback) {
      refuse(api, ["BUZZARD_E2E_ALLOW_SHARED_STACK=1 is not accepted for a server on another machine"]);
    }
    return;
  }

  let verified = false;
  let response: Response | null = null;
  try {
    response = await fetch(`${api}/api/health`, { headers: { Accept: "application/json" } });
  } catch {
    // No API at that address. Whether anything can still be written is decided by the storefront check below.
  }

  if (response) {
    let health: { database?: { path?: string }; adminData?: { isolated?: boolean } };
    try {
      health = await response.json();
    } catch {
      refuse(api, ["it answers, but not with a health report, so its storage cannot be checked"]);
    }

    const tmp = os.tmpdir() + path.sep;
    const dbPath = health.database?.path ? path.resolve(health.database.path) : "";
    const problems: string[] = [];
    if (!dbPath) {
      problems.push("it does not say where its database is");
    } else if (!dbPath.startsWith(tmp)) {
      problems.push(`its database is ${dbPath}, not a temporary file`);
    }
    // What the API itself reports counts; an environment variable of this process proves nothing about it.
    if (health.adminData?.isolated !== true) {
      problems.push("its admin sessions and security/audit logs are not known to be isolated");
    }
    if (problems.length > 0) refuse(api, problems);
    verified = true;
  }

  const used = await apiUsedByStorefront(baseUrl);
  if (used === "unreachable") {
    // No storefront: browser specs cannot reach any API through it.
    console.log(`[e2e-isolation] API ${api}: ${verified ? "throwaway storage" : "not running"}; storefront ${baseUrl}: not running`);
    return;
  }
  if (used === null) {
    refuse(baseUrl, ["it could not be determined which API its admin login talks to"]);
  }
  if (!sameServer(used, api)) {
    refuse(baseUrl, [`its admin login talks to ${used}, not to the API under test (${api})`]);
  }
  if (!verified) {
    refuse(baseUrl, [`its admin login talks to ${used}, which did not answer the storage check`]);
  }
  console.log(`[e2e-isolation] API ${api}: throwaway storage; storefront ${baseUrl}: sends its requests to ${used}`);
}
