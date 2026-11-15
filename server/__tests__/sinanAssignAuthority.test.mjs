import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const previousRuntime = process.env.PUSAT_RUNTIME_ENABLED;
const previousOrchDb = process.env.PUSAT_ORCH_DB;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-sinan-assign-"));
const safeFile = path.join(dir, "sinan-assign.sqlite");
const calls = { opened: [], writes: 0 };

function CountingDatabase(filename, options) {
  const file = String(filename);
  calls.opened.push(file);
  if (path.basename(file) === "buzzard.db" || file.includes(`${path.sep}server${path.sep}data${path.sep}`)) {
    throw new Error("commerce database must stay closed");
  }
  return new RealDatabase(filename, options);
}
require.cache[sqliteId] = { id: sqliteId, filename: sqliteId, loaded: true, exports: CountingDatabase };

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stub("../lib/db.js", {
  db: {
    name: path.join(dir, "commerce-name.sqlite"),
    exec() {
      calls.writes += 1;
      throw new Error("commerce database must stay closed");
    },
    prepare() {
      calls.writes += 1;
      throw new Error("commerce database must stay closed");
    },
  },
});
stub("../lib/productService.js", {});
stub("../lib/productSot.js", {
  isSotActive() {
    return false;
  },
  getStatus() {
    return { status: "OBSERVER", exclusive: false };
  },
});
stub("../lib/commerce/inventoryIntegration.js", {});
stub("../lib/commerce/pricingIntegration.js", {});
stub("../lib/pusat/idempotencyService.js", {
  createIdempotencyService() {
    throw new Error("idempotency must not open");
  },
});

const OTHER_AIS = [
  "sinan_bey",
  "esat_bey",
  "dogu_bey",
  "nedim_bey",
  "tuncay_bey",
  "amelia",
  "adrian",
  "mira",
  "leon",
  "stock_ai",
  "category_ai",
  "pricing_ai",
  "seo_ai",
  "banu_hanim",
  "sales_analysis_ai",
  "zeynep_hanim",
];

process.env.PUSAT_RUNTIME_ENABLED = "1";
process.env.PUSAT_ORCH_DB = safeFile;
const pusat = require("../lib/pusat/runtime.js");
const { createSinanDurable } = require("../lib/pusat/sinanDurable.js");
const { createSinanBeyAgent } = require("../lib/pusat/sinanBeyAgent.js");

function taskCount(file) {
  if (!fs.existsSync(file)) return 0;
  const handle = new RealDatabase(file, { readonly: true, fileMustExist: true });
  try {
    return handle.prepare(`SELECT COUNT(*) AS n FROM sinan_tasks`).get().n;
  } finally {
    handle.close();
  }
}

describe("SINAN_ASSIGN actor authorization", () => {
  it("lets verified Pusat assign and refuses every other caller before SQLite writes", () => {
    const assigned = pusat.executeReadOnly("SINAN_ASSIGN", { title: "from-pusat" }, {
      actorId: "pusat",
      correlationId: "corr-pusat",
    });
    expect(assigned.ok).toBe(true);
    expect(assigned.data.id).toMatch(/^stask_/);
    expect(assigned.data.fromId).toBe("pusat");
    expect(calls.opened).toEqual([safeFile]);
    expect(taskCount(safeFile)).toBe(1);

    const opened = calls.opened.length;
    const sinan = pusat.executeReadOnly("SINAN_ASSIGN", { title: "sinan-self", actorId: "pusat" }, {
      actorId: "sinan_bey",
      correlationId: "corr-sinan",
    });
    expect(sinan.ok).toBe(false);
    expect(sinan.code).toBe("PERMISSION_DENIED");
    expect(sinan.stored).toBe(false);

    for (const actorId of OTHER_AIS) {
      const denied = pusat.executeReadOnly("SINAN_ASSIGN", { title: actorId }, {
        actorId,
        correlationId: `corr-${actorId}`,
      });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.stored).toBe(false);
    }

    for (const actorId of [null, "", "   ", "not_an_agent", "Pusat"]) {
      const denied = pusat.executeReadOnly("SINAN_ASSIGN", { title: "fake", actorId: "pusat", fromId: "pusat" }, {
        actorId,
        correlationId: "corr-fake",
      });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.stored).toBe(false);
    }

    const payloadOnly = pusat.executeReadOnly("SINAN_ASSIGN", { title: "payload-pusat", actorId: "pusat" }, {
      correlationId: "corr-payload",
    });
    expect(payloadOnly.code).toBe("PERMISSION_DENIED");
    expect(calls.opened).toHaveLength(opened);
    expect(calls.writes).toBe(0);
    expect(taskCount(safeFile)).toBe(1);

    const durableWrites = { n: 0 };
    const mock = {
      exec() {
        durableWrites.n += 1;
      },
      prepare() {
        durableWrites.n += 1;
        return { run() { durableWrites.n += 1; }, get() { return null; }, all() { return []; } };
      },
    };
    const durable = createSinanDurable(mock, { ensureSchema: false });
    expect(durable.assignTask({ fromId: "pusat", title: "spoof" })).toMatchObject({
      ok: false,
      code: "PERMISSION_DENIED",
      stored: false,
    });
    expect(durableWrites.n).toBe(0);
    const agent = createSinanBeyAgent({ db: mock });
    const afterConstruct = durableWrites.n;
    expect(agent.assignFromPusat("spoof")).toMatchObject({ ok: false, code: "PERMISSION_DENIED", stored: false });
    expect(durableWrites.n).toBe(afterConstruct);
  });
});

afterAll(() => {
  if (previousRuntime === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
  else process.env.PUSAT_RUNTIME_ENABLED = previousRuntime;
  if (previousOrchDb === undefined) delete process.env.PUSAT_ORCH_DB;
  else process.env.PUSAT_ORCH_DB = previousOrchDb;
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
