import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const impl = require(path.join(root, "server/lib/security/smokeHttp.js"));

export const smokeFetch = impl.smokeFetch;
export const isProductionRuntime = impl.isProductionRuntime;
export const liveSmokeAllowed = impl.liveSmokeAllowed;
