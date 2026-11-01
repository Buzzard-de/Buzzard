import { evaluateBrowserConnect } from "./browserConnect";

export class BrowserConnectError extends Error {
  code: string;
  host: string;

  constructor(code: string, host: string) {
    super(code);
    this.name = "BrowserConnectError";
    this.code = code;
    this.host = host;
  }
}

export async function browserFetch(input: string, init?: RequestInit): Promise<Response> {
  const decision = evaluateBrowserConnect(input);
  if (!decision.allowed) {
    throw new BrowserConnectError(decision.code, decision.host);
  }
  return fetch(input, init);
}
