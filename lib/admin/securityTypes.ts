export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  success: boolean;
  ip: string | null;
  path: string | null;
  userId: string | null;
  email: string | null;
  role: string | null;
  detail: Record<string, unknown> | null;
}

export interface SecurityOverview {
  windowHours: number;
  totalEvents24h: number;
  failedLogins24h: number;
  adminFailures24h: number;
  rateLimited24h: number;
  successfulAdminLogins24h: number;
  lockoutsActive: number;
}

export interface LockoutEntry {
  key: string;
  failures: number;
  lockedUntil: string | null;
  locked: boolean;
  lastFailure: string | null;
}

export interface AdminTwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
}

export interface AdminLoginResult {
  token?: string;
  user: import("./types").AdminUser;
  requires2FA?: boolean;
  challengeToken?: string;
}
