# @netmex/sentinel

<p align="left">
  <img src="https://img.shields.io/badge/npm-v1.0.0-cb3837?style=flat-square&logo=npm&logoColor=white" alt="npm" />
  <img src="https://img.shields.io/badge/Angular-18%2B%20%7C%2019%2B-DD0031?style=flat-square&logo=angular&logoColor=white" alt="Angular 18+ | 19+" />
  <img src="https://img.shields.io/badge/RxJS-%5E7.8.0-B7178C?style=flat-square&logo=reactivex&logoColor=white" alt="RxJS" />
  <img src="https://img.shields.io/badge/TypeScript-%3E%3D5.4-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

> **@netmex/sentinel** — Enterprise-grade authentication, token lifecycle management, and session resilience framework for modern Angular applications.

Sentinel provides end-to-end token security, proactive refresh scheduling, request replay queuing, and user inactivity tracking without coupling your application to proprietary backend schemas.

---

## Features

- **Decoupled Architecture:** Strict separation between orchestration (`AuthenticationManager`), state reads/mutations (`AuthenticationStore`), and network transport (`AuthenticationHttpClient`).
- **Reactive Angular Signals:** Fine-grained reactive state for `isAuthenticated`, `subjectIdentifier`, `authorities`, and `claims`.
- **Backend-Agnostic Response Mapping:** Pluggable `tokenResponseMapper` normalizes any identity provider payload (`token`, `access_token`, wrapped JSON).
- **Comprehensive Route Protection:** Functional route guards for protected routes (`authenticatedRouteGuard`), guest areas (`anonymousRouteGuard`), and role/permission checks (`authorityRouteGuard`).
- **Centralized Typed Exceptions:** Predictable error handling via `SentinelException` hierarchy (`SentinelAuthenticationException`, `SentinelMalformedTokenException`, `SentinelRefreshTokenException`, `SentinelPersistenceException`).
- **Pluggable Token Persistence:** Abstracted storage interface (`ITokenPersistenceRepository`) with built-in SSR/Node guards.
- **Zone-Clean Inactivity Tracking:** Monitors user interactions outside `NgZone` to prevent change detection overhead.

---

## Installation

```bash
npm install @netmex/sentinel
```

Ensure peer dependencies (@angular/core, @angular/common, @angular/router, and rxjs) are installed.

---

## Setup & Usage

### 1. Define Configuration & Register Providers
Create your Sentinel configuration using `defineSentinelConfiguration`:
```typescript
import { defineSentinelConfiguration } from '@netmex/sentinel';
import { environment } from '../environments/environment';

export const sentinelConfig = defineSentinelConfiguration({
  apiEndpointUrl: environment.apiUrl,
  endpointPaths: {
    login: '/login',
    refreshToken: '/token/refresh',
    logout: '/logout', // Optional
  },
  storageKeys: {
    accessToken: 'app_access_token',
    refreshToken: 'app_refresh_token',
  },
  navigationRoutes: {
    login: '/auth/login',
    authenticatedDefault: '/dashboard',
    unauthorized: '/forbidden',
  },
  sessionTiming: {
    inactivityLimitMinutes: 15,
    proactiveRenewalLeadTimeSeconds: 30,
  },
  // Map arbitrary backend JSON keys to the canonical token contract
  tokenResponseMapper: (res) => ({
    accessToken: (res['token'] || res['accessToken'] || res['access_token']) as string,
    refreshToken: (res['refresh_token'] || res['refreshToken']) as string,
  }),
});
```

Register Sentinel in `app.config.ts`

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideSentinel, authenticationBearerInterceptor } from '@netmex/sentinel';
import { APP_ROUTES } from './app.routes';
import { sentinelConfig } from './sentinel.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES),
    provideHttpClient(
      withInterceptors([authenticationBearerInterceptor])
    ),
    provideSentinel(sentinelConfig),
  ],
};
```

---

### 2. Route Protection
Protect routes using Sentinel's functional guards:

```typescript
import { Routes } from '@angular/router';
import {
  authenticatedRouteGuard,
  anonymousRouteGuard,
  authorityRouteGuard,
} from '@netmex/sentinel';

export const APP_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedRouteGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'admin',
        canActivate: [authorityRouteGuard(['admin'])],
        loadComponent: () =>
          import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./pages/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
      },
    ],
  },
  {
    path: 'auth',
    canActivate: [anonymousRouteGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login.page').then((m) => m.LoginPage),
      },
    ],
  },
];
```

---

### 3. Authentication Workflows & Typed Exceptions
Use `AuthenticationManager` to trigger authentication or sign out, and catch typed `SentinelException`s:

```typescript
import { Component, inject, signal } from '@angular/core';
import {
  AuthenticationManager,
  SentinelAuthenticationException,
  SentinelMalformedTokenException,
  SentinelRefreshTokenException,
  SentinelPersistenceException,
} from '@netmex/sentinel';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
})
export class LoginPage {
  private readonly authManager = inject(AuthenticationManager);
  readonly errorMessage = signal<string | null>(null);

  async onSubmit(credentials: { email: string; password: string }): Promise<void> {
    this.errorMessage.set(null);

    try {
      await this.authManager.authenticate(credentials);
      // Automatically navigates to navigationRoutes.authenticatedDefault on success
    } catch (err: unknown) {
      this.errorMessage.set(this.resolveErrorMessage(err));
    }
  }

