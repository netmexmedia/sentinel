import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationStore } from '../store/authentication.store';
import { SENTINEL_CONFIGURATION } from '../config/sentinel.config';

export const authenticatedRouteGuard: CanActivateFn = (_, state) => {
  const store = inject(AuthenticationStore);
  const router = inject(Router);
  const config = inject(SENTINEL_CONFIGURATION);

  if (store.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([config.navigationRoutes.login], {
    queryParams: { returnUrl: state.url },
  });
};

export const anonymousRouteGuard: CanActivateFn = () => {
  const store = inject(AuthenticationStore);
  const router = inject(Router);
  const config = inject(SENTINEL_CONFIGURATION);

  if (!store.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([config.navigationRoutes.authenticatedDefault]);
};

export const authorityRouteGuard = (requiredAuthorities: string[]): CanActivateFn => () => {
  const store = inject(AuthenticationStore);
  const router = inject(Router);
  const config = inject(SENTINEL_CONFIGURATION);

  if (store.hasAnyAuthority(requiredAuthorities)) {
    return true;
  }

  return router.createUrlTree([
    config.navigationRoutes.unauthorized ?? config.navigationRoutes.authenticatedDefault,
  ]);
};
