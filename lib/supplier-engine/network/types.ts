export type SupplierConnectorEnvironment = "MOCK" | "SANDBOX" | "PRODUCTION";

export type SupplierAuthType = "API_KEY" | "BASIC_AUTH" | "OAUTH2" | "TOKEN" | "CUSTOM" | "NONE";

export interface SupplierHttpRequest {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  supplierId: string;
  operation: string;
  correlationId?: string;
  allowRedirects?: boolean;
}

export interface SupplierHttpResponse {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  correlationId: string;
  contentType?: string;
  truncated?: boolean;
}

export interface SupplierTransportError {
  code: string;
  message: string;
  httpStatus?: number;
  retryable?: boolean;
  correlationId?: string;
}

export interface SupplierTransport {
  request(req: SupplierHttpRequest): Promise<SupplierHttpResponse>;
}
