# Netmex Sentinel

<p align="left">
  <img src="https://img.shields.io/badge/npm-v1.0.0-cb3837?style=flat-square&logo=npm&logoColor=white" alt="npm" />
  <img src="https://img.shields.io/badge/Angular-22+-DD0031?style=flat-square&logo=angular&logoColor=white" alt="Angular 19+" />
  <img src="https://img.shields.io/badge/RxJS-%5E7.8.0-B7178C?style=flat-square&logo=reactivex&logoColor=white" alt="RxJS" />
  <img src="https://img.shields.io/badge/TypeScript-%3E%3D5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

> **@netmex/sentinel** — A standalone authentication, token lifecycle, and session resilience library for Angular 22+ applications.

Sentinel provides runtime token security, proactive token refresh scheduling, 401 retry queuing, and idle inactivity monitoring without coupling your frontend to a specific backend claim schema or user profile structure.

---

## Installation

```bash
npm install @netmex/sentinel
```

## Features

* Standalone Provider: Bootstrap via `provideSentinel` in your application root.
* Model Agnostic: Generic `AuthStore<T>` works with standard RFC 7519 JWT claims or custom backend user entities.
* Proactive Refresh: Refreshes tokens in the background ahead of expiration using a configurable skew window.
* Concurrent 401 Handling: Pauses and replays failed HTTP requests during token refresh cycles.
* Zone-Clean Inactivity Tracking: Monitors user activity outside NgZone to prevent change detection overhead.
* Pluggable Token Storage: Abstracted storage interface with `localStorage` default, swappable for `sessionStorage` or secure device storage.

---

## Setup & Usage

### 1. Register Providers (app.config.ts)
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSentinel } from '@netmex/sentinel';
import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES),
    provideSentinel({
      baseUrl: environment.apiUrl,
      endpoints: {
        login: '/api/login',
        refreshToken: '/api/token/refresh',
        me: '/api/me', // Optional canonical user profile endpoint
      },
      storageKeys: {
        accessToken: 'app_access_token',
        refreshToken: 'app_refresh_token',
      },
      routes: {
        login: '/auth/login',
        authenticatedDefault: '/dashboard',
      },
      idleTimeoutMs: 15 * 60 * 1000, // 15-minute inactivity timeout
      skewBufferMs: 60 * 1000,        // Refresh 60s ahead of token expiry
    }),
  ],
};
```

---

### 2. Route Protection (app.routes.ts)
Apply `authGuard` and `guestGuard` directly in your route definitions. Unauthenticated access automatically captures the requested route in `?returnUrl`:

```typescript
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@netmex/sentinel';

export const APP_ROUTES: Routes = [
  // Protected Routes
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
    ],
  },
  // Guest Routes
  {
    path: 'auth',
    canActivate: [guestGuard],
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

### 3. Reactive State & Custom Models (AuthStore)
`AuthStore` exposes signals for session state. You can type it with your backend's custom user profile or use the base `SentinelJwtPayload`:

```typescript
import { SentinelJwtPayload } from '@netmex/sentinel';

export interface AppUser extends SentinelJwtPayload {
  uid: string;
  email: string;
  roles: string[];
  firstName?: string | null;
  lastName?: string | null;
  country?: string | null;
}
```
Inject `AuthStore` in your components:

```typescript
import { Component, inject } from '@angular/core';
import { AuthStore, AuthService } from '@netmex/sentinel';
import { AppUser } from '../core/models/user.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    @if (authStore.user(); as user) {
      <div class="user-badge">
        <span>{{ user.firstName ?? user.email }}</span>
        <span class="role">{{ user.roles[0] }}</span>
        <button (click)="authService.logout()">Sign Out</button>
      </div>
    }
  `,
})
export class TopbarComponent {
  protected readonly authStore = inject<AuthStore<AppUser>>(AuthStore);
  protected readonly authService = inject(AuthService);
}
```
---

### 4. Custom Storage Adapter
To use `sessionStorage`, cookies, or encrypted device storage (Capacitor/Cordova), implement `SentinelTokenStorage`:

```typescript
import { SentinelTokenStorage } from '@netmex/sentinel';

export class SessionStorageAdapter implements SentinelTokenStorage {
  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token');
  }

  setTokens(access: string, refresh: string): void {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
  }

  clear(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }
}
```
Provide the adapter in `app.config.ts`:

```typescript
import { SENTINEL_TOKEN_STORAGE } from '@netmex/sentinel';
import { SessionStorageAdapter } from './storage/session-storage.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSentinel({ ... }),
    { provide: SENTINEL_TOKEN_STORAGE, useClass: SessionStorageAdapter },
  ],
};
```

---

## Configuration Reference (SentinelConfig)

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `''` | API root base URL. |
| `endpoints.login` | `string` | `'/login'` | POST route for user login. |
| `endpoints.refreshToken` | `string` | `'/token/refresh'` | POST route for refresh token exchange. |
| `endpoints.me` | `string?` | `'/me'` | Optional GET route to retrieve database profile on login. |
| `storageKeys.accessToken` | `string` | `'sentinel_access_token'` | Storage key identifier for the access token. |
| `storageKeys.refreshToken` | `string` | `'sentinel_refresh_token'` | Storage key identifier for the refresh token. |
| `routes.login` | `string` | `'/auth/login'` | Target path for unauthenticated redirects. |
| `routes.authenticatedDefault` | `string` | `'/'` | Landing route after successful login. |
| `idleTimeoutMs` | `number` | `900000` (15m) | Inactivity period in ms before auto-logout. |
| `skewBufferMs` | `number` | `60000` (60s) | Pre-expiry window in ms to schedule proactive token refresh. |

---

## License
MIT © [Netmex](https://netmex.nl)
