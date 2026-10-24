import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthenticationStore } from '../store/authentication.store';
import { TokenLifecycleCoordinator } from '../services/token-lifecycle-coordinator.service';
import { SENTINEL_CONFIGURATION } from '../config/sentinel.config';

export const authenticationBearerInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthenticationStore);
  const coordinator = inject(TokenLifecycleCoordinator);
  const config = inject(SENTINEL_CONFIGURATION);

  const token = store.accessToken();
  const isAuthenticationEndpoint =
    req.url.includes(config.endpointPaths.login) ||
    req.url.includes(config.endpointPaths.refreshToken);

  let outboundRequest = req;
  if (token && !isAuthenticationEndpoint) {
    outboundRequest = req.clone({
      setHeaders: { Authorization: config.headerFormatter(token) },
    });
  }

  return next(outboundRequest).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthenticationEndpoint) {
        return coordinator.renewAuthenticationTokens().pipe(
          switchMap((renewedTokens) => {
            const retryRequest = req.clone({
              setHeaders: { Authorization: config.headerFormatter(renewedTokens.accessToken) },
            });
            return next(retryRequest);
          }),
          catchError((renewalErr) => throwError(() => renewalErr))
        );
      }
      return throwError(() => err);
    })
  );
};
