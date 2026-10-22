import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionTokenManager } from '../services/session-token-manager.service';
import { SENTINEL_CONFIG } from '../config/sentinel.config';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenManager = inject(SessionTokenManager);
  const config = inject(SENTINEL_CONFIG);
  const token = tokenManager.getAccessToken();

  const isAuthRequest =
    req.url.includes(config.endpoints.login) ||
    req.url.includes(config.endpoints.refreshToken);

  if (token && !isAuthRequest) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req);
};
