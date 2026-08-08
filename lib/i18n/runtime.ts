import type { BuzzardLocale } from "./types";

let runtimeLocale: BuzzardLocale = "de";

export function setRuntimeLocale(locale: BuzzardLocale): void {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): BuzzardLocale {
  return runtimeLocale;
}
