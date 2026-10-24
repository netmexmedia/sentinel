import { InjectionToken } from '@angular/core';
import { AuthenticationTokenResponse } from '../contracts/authentication-models.contract';

export type TokenResponseMapperFn = (raw: Record<string, unknown>) => AuthenticationTokenResponse;

export interface SentinelEndpointPaths {
  login: string;
  refreshToken: string;
  logout?: string;
}

export interface SentinelStorageIdentifierKeys {
  accessToken: string;
  refreshToken: string;
}

export interface SentinelNavigationRoutes {
  login: string;
  authenticatedDefault: string;
  unauthorized?: string;
}

export interface SentinelSessionTimingOptions {
  inactivityLimitMinutes?: number;
  inactivityLimitMs?: number;
  proactiveRenewalLeadTimeSeconds?: number;
}

export interface SentinelConfigurationOptions {
  apiEndpointUrl: string;
  endpointPaths?: Partial<SentinelEndpointPaths>;
  storageKeys?: Partial<SentinelStorageIdentifierKeys>;
  navigationRoutes?: Partial<SentinelNavigationRoutes>;
  sessionTiming?: SentinelSessionTimingOptions;
  authorityClaim?: string | string[] | ((claims: Record<string, unknown>) => string[]);
  headerFormatter?: (token: string) => string;
  tokenResponseMapper?: TokenResponseMapperFn;
}

export interface SentinelResolvedConfiguration {
  apiEndpointUrl: string;
  endpointPaths: SentinelEndpointPaths;
  storageKeys: SentinelStorageIdentifierKeys;
  navigationRoutes: SentinelNavigationRoutes;
  inactivityLimitMs: number;
  proactiveRenewalLeadTimeSeconds: number;
  headerFormatter: (token: string) => string;
  tokenResponseMapper: TokenResponseMapperFn;
}

export const defaultTokenResponseMapper: TokenResponseMapperFn = (raw: Record<string, unknown>) => {
  const accessToken =
    (raw['accessToken'] as string) ||
    (raw['access_token'] as string) ||
    (raw['token'] as string);

  const refreshToken =
    (raw['refreshToken'] as string) ||
    (raw['refresh_token'] as string);

  return {
    ...raw,
    accessToken,
    refreshToken,
  };
};

export const DEFAULT_SENTINEL_CONFIGURATION: SentinelResolvedConfiguration = {
  apiEndpointUrl: '',
  endpointPaths: {
    login: '/login',
    refreshToken: '/token/refresh',
  },
  storageKeys: {
    accessToken: 'sentinel_access_token',
    refreshToken: 'sentinel_refresh_token',
  },
  navigationRoutes: {
    login: '/auth/login',
    authenticatedDefault: '/',
    unauthorized: '/',
  },
  inactivityLimitMs: 15 * 60 * 1000,
  proactiveRenewalLeadTimeSeconds: 30,
  headerFormatter: (token: string) => `Bearer ${token}`,
  tokenResponseMapper: defaultTokenResponseMapper,
};

export const SENTINEL_CONFIGURATION = new InjectionToken<SentinelResolvedConfiguration>(
  'SENTINEL_CONFIGURATION'
);
export const SENTINEL_INACTIVITY_LIMIT_MS = new InjectionToken<number>(
  'SENTINEL_INACTIVITY_LIMIT_MS'
);

export function defineSentinelConfiguration(
  config: SentinelConfigurationOptions
): SentinelConfigurationOptions {
  return config;
}
