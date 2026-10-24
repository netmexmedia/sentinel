export interface SentinelJwtClaims {
  sub?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  roles?: string[];
  role?: string;
  authorities?: string[];
  [key: string]: unknown;
}

export interface AuthenticationCredentials {
  [key: string]: unknown;
}

export interface AuthenticationTokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  [key: string]: unknown;
}
