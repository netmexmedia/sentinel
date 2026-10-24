import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { AuthenticationStore } from '../store/authentication.store';
import { AuthenticationHttpClient } from './authentication-http-client.service';
import { AuthenticationEventDispatcher } from '../events/authentication-event-dispatcher.service';
import { SENTINEL_CONFIGURATION } from '../config/sentinel.config';
import { AuthenticationTokenResponse } from '../contracts/authentication-models.contract';
import { SentinelTokenRenewalException } from '../contracts/authentication-exceptions.contract';

@Injectable()
export class TokenLifecycleCoordinator {
  private readonly store = inject(AuthenticationStore);
  private readonly transport = inject(AuthenticationHttpClient);
  private readonly dispatcher = inject(AuthenticationEventDispatcher);
  private readonly config = inject(SENTINEL_CONFIGURATION);

  private inFlightRenewal$: Observable<AuthenticationTokenResponse> | null = null;
  private proactiveRenewalTimer: ReturnType<typeof setTimeout> | null = null;

  isSessionActive(): boolean {
    return this.store.isAuthenticated();
  }

  scheduleProactiveRenewal(): void {
    this.cancelProactiveRenewal();
    const claims = this.store.claims();
    if (!claims?.exp) return;

    const remainingDurationMs = claims.exp * 1000 - Date.now();
    const leadTimeMs = this.config.proactiveRenewalLeadTimeSeconds * 1000;
    const executionDelay = Math.max(0, remainingDurationMs - leadTimeMs);

    this.proactiveRenewalTimer = setTimeout(() => {
      this.renewAuthenticationTokens().subscribe({
        error: (cause) => {
          this.dispatcher.dispatch({
            type: 'SESSION_TERMINATED',
            reason: new SentinelTokenRenewalException('Proactive token renewal cycle failed', cause),
          });
        },
      });
    }, executionDelay);
  }

  cancelProactiveRenewal(): void {
    if (this.proactiveRenewalTimer) {
      clearTimeout(this.proactiveRenewalTimer);
      this.proactiveRenewalTimer = null;
    }
  }

  renewAuthenticationTokens(): Observable<AuthenticationTokenResponse> {
    if (this.inFlightRenewal$) {
      return this.inFlightRenewal$;
    }

    const refreshToken = this.store.refreshToken();
    if (!refreshToken) {
      const ex = new SentinelTokenRenewalException('No refresh token present in persistence layer');
      this.dispatcher.dispatch({ type: 'SESSION_TERMINATED', reason: ex });
      return throwError(() => ex);
    }

    this.inFlightRenewal$ = this.transport.renewToken(refreshToken).pipe(
      tap((response) => {
        this.store.setTokens(response.accessToken, response.refreshToken);
        this.dispatcher.dispatch({
          type: 'TOKEN_REFRESH_SUCCESS',
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        this.scheduleProactiveRenewal();
      }),
      catchError((networkErr) => {
        const ex = new SentinelTokenRenewalException(
          'Token renewal rejected by identity endpoint',
          networkErr
        );
        this.dispatcher.dispatch({ type: 'SESSION_TERMINATED', reason: ex });
        return throwError(() => ex);
      }),
      shareReplay(1),
      tap({ finalize: () => (this.inFlightRenewal$ = null) })
    );

    return this.inFlightRenewal$;
  }
}
