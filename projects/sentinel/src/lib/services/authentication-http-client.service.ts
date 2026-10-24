import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SENTINEL_CONFIGURATION } from '../config/sentinel.config';
import {
  AuthenticationCredentials,
  AuthenticationTokenResponse,
} from '../contracts/authentication-models.contract';

@Injectable()
export class AuthenticationHttpClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(SENTINEL_CONFIGURATION);

  authenticate(credentials: AuthenticationCredentials): Observable<AuthenticationTokenResponse> {
    return this.http
      .post<Record<string, unknown>>(
        `${this.config.apiEndpointUrl}${this.config.endpointPaths.login}`,
        credentials
      )
      .pipe(
        // Map whatever the backend sends into { accessToken, refreshToken }
        map((rawResponse) => {
          if (this.config.tokenResponseMapper) {
            return this.config.tokenResponseMapper(rawResponse);
          }
          // Built-in fallback
          return {
            accessToken: (rawResponse['token'] || rawResponse['accessToken'] || rawResponse['access_token']) as string,
            refreshToken: (rawResponse['refresh_token'] || rawResponse['refreshToken']) as string,
          };
        })
      );
  }

  renewToken(refreshToken: string): Observable<AuthenticationTokenResponse> {
    return this.http
      .post<Record<string, unknown>>(
        `${this.config.apiEndpointUrl}${this.config.endpointPaths.refreshToken}`,
        { refreshToken, refresh_token: refreshToken }
      )
      .pipe(
        map((rawResponse) => {
          if (this.config.tokenResponseMapper) {
            return this.config.tokenResponseMapper(rawResponse);
          }
          return {
            accessToken: (rawResponse['token'] || rawResponse['accessToken'] || rawResponse['access_token']) as string,
            refreshToken: (rawResponse['refresh_token'] || rawResponse['refreshToken']) as string,
          };
        })
      );
  }

  terminateSession(): Observable<void> {
    const logoutPath = this.config.endpointPaths.logout;
    if (!logoutPath) return new Observable((sub) => (sub.next(), sub.complete()));
    return this.http.post<void>(`${this.config.apiEndpointUrl}${logoutPath}`, {});
  }
}
