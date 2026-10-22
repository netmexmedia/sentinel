/**
 * Standard RFC 7519 JWT Claims with an open index signature for custom claims.
 */
export interface SentinelJwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [claim: string]: unknown;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export type LoginResponse = AuthTokens;
export type RefreshTokenResponse = AuthTokens;
