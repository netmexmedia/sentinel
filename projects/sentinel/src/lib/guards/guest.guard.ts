import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionTokenManager } from '../services/session-token-manager.service';
import { AuthStore } from '../store/auth.store';
import { SENTINEL_CONFIG } from '../config/sentinel.config';

export const guestGuard: CanActivateFn = () => {
  const tokenManager = inject(SessionTokenManager);
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const config = inject(SENTINEL_CONFIG);

  const hasValidAccess = tokenManager.isAccessTokenValid();
  const hasRefresh = !!tokenManager.getRefreshToken();

  if (hasValidAccess || hasRefresh) {
    if (hasValidAccess && !authStore.isAuthenticated()) {
      tokenManager.syncUserToStore();
    }
    return router.createUrlTree([config.routes.authenticatedDefault]);
  }

  return true;
};