  async onSignOut(): Promise<void> {
    await this.authManager.terminateSession();
  }

  private resolveErrorMessage(err: unknown): string {
    const target = (err instanceof SentinelAuthenticationException && err.underlyingCause)
      ? err.underlyingCause
      : err;

    if (target instanceof SentinelMalformedTokenException) {
      return 'Received an invalid or malformed token format from the server.';
    }

    if (target instanceof SentinelRefreshTokenException) {
      return 'Server response did not include a valid refresh token.';
    }

    if (err instanceof SentinelAuthenticationException) {
      const cause = err.underlyingCause as { error?: { message?: string } } | undefined;
      return cause?.error?.message ?? 'Invalid email or password.';
    }

    if (target instanceof SentinelPersistenceException) {
      return 'Unable to persist your session. Please check browser storage settings.';
    }

    return 'Authentication failed. Please try again.';
  }
}
```

---

### 4. Reactive State Consumption
Inject `AuthenticationStore` directly to read reactive signals and query authorities:

```typescript
import { Component, inject } from '@angular/core';
import { AuthenticationStore, AuthenticationManager } from '@netmex/sentinel';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    @if (authStore.isAuthenticated()) {
      <div class="user-badge">
        <span>{{ authStore.subjectIdentifier() }}</span>
        <span class="role">{{ authStore.authorities()[0] }}</span>
        <button (click)="authManager.terminateSession()">Sign Out</button>
      </div>
    }
  `,
})
export class TopbarComponent {
  protected readonly authStore = inject(AuthenticationStore);
  protected readonly authManager = inject(AuthenticationManager);
}
```

#### Available Signals & Query Methods

| Member                                  | Type                                | Description                                                |
|-----------------------------------------|-------------------------------------|------------------------------------------------------------|
| `authStore.isAuthenticated()`           | `Signal<boolean>`                   | `true` when access token exists and remains unexpired.     |
| `authStore.subjectIdentifier()`         | `Signal<string \| null>`            | Identity claim from token (`sub`, `username`, or `email`). |
| `authStore.authorities()`               | `Signal<string[]>`                  | Resolved array of roles/permissions from token claims.     |
| `authStore.claims()`                    | `Signal<SentinelJwtClaims \| null>` | Raw decoded JWT payload.                                   |
| `authStore.hasAuthority(role)`          | `boolean`                           | Checks for a single specific authority.                    |
| `authStore.hasAnyAuthority(roles)`      | `boolean`                           | Checks if user has at least one matching authority.        |
| `authStore.hasAllAuthorities(roles)`    | `boolean`                           | Checks if user has all listed authorities.                 |

---

### 5. Custom Storage Strategy

Implement `ITokenPersistenceRepository` to swap out `localStorage` for cookies, `sessionStorage`, or native biometric/keychain storage:

```typescript
import { Injectable } from '@angular/core';
import { ITokenPersistenceRepository } from '@netmex/sentinel';

@Injectable()
export class SessionStorageTokenRepository implements ITokenPersistenceRepository {
  readAccessToken(): string | null {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('access_token') : null;
  }

  readRefreshToken(): string | null {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('refresh_token') : null;
  }

  writeTokens(accessToken: string, refreshToken: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('refresh_token', refreshToken);
  }

  purge(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }
}
```

Provide the repository in `app.config.ts`:

```typescript
import { SENTINEL_TOKEN_PERSISTENCE } from '@netmex/sentinel';
import { SessionStorageTokenRepository } from './storage/session-storage.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSentinel(sentinelConfig),
    { provide: SENTINEL_TOKEN_PERSISTENCE, useClass: SessionStorageTokenRepository },
  ],
};
```

---

## Configuration Reference

| Option                                                 | Type                            | Default                    | Description                                               |
|--------------------------------------------------------|---------------------------------|----------------------------|-----------------------------------------------------------|
| `apiEndpointUrl`                                       | `string`                        | `''`                       | Base URL for remote identity endpoints.                   |
| `endpointPaths.login`                                  | `string`                        | `/login`                   | Path for credential authentication.                       |
| `endpointPaths.refreshToken`                           | `string`                        | `/token/refresh`           | Path for token renewal exchange.                          |
| `endpointPaths.logout`                                 | `string?`                       | `undefined`                | Path for token renewal exchange.                          |
| `storageKeys.accessToken`                              | `string`                        | `'sentinel_access_token'`  | Storage key for the access token.                         |
| `storageKeys.refreshToken`                             | `string`                        | `'sentinel_refresh_token'` | Storage key for the refresh token.                        |
| `navigationRoutes.login`                               | `string`                        | `'/auth/login'`            | Target route for unauthenticated redirects.               |
| `navigationRoutes.authenticatedDefault`                | `string`                        | `'/'`                      | Target route after successful authentication.             |
| `navigationRoutes.unauthorized`                        | `string?`                       | `'/'`                      | Target route when authority guard check fails.            |
| `sessionTiming.inactivityLimitMinutes`                 | `number`                        | `15`                       | Minutes of user inactivity before session termination.    |
| `sessionTiming.proactiveRenewalLeadTimeSeconds	number` | `number`                        | `30`                       | Seconds before token expiry to initiate refresh           |
| `authorityClaim`                                       | `tring \| string[] \| Function` | `'roles'`                  | Custom claim key(s) or resolver function for authorities. |
---

## License
MIT © [Netmex](https://netmex.nl)
