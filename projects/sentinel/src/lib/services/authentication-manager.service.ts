import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationStore } from '../store/authentication.store';
import { AuthenticationHttpClient } from './authentication-http-client.service';
import { TokenLifecycleCoordinator } from './token-lifecycle-coordinator.service';
import { UserInactivityDetector } from './user-inactivity-detector.service';
import { AuthenticationEventDispatcher } from '../events/authentication-event-dispatcher.service';
import { SENTINEL_CONFIGURATION } from '../config/sentinel.config';
import { AuthenticationCredentials } from '../contracts/authentication-models.contract';
import { SentinelAuthenticationException } from '../contracts/authentication-exceptions.contract';

@Injectable()
export class AuthenticationManager {
  private readonly store = inject(AuthenticationStore);
  private readonly transport = inject(AuthenticationHttpClient);
  private readonly coordinator = inject(TokenLifecycleCoordinator);
  private readonly inactivityDetector = inject(UserInactivityDetector);
  private readonly dispatcher = inject(AuthenticationEventDispatcher);
  private readonly router = inject(Router);
  private readonly config = inject(SENTINEL_CONFIGURATION);

  constructor() {
    this.dispatcher.select('SESSION_TERMINATED').subscribe(() => this.revokeSession());
    this.dispatcher.select('INACTIVITY_TIMEOUT_REACHED').subscribe(() => this.revokeSession());
  }

  async authenticate(credentials: AuthenticationCredentials, redirectDestination?: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.transport.authenticate(credentials));
      this.store.setTokens(response.accessToken, response.refreshToken);

      this.dispatcher.dispatch({
        type: 'AUTHENTICATION_SUCCESS',
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      this.inactivityDetector.initializeMonitoring();
      this.coordinator.scheduleProactiveRenewal();

      const route = redirectDestination || this.config.navigationRoutes.authenticatedDefault;
      await this.router.navigateByUrl(route);
    } catch (err) {
      const ex = new SentinelAuthenticationException('Authentication rejected by upstream service', err);
      this.dispatcher.dispatch({ type: 'AUTHENTICATION_FAILURE', exception: ex });
      throw ex;
    }
  }

  async terminateSession(): Promise<void> {
    try {
      await firstValueFrom(this.transport.terminateSession());
    } finally {
      this.revokeSession();
    }
  }

  revokeSession(): void {
    this.inactivityDetector.terminateMonitoring();
    this.coordinator.cancelProactiveRenewal();
    this.store.reset();
    this.dispatcher.dispatch({ type: 'LOGOUT_COMPLETED' });
    this.router.navigateByUrl(this.config.navigationRoutes.login);
  }
}
