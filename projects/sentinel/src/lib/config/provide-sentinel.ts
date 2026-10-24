import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import {
  DEFAULT_SENTINEL_CONFIGURATION,
  SENTINEL_CONFIGURATION,
  SENTINEL_INACTIVITY_LIMIT_MS,
  SentinelConfigurationOptions,
  SentinelResolvedConfiguration,
} from './sentinel.config';
import {
  LocalStorageTokenRepository,
  SENTINEL_TOKEN_PERSISTENCE,
} from '../storage/token-persistence-repository';
import {
  StandardAuthorityResolverStrategy,
  CustomAuthorityResolverStrategy,
  SENTINEL_AUTHORITY_RESOLVER,
} from '../strategies/authority-resolver.strategy';
import { AuthenticationEventDispatcher } from '../events/authentication-event-dispatcher.service';
import { TokenLifecycleCoordinator } from '../services/token-lifecycle-coordinator.service';
import { UserInactivityDetector } from '../services/user-inactivity-detector.service';
import { AuthenticationManager } from '../services/authentication-manager.service';
import { AuthenticationHttpClient } from '../services/authentication-http-client.service';
import { AuthenticationStore } from '../store/authentication.store';

export function provideSentinel(options: SentinelConfigurationOptions): EnvironmentProviders {
  const accessKey =
    options.storageKeys?.accessToken ?? DEFAULT_SENTINEL_CONFIGURATION.storageKeys.accessToken;
  const refreshKey =
    options.storageKeys?.refreshToken ?? DEFAULT_SENTINEL_CONFIGURATION.storageKeys.refreshToken;

  const inactivityMs =
    options.sessionTiming?.inactivityLimitMs ??
    (options.sessionTiming?.inactivityLimitMinutes
      ? options.sessionTiming.inactivityLimitMinutes * 60 * 1000
      : DEFAULT_SENTINEL_CONFIGURATION.inactivityLimitMs);

  const renewalLeadTime =
    options.sessionTiming?.proactiveRenewalLeadTimeSeconds ??
    DEFAULT_SENTINEL_CONFIGURATION.proactiveRenewalLeadTimeSeconds;

  const resolvedConfiguration: SentinelResolvedConfiguration = {
    apiEndpointUrl: options.apiEndpointUrl.replace(/\/+$/, ''),
    endpointPaths: {
      ...DEFAULT_SENTINEL_CONFIGURATION.endpointPaths,
      ...options.endpointPaths,
    },
    storageKeys: {
      accessToken: accessKey,
      refreshToken: refreshKey,
    },
    navigationRoutes: {
      ...DEFAULT_SENTINEL_CONFIGURATION.navigationRoutes,
      ...options.navigationRoutes,
    },
    inactivityLimitMs: inactivityMs,
    proactiveRenewalLeadTimeSeconds: renewalLeadTime,
    headerFormatter:
      options.headerFormatter ?? DEFAULT_SENTINEL_CONFIGURATION.headerFormatter,
    tokenResponseMapper:
      options.tokenResponseMapper ?? DEFAULT_SENTINEL_CONFIGURATION.tokenResponseMapper,
  };

  return makeEnvironmentProviders([
    { provide: SENTINEL_CONFIGURATION, useValue: resolvedConfiguration },
    { provide: SENTINEL_INACTIVITY_LIMIT_MS, useValue: inactivityMs },
    {
      provide: SENTINEL_TOKEN_PERSISTENCE,
      useFactory: () => new LocalStorageTokenRepository(accessKey, refreshKey),
    },
    {
      provide: SENTINEL_AUTHORITY_RESOLVER,
      useFactory: () => {
        if (typeof options.authorityClaim === 'function') {
          return new CustomAuthorityResolverStrategy(options.authorityClaim);
        }
        if (options.authorityClaim) {
          const keys = Array.isArray(options.authorityClaim)
            ? options.authorityClaim
            : [options.authorityClaim];
          return new StandardAuthorityResolverStrategy(keys);
        }
        return new StandardAuthorityResolverStrategy();
      },
    },

    AuthenticationEventDispatcher,
    AuthenticationStore,
    AuthenticationHttpClient,
    TokenLifecycleCoordinator,
    UserInactivityDetector,
    AuthenticationManager,

    provideAppInitializer(() => {
      const coordinator = inject(TokenLifecycleCoordinator);
      const detector = inject(UserInactivityDetector);
      inject(AuthenticationManager); // Activate event-bus subscriptions

      if (coordinator.isSessionActive()) {
        detector.initializeMonitoring();
        coordinator.scheduleProactiveRenewal();
      }
    }),
  ]);
}
