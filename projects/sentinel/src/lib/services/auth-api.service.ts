import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SENTINEL_CONFIG } from '../config/sentinel.config';
import { LoginPayload, LoginResponse, RefreshTokenResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(SENTINEL_CONFIG);

  private getUrl(endpoint: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const path = endpoint.replace(/^\/+/, '');
    return base ? `${base}/${path}` : `/${path}`;
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.getUrl(this.config.endpoints.login), payload);
  }

  refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(this.getUrl(this.config.endpoints.refreshToken), {
      refresh_token: refreshToken,
    });
  }

  getMe<T = unknown>(): Observable<T> {
    if (!this.config.endpoints.me) {
      throw new Error('[Sentinel] "me" endpoint is not configured in SentinelConfig.');
    }
    return this.http.get<T>(this.getUrl(this.config.endpoints.me));
  }
}
