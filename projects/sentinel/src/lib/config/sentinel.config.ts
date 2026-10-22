import { InjectionToken } from '@angular/core';

export interface SentinelEndpoints {
  login: string;
  refreshToken: string;
  me?: string;
}

export interface SentinelStorageKeys {
  accessToken: string;
  refreshToken: string;
}

export interface SentinelRoutes {
  login: string;
  authenticatedDefault: string;
}

export interface SentinelConfig {
  baseUrl: string;
  endpoints?: Partial<SentinelEndpoints>;
  storageKeys?: Partial<SentinelStorageKeys>;
  routes?: Partial<SentinelRoutes>;
  idleTimeoutMs?: number;
  skewBufferMs?: number;
}

export interface SentinelResolvedConfig {
  baseUrl: string;
  endpoints: SentinelEndpoints;
  storageKeys: SentinelStorageKeys;
  routes: SentinelRoutes;
  idleTimeoutMs: number;
  skewBufferMs: number;
}

export const DEFAULT_SENTINEL_CONFIG: SentinelResolvedConfig = {
  baseUrl: '',
  endpoints: {
    login: '/login',
    refreshToken: '/token/refresh',
    me: '/me',
  },
  storageKeys: {
    accessToken: 'sentinel_access_token',
    refreshToken: 'sentinel_refresh_token',
  },
  routes: {
    login: '/auth/login',
    authenticatedDefault: '/',
  },
  idleTimeoutMs: 15 * 60 * 1000,
  skewBufferMs: 60 * 1000,
};

export const SENTINEL_CONFIG = new InjectionToken<SentinelResolvedConfig>('SENTINEL_CONFIG');
