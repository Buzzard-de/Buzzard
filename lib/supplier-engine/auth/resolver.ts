import { resolveCredentials } from "../credentials";
import type { ConnectorConfig } from "../types";
import type { SupplierAuthType } from "../network/types";

export interface ResolvedAuthHeaders {
  headers: Record<string, string>;
  authType: SupplierAuthType;
  configured: boolean;
}

function mapConnectorAuthType(config?: ConnectorConfig): SupplierAuthType {
  const raw = String(config?.authentication || "none").toLowerCase();
  if (raw === "api_key") return "API_KEY";
  if (raw === "basic") return "BASIC_AUTH";
  if (raw === "bearer" || raw === "token") return "TOKEN";
  if (raw === "oauth2") return "OAUTH2";
  if (raw === "custom") return "CUSTOM";
  return "NONE";
}

export function resolveSupplierAuth(config: ConnectorConfig): ResolvedAuthHeaders {
  const authType = mapConnectorAuthType(config);
  const secretsRef = config.secretsRef;
  const creds = secretsRef ? resolveCredentials(secretsRef) : null;

  if (!creds) {
    return { headers: { ...(config.headers || {}) }, authType, configured: false };
  }

  const headers: Record<string, string> = { ...(config.headers || {}) };

  switch (authType) {
    case "API_KEY": {
      const headerName = creds.header || creds.headerName || "X-API-Key";
      const value = creds.apiKey || creds.key || creds.token;
      if (value) headers[headerName] = value;
      break;
    }
    case "TOKEN": {
      const value = creds.token || creds.accessToken || creds.bearer;
      if (value) headers.Authorization = value.startsWith("Bearer ") ? value : `Bearer ${value}`;
      break;
    }
    case "BASIC_AUTH": {
      const user = creds.username || creds.user || "";
      const pass = creds.password || creds.pass || "";
      if (user || pass) {
        headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
      }
      break;
    }
    case "OAUTH2": {
      const value = creds.accessToken || creds.token;
      if (value) headers.Authorization = `Bearer ${value}`;
      break;
    }
    case "CUSTOM": {
      for (const [key, value] of Object.entries(creds)) {
        if (!/password|secret|token|key/i.test(key)) continue;
        if (/header/i.test(key)) {
          const headerName = key.replace(/header/i, "").trim() || "Authorization";
          headers[headerName] = value;
        }
      }
      break;
    }
    default:
      break;
  }

  return { headers, authType, configured: Object.keys(creds).length > 0 };
}
