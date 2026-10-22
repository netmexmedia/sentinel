import { inject, Injectable } from '@angular/core';
import { HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { AuthStore } from '../store/auth.store';
import { RefreshTokenResponse, SentinelJwtPayload } from '../models/auth.model';
import { SENTINEL_CONFIG } from '../config/sentinel.config';
import { SENTINEL_TOKEN_STORAGE } from '../storage/token-storage';
import { AuthApi } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class SessionTokenManager {
  private readonly api = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly config = inject(SENTINEL_CONFIG);
  private readonly storage = inject(SENTINEL_TOKEN_STORAGE);

  private refreshTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private readonly refreshToken$ = new BehaviorSubject<string | null>(null);

  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.storage.getRefreshToken();
  }

  setTokens(access: string, refresh: string): void {
    this.storage.setTokens(access, refresh);
  }

  clear(): void {
    this.cancelScheduledRefresh();
    this.storage.clear();
  }

  decodeToken<T extends SentinelJwtPayload = SentinelJwtPayload>(token: string | null = this.getAccessToken()): T | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload) as T;
    } catch {
      return null;
    }
  }

  isAccessTokenValid(): boolean {
    const payload = this.decodeToken();
    if (!payload?.exp) return false;
    return payload.exp > Math.floor(Date.now() / 1000) + 10;
  }

  syncUserToStore(): void {
    if (!this.isAccessTokenValid()) {
      this.authStore.setUser(null);
      return;
    }

    if (this.authStore.user()) {
      return;
    }

    const payload = this.decodeToken<SentinelJwtPayload>();
    if (!payload) {
      this.authStore.setUser(null);
      return;
    }

    this.authStore.setUser(payload as any);
  }

  scheduleProactiveRefresh(): void {
    this.cancelScheduledRefresh();
    const payload = this.decodeToken();
    if (!payload?.exp) return;

    const delayMs = payload.exp * 1000 - Date.now() - this.config.skewBufferMs;
    if (delayMs <= 0) {
      this.refresh().subscribe({ error: () => this.forceLogout() });
      return;
    }

    this.refreshTimer = setTimeout(() => {
      this.refresh().subscribe({
        next: () => this.scheduleProactiveRefresh(),
        error: () => this.forceLogout(),
      });
    }, delayMs);
  }

  cancelScheduledRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  refresh(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.forceLogout();
      return throwError(() => new Error('[Sentinel] No refresh token available'));
    }

    return this.api.refreshToken(refreshToken).pipe(
      tap((res) => {
        this.setTokens(res.token, res.refresh_token);
        if (!this.authStore.user()) {
          this.syncUserToStore();
        }
      })
    );
  }

  handle401<T = unknown>(failedRequestFn: (token: string) => Observable<HttpEvent<T>>): Observable<HttpEvent<T>> {
    if (this.isRefreshing) {
      return this.refreshToken$.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => failedRequestFn(token))
      );
    }

    this.isRefreshing = true;
    this.refreshToken$.next(null);

    return this.refresh().pipe(
      tap((res) => {
        this.isRefreshing = false;
        this.refreshToken$.next(res.token);
        this.scheduleProactiveRefresh();
      }),
      switchMap((res) => failedRequestFn(res.token)),
      catchError((err) => {
        this.isRefreshing = false;
        this.refreshToken$.next(null);
        this.forceLogout();
        return throwError(() => err);
      })
    );
  }

  forceLogout(): void {
    this.clear();
    this.authStore.clear();
    const currentUrl = this.router.url;
    const isAlreadyAtLogin = currentUrl.startsWith(this.config.routes.login);

    if (!isAlreadyAtLogin && currentUrl !== '/') {
      this.router.navigate([this.config.routes.login], {
        queryParams: { returnUrl: currentUrl },
      });
    } else {
      this.router.navigate([this.config.routes.login]);
    }
  }
}
