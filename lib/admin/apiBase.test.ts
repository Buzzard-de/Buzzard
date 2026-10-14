import { afterEach, describe, expect, it } from "vitest";
import { adminApiBase, localDevelopmentApiBase } from "./apiBase";

const previousApi = process.env.NEXT_PUBLIC_BUZZARD_API_URL;
const previousNodeEnv = process.env.NODE_ENV;
const env = process.env as { NODE_ENV?: string };

afterEach(() => {
  if (previousApi === undefined) delete process.env.NEXT_PUBLIC_BUZZARD_API_URL;
  else process.env.NEXT_PUBLIC_BUZZARD_API_URL = previousApi;
  env.NODE_ENV = previousNodeEnv;
});

describe("adminApiBase", () => {
  it("uses the configured public API URL when present", () => {
    process.env.NEXT_PUBLIC_BUZZARD_API_URL = "http://127.0.0.1:3002/";
    env.NODE_ENV = "development";
    expect(adminApiBase()).toBe("http://127.0.0.1:3002");
  });

  it("fails closed in production without a configured API URL", () => {
    delete process.env.NEXT_PUBLIC_BUZZARD_API_URL;
    env.NODE_ENV = "production";
    expect(adminApiBase()).toBe("");
  });

  it("falls back to the loopback API on :3001 in development", () => {
    delete process.env.NEXT_PUBLIC_BUZZARD_API_URL;
    env.NODE_ENV = "development";
    expect(adminApiBase()).toBe("http://127.0.0.1:3001");
  });

  it("keeps localhost and 127.0.0.1 on the same hostname for CORS", () => {
    expect(localDevelopmentApiBase("localhost")).toBe("http://localhost:3001");
    expect(localDevelopmentApiBase("127.0.0.1")).toBe("http://127.0.0.1:3001");
  });
});
