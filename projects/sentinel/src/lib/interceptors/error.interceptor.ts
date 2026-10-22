import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionTokenManager } from '../services/session-token-manager.service';
import { SENTINEL_CONFIG } from '../config/sentinel.config';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { jwtInterceptor } from './jwt.interceptor';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenManager = inject(SessionTokenManager);
  const config = inject(SENTINEL_CONFIG);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isAuthRequest =
          req.url.includes(config.endpoints.login) ||
          req.url.includes(config.endpoints.refreshToken);

        if (isAuthRequest) {
          tokenManager.forceLogout();
          return throwError(() => error);
        }

        return tokenManager.handle401((token) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
        );
      }
      return throwError(() => error);
    })
  );
};

export const withSentinelInterceptors = () => [jwtInterceptor, errorInterceptor];
