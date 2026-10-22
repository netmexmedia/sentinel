import { inject, Injectable, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth-api.service';
import { SessionTokenManager } from './session-token-manager.service';
import { IdleService } from './idle.service';
import { AuthStore } from '../store/auth.store';
import { LoginPayload } from '../models/auth.model';
import { SENTINEL_CONFIG } from '../config/sentinel.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly tokenManager = inject(SessionTokenManager);
  private readonly idleService = inject(IdleService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(SENTINEL_CONFIG);

  constructor() {
    this.idleService.onTimeout$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.logout());
  }

  async login(credentials: LoginPayload): Promise<void> {
    const res = await firstValueFrom(this.api.login(credentials));
    this.tokenManager.setTokens(res.token, res.refresh_token);

    if (this.config.endpoints.me) {
      await this.fetchAndStoreCurrentUser();
    } else {
      this.tokenManager.syncUserToStore();
    }

    this.idleService.start();
    this.tokenManager.scheduleProactiveRefresh();

    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.config.routes.authenticatedDefault;
    await this.router.navigateByUrl(returnUrl);
  }

  async fetchAndStoreCurrentUser<T = unknown>(): Promise<T | null> {
    if (!this.config.endpoints.me) return null;
    const user = await firstValueFrom(this.api.getMe<T>());
    this.authStore.setUser(user as any);
    return user;
  }

  logout(): void {
    this.idleService.stop();
    this.tokenManager.forceLogout();
  }
}
