import { InjectionToken } from '@angular/core';
import { SentinelPersistenceException } from '../contracts/authentication-exceptions.contract';
import { decodeJwtPayload } from '../utils/jwt.util';

export interface TokenPersistenceRepository {
  readAccessToken(): string | null;
  readRefreshToken(): string | null;
  writeTokens(accessToken: string, refreshToken: string): void;
  purge(): void;
}

export class LocalStorageTokenRepository implements TokenPersistenceRepository {
  constructor(
    private readonly accessTokenKey: string = 'sentinel_access_token',
    private readonly refreshTokenKey: string = 'sentinel_refresh_token'
  ) {}

  readAccessToken(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(this.accessTokenKey) : null;
    } catch {
      return null;
    }
  }

  readRefreshToken(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(this.refreshTokenKey) : null;
    } catch {
      return null;
    }
  }

  writeTokens(accessToken: string, refreshToken: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.accessTokenKey, accessToken);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    } catch (cause) {
      throw new SentinelPersistenceException('Storage write operation rejected', cause);
    }
  }

  purge(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
    } catch {
      // Ignored during purge
    }
  }
}

export const SENTINEL_TOKEN_PERSISTENCE = new InjectionToken<TokenPersistenceRepository>(
  'SENTINEL_TOKEN_PERSISTENCE'
);

export type SentinelJwtDecoder = <T = Record<string, unknown>>(rawToken: string | null) => T | null;

export const SENTINEL_JWT_DECODER = new InjectionToken<SentinelJwtDecoder>(
  'SENTINEL_JWT_DECODER',
  {
    providedIn: 'root',
    factory: () => decodeJwtPayload,
  }
);
