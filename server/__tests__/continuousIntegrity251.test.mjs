import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const LIB = path.resolve(import.meta.dirname, "../lib");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

describe("second English error-key batch", () => {
  it("server/lib return errors do not use Title Case prose", () => {
    const leaks = [];
    for (const file of walk(LIB)) {
      const src = fs.readFileSync(file, "utf8");
      const matches = src.match(/[{,]\s*error:\s*"[A-Z][^"]*"/g) || [];
      const spaced = src.match(/[{,]\s*error:\s*"[^"]* [^"]*"/g) || [];
      if (matches.length || spaced.length) {
        leaks.push(`${path.relative(LIB, file)}: ${[...matches, ...spaced].join(" | ")}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("taxonomy/menu plugins use errorKey not error for known keys", () => {
    const tax = fs.readFileSync(path.join(LIB, "../plugins/masterTaxonomyPlugin.js"), "utf8");
    const menu = fs.readFileSync(path.join(LIB, "../plugins/smartMenu48Plugin.js"), "utf8");
    expect(tax).toMatch(/errorKey:\s*"category_not_found"/);
    expect(tax).not.toMatch(/error:\s*"category_not_found"/);
    expect(menu).toMatch(/errorKey:\s*"query_required"/);
  });
});
