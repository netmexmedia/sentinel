import { InjectionToken } from '@angular/core';

export interface SentinelTokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clear(): void;
}

export class LocalStorageTokenStorage implements SentinelTokenStorage {
  constructor(
    private readonly accessKey: string = 'sentinel_access_token',
    private readonly refreshKey: string = 'sentinel_refresh_token'
  ) {}

  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.accessKey);
  }

  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.refreshKey);
  }

  setTokens(access: string, refresh: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.accessKey, access);
    localStorage.setItem(this.refreshKey, refresh);
  }

  clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
  }
}

export const SENTINEL_TOKEN_STORAGE = new InjectionToken<SentinelTokenStorage>(
  'SENTINEL_TOKEN_STORAGE'
);
