import { EnvironmentProviders, makeEnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  DEFAULT_SENTINEL_CONFIG,
  SENTINEL_CONFIG,
  SentinelConfig,
  SentinelResolvedConfig,
} from './sentinel.config';
import { LocalStorageTokenStorage, SENTINEL_TOKEN_STORAGE } from '../storage/token-storage';
import { SessionTokenManager } from '../services/session-token-manager.service';
import { IdleService } from '../services/idle.service';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthApi } from '../services/auth-api.service';
import { AuthStore } from '../store/auth.store';

export function provideSentinel(userConfig: SentinelConfig): EnvironmentProviders {
  const mergedConfig: SentinelResolvedConfig = {
    ...DEFAULT_SENTINEL_CONFIG,
    ...userConfig,
    endpoints: {
      ...DEFAULT_SENTINEL_CONFIG.endpoints,
      ...userConfig.endpoints,
    },
    storageKeys: {
      ...DEFAULT_SENTINEL_CONFIG.storageKeys,
      ...userConfig.storageKeys,
    },
    routes: {
      ...DEFAULT_SENTINEL_CONFIG.routes,
      ...userConfig.routes,
    },
  };

  return makeEnvironmentProviders([
    { provide: SENTINEL_CONFIG, useValue: mergedConfig },
    {
      provide: SENTINEL_TOKEN_STORAGE,
      useFactory: () =>
        new LocalStorageTokenStorage(
          mergedConfig.storageKeys.accessToken,
          mergedConfig.storageKeys.refreshToken
        ),
    },
    AuthStore,
    AuthApi,
    SessionTokenManager,
    IdleService,
    AuthService,
    provideHttpClient(
      withInterceptors([jwtInterceptor, errorInterceptor])
    ),
    provideAppInitializer(() => {
      const tokenManager = inject(SessionTokenManager);
      const idleService = inject(IdleService);

      if (tokenManager.isAccessTokenValid()) {
        tokenManager.syncUserToStore();
        idleService.start();
        tokenManager.scheduleProactiveRefresh();
      }
    }),
  ]);
}
