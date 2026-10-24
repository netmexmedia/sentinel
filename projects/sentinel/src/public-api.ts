// 1. Exceptions
export type { SentinelExceptionCode } from './lib/contracts/authentication-exceptions.contract';
export {
  SentinelException,
  SentinelMalformedTokenException,
  SentinelTokenRenewalException,
  SentinelPersistenceException,
  SentinelAuthenticationException,
  SentinelRefreshTokenException
} from './lib/contracts/authentication-exceptions.contract';

// 2. Contracts & Models
export type {
  IAuthenticationStateReader,
  IAuthenticationStateWriter,
} from './lib/contracts/authentication-state.contract';
export type {
  IAuthenticationEventDispatcher,
  AuthenticationDomainEvent,
} from './lib/contracts/authentication-events.contract';
export type {
  SentinelJwtClaims,
  AuthenticationCredentials,
  AuthenticationTokenResponse,
} from './lib/contracts/authentication-models.contract';

// 3. Configuration & Providers
export type {
  SentinelEndpointPaths,
  SentinelStorageIdentifierKeys,
  SentinelNavigationRoutes,
  SentinelSessionTimingOptions,
  SentinelConfigurationOptions,
  SentinelResolvedConfiguration,
} from './lib/config/sentinel.config';
export {
  DEFAULT_SENTINEL_CONFIGURATION,
  SENTINEL_CONFIGURATION,
  SENTINEL_INACTIVITY_LIMIT_MS,
  defineSentinelConfiguration,
} from './lib/config/sentinel.config';
export { provideSentinel } from './lib/config/provide-sentinel';

// 4. Persistence & Strategies
export type {
  TokenPersistenceRepository,
  SentinelJwtDecoder,
} from './lib/storage/token-persistence-repository';
export {
  LocalStorageTokenRepository,
  SENTINEL_TOKEN_PERSISTENCE,
  SENTINEL_JWT_DECODER,
} from './lib/storage/token-persistence-repository';
export type { AuthorityResolverStrategy } from './lib/strategies/authority-resolver.strategy';
export {
  StandardAuthorityResolverStrategy,
  CustomAuthorityResolverStrategy,
  SENTINEL_AUTHORITY_RESOLVER,
} from './lib/strategies/authority-resolver.strategy';

// 5. Store & Core Services
export { AuthenticationStore } from './lib/store/authentication.store';
export { AuthenticationManager } from './lib/services/authentication-manager.service';
export { AuthenticationHttpClient } from './lib/services/authentication-http-client.service';
export { TokenLifecycleCoordinator } from './lib/services/token-lifecycle-coordinator.service';
export { UserInactivityDetector } from './lib/services/user-inactivity-detector.service';
export { AuthenticationEventDispatcher } from './lib/events/authentication-event-dispatcher.service';

// 6. Network & Navigation Guards
export { authenticationBearerInterceptor } from './lib/interceptors/authentication-bearer.interceptor';
export {
  authenticatedRouteGuard,
  anonymousRouteGuard,
  authorityRouteGuard,
} from './lib/guards/routing.guards';

// 7. Utilities
export { decodeJwtPayload } from './lib/utils/jwt.util';
