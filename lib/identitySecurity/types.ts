export interface IdentitySecurityOverview {
  users: number;
  verified: number;
  activeSessions: number;
  failedLogins24h: number;
  privacyRequests: number;
}

export interface IdentitySecurityAuditEvent {
  id: number;
  user_id: number | null;
  event_type: string;
  ip_hash: string;
  metadata_json: string | null;
  created_at: string;
}

export interface IdentitySessionRow {
  id: number;
  user_id: number;
  user_agent: string | null;
  expires_at: string;
  revoked: number;
  created_at: string;
}

export interface IdentityAccount {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  twofaEnabled: boolean;
  createdAt: string;
}

export interface IdentitySecurityStatus {
  version: string;
  enabled: boolean;
  accessTokenMinutes: number;
  refreshTokenDays: number;
  totals: {
    users: number;
    verified: number;
    activeSessions: number;
    failedLogins24h: number;
    privacyRequests: number;
    auditEvents: number;
    addresses: number;
  };
}
