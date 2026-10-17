import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("client and bridge public error keys", () => {
  it("lib clients throw errorKey rather than data.error or data.message", () => {
    const lib = path.join(ROOT, "lib");
    const files = [];
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) files.push(full);
      }
    };
    walk(lib);
    const leaks = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      if (/throw new Error\(\s*data\.error\s*\|\|/.test(src)) leaks.push(path.relative(ROOT, file));
      if (/data\.errorKey \|\| data\.message/.test(src)) leaks.push(path.relative(ROOT, file));
      if (/data\.message \|\| data\.errorKey/.test(src)) leaks.push(path.relative(ROOT, file));
    }
    expect(leaks).toEqual([]);
  });

  it("desktop-bridge HTTP catch returns errorKey not exception text", () => {
    const src = fs.readFileSync(path.join(ROOT, "desktop-bridge/src/http.js"), "utf8");
    expect(src).toMatch(/errorKey:\s*code/);
    expect(src).not.toMatch(/error:\s*error\.message/);
  });

  it("desktop-bridge watch errors omit exception message", () => {
    const src = fs.readFileSync(path.join(ROOT, "desktop-bridge/src/engine.js"), "utf8");
    expect(src).not.toMatch(/message:\s*error\.message/);
    expect(src).toMatch(/path\.basename\(file\)/);
  });

  it("intelligence snapshot collectHealth no longer assigns error.message", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "intelligence/buzzard_ki_gesamt/server/plugins/aiAutomationPlugin.js"),
      "utf8"
    );
    expect(src).not.toMatch(/error:\s*error\.message/);
    expect(src).toMatch(/errorKey:\s*"health\.probeFailed"/);
  });

  it("v32-v40 wire script cannot regenerate error.message catches", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts/wire-v32-v40-config.mjs"), "utf8");
    expect(src).not.toMatch(/error:\s*error\.message/);
    expect(src).toMatch(/health\.probeFailed/);
  });
});
