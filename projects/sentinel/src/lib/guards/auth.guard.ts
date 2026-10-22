import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionTokenManager } from '../services/session-token-manager.service';
import { AuthStore } from '../store/auth.store';
import { SENTINEL_CONFIG } from '../config/sentinel.config';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenManager = inject(SessionTokenManager);
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const config = inject(SENTINEL_CONFIG);

  if (tokenManager.isAccessTokenValid()) {
    if (!authStore.isAuthenticated()) {
      tokenManager.syncUserToStore();
    }
    return true;
  }

  if (!!tokenManager.getRefreshToken()) {
    return true;
  }

  tokenManager.clear();
  return router.createUrlTree([config.routes.login], {
    queryParams: { returnUrl: state.url },
  });
};
