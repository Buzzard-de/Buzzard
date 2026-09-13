import { randomUUID } from "crypto";
import type { SupplierHttpRequest, SupplierHttpResponse, SupplierTransport } from "./types";

export interface MockTransportScenario {
  status: number;
  body?: string;
  headers?: Record<string, string>;
  delayMs?: number;
  timeout?: boolean;
  redirectUrl?: string;
}

const globalScenarios = new Map<string, MockTransportScenario>();
const defaultScenario: MockTransportScenario = { status: 200, body: '{"ok":true}' };

export class MockSupplierTransport implements SupplierTransport {
  private scenarios: Map<string, MockTransportScenario>;

  constructor(scenarios: Record<string, MockTransportScenario> = {}) {
    this.scenarios = new Map(Object.entries(scenarios));
  }

  async request(req: SupplierHttpRequest): Promise<SupplierHttpResponse> {
    const key = `${req.method || "GET"} ${req.url}`;
    const urlWithoutQuery = req.url.split("?")[0];
    const keyWithoutQuery = `${req.method || "GET"} ${urlWithoutQuery}`;
    const scenario =
      this.scenarios.get(key) ||
      this.scenarios.get(keyWithoutQuery) ||
      this.scenarios.get(req.url) ||
      globalScenarios.get(key) ||
      globalScenarios.get(keyWithoutQuery) ||
      globalScenarios.get(req.url) ||
      defaultScenario;

    const correlationId = req.correlationId || randomUUID();
    const started = Date.now();

    if (scenario.delayMs) {
      await new Promise((r) => setTimeout(r, scenario.delayMs));
    }

    if (scenario.timeout) {
      await new Promise((r) => setTimeout(r, (req.timeoutMs ?? 100) + 50));
      const err = new Error("TIMEOUT") as Error & { code: string; retryable: boolean };
      err.code = "TIMEOUT";
      err.retryable = true;
      throw err;
    }

    if (scenario.redirectUrl) {
      const err = new Error("REDIRECT") as Error & { code: string; redirectUrl: string };
      err.code = "REDIRECT";
      err.redirectUrl = scenario.redirectUrl;
      throw err;
    }

    const body = scenario.body ?? "";
    const headers = { "content-type": "application/json", ...(scenario.headers || {}) };

    return {
      ok: scenario.status >= 200 && scenario.status < 300,
      status: scenario.status,
      headers,
      body,
      durationMs: Date.now() - started,
      correlationId,
      contentType: headers["content-type"],
    };
  }
}

export function setMockTransportScenario(url: string, scenario: MockTransportScenario, method = "GET"): void {
  globalScenarios.set(`${method} ${url}`, scenario);
}

export function resetMockTransportScenarios(): void {
  globalScenarios.clear();
}

export function buildMockTransportFixtures(): Record<string, MockTransportScenario> {
  const base = "https://supplier-mock.example/api";
  return {
    [`GET ${base}/health`]: { status: 200, body: '{"status":"ok"}' },
    [`GET ${base}/products`]: {
      status: 200,
      body: JSON.stringify({ products: [{ supplierSku: "MOCK-1", name: "Mock Product" }] }),
    },
    [`GET ${base}/auth-fail`]: { status: 401, body: '{"error":"unauthorized"}' },
    [`GET ${base}/forbidden`]: { status: 403, body: '{"error":"forbidden"}' },
    [`GET ${base}/not-found`]: { status: 404, body: '{"error":"not found"}' },
    [`GET ${base}/rate-limit`]: { status: 429, body: '{"error":"rate limited"}', headers: { "retry-after": "1" } },
    [`GET ${base}/server-error`]: { status: 500, body: '{"error":"internal"}' },
    [`GET ${base}/bad-gateway`]: { status: 502, body: '{"error":"bad gateway"}' },
    [`GET ${base}/unavailable`]: { status: 503, body: '{"error":"unavailable"}' },
    [`GET ${base}/malformed`]: { status: 200, body: "{not-json" },
    [`GET ${base}/oversized`]: { status: 200, body: "x".repeat(6 * 1024 * 1024) },
    [`GET ${base}/timeout`]: { status: 200, timeout: true },
    [`GET ${base}/redirect`]: { status: 302, redirectUrl: "http://127.0.0.1/admin" },
  };
}
