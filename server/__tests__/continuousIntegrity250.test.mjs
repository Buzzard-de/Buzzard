import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

describe("plugin and auth public error keys batch", () => {
  it("runtime plugins no longer emit English Authentication/Admin/Internal error strings", () => {
    const files = walk(path.join(ROOT, "server/plugins"));
    const leaks = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      if (src.includes("Authentication required") || src.includes("Admin access required") || src.includes("Internal server error")) {
        leaks.push(path.relative(ROOT, file));
      }
    }
    expect(leaks).toEqual([]);
  });

  it("dbAuth and salesMode emit errorKey bodies", () => {
    const dbAuth = fs.readFileSync(path.join(ROOT, "server/lib/dbAuth.js"), "utf8");
    const sales = fs.readFileSync(path.join(ROOT, "server/lib/salesMode.js"), "utf8");
    expect(dbAuth).toMatch(/sendAuthRequired/);
    expect(dbAuth).toMatch(/sendAdminRequired/);
    expect(sales).toMatch(/errorKey: "sales_disabled"/);
    expect(sales).not.toMatch(/Online ordering is currently disabled/);
  });

  it("commerce guards use errorKey not English message", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/lib/commerce/commerceGuards.js"), "utf8");
    expect(src).not.toMatch(/message: "Authentication required"/);
    expect(src).not.toMatch(/Commercial commerce actions are blocked/);
    expect(src).toMatch(/errorKey: "auth_required"/);
    expect(src).toMatch(/errorKey: "sales_disabled"/);
  });

  it("OMS and identity errors are keys", () => {
    const oms = fs.readFileSync(path.join(ROOT, "server/lib/orderManagement.js"), "utf8");
    const ident = fs.readFileSync(path.join(ROOT, "server/lib/identitySecurity.js"), "utf8");
    expect(oms).toMatch(/order\.notFound/);
    expect(oms).not.toMatch(/Order not found/);
    expect(ident).toMatch(/auth\.invalidCredentials/);
    expect(ident).not.toMatch(/Invalid email or password/);
  });
});
