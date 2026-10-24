import { Observable } from 'rxjs';
import { SentinelException } from './authentication-exceptions.contract';

export type AuthenticationDomainEvent =
  | { type: 'AUTHENTICATION_SUCCESS'; accessToken: string; refreshToken?: string }
  | { type: 'AUTHENTICATION_FAILURE'; exception: SentinelException }
  | { type: 'TOKEN_REFRESH_SUCCESS'; accessToken: string; refreshToken?: string }
  | { type: 'SESSION_TERMINATED'; reason: SentinelException | string }
  | { type: 'INACTIVITY_TIMEOUT_REACHED' }
  | { type: 'LOGOUT_COMPLETED' };

export interface IAuthenticationEventDispatcher {
  dispatch(event: AuthenticationDomainEvent): void;
  select<T extends AuthenticationDomainEvent['type']>(
    type: T
  ): Observable<Extract<AuthenticationDomainEvent, { type: T }>>;
}
