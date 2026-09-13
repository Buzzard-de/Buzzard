const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
]);

const METADATA_IP = "169.254.169.254";

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

export function isBlockedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === METADATA_IP || host.startsWith("169.254.")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":") && (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
    return true;
  }
  return false;
}

export function validateSupplierEndpoint(url: string, allowedHosts: string[] = []): {
  allowed: boolean;
  reason?: string;
  hostname?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: "INVALID_URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { allowed: false, reason: "UNSUPPORTED_PROTOCOL", hostname: parsed.hostname };
  }

  const hostname = normalizeHost(parsed.hostname);
  if (isBlockedHost(hostname)) {
    return { allowed: false, reason: "BLOCKED_HOST", hostname };
  }

  if (allowedHosts.length > 0) {
    const normalizedAllowed = allowedHosts.map(normalizeHost);
    const hostAllowed = normalizedAllowed.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
    if (!hostAllowed) {
      return { allowed: false, reason: "NOT_IN_ALLOWLIST", hostname };
    }
  }

  return { allowed: true, hostname };
}

export function extractAllowedHosts(baseUrl?: string, extra: string[] = []): string[] {
  const hosts = new Set<string>();
  for (const entry of [baseUrl, ...extra].filter(Boolean) as string[]) {
    try {
      hosts.add(normalizeHost(new URL(entry).hostname));
    } catch {
      /* ignore invalid */
    }
  }
  return [...hosts];
}
