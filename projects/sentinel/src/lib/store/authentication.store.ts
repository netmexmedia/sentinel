import { Injectable, computed, inject, signal } from '@angular/core';
import {
  IAuthenticationStateReader,
  IAuthenticationStateWriter,
} from '../contracts/authentication-state.contract';
import { SentinelJwtClaims } from '../contracts/authentication-models.contract';
import { SENTINEL_TOKEN_PERSISTENCE, SENTINEL_JWT_DECODER } from '../storage/token-persistence-repository';
import { SENTINEL_AUTHORITY_RESOLVER } from '../strategies/authority-resolver.strategy';
import {
  SentinelMalformedTokenException,
  SentinelRefreshTokenException
} from '../contracts/authentication-exceptions.contract';

@Injectable()
export class AuthenticationStore
  implements IAuthenticationStateReader, IAuthenticationStateWriter
{
  private readonly persistence = inject(SENTINEL_TOKEN_PERSISTENCE);
  private readonly tokenDecoder = inject(SENTINEL_JWT_DECODER);
  private readonly authorityResolver = inject(SENTINEL_AUTHORITY_RESOLVER);

  readonly accessToken = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly claims = signal<SentinelJwtClaims | null>(null);

  readonly isAuthenticated = computed(() => {
    const token = this.accessToken();
    if (!token) return false;

    const payload = this.claims();
    if (!payload?.exp) return true;

    return payload.exp > Math.floor(Date.now() / 1000);
  });

  readonly subjectIdentifier = computed(() => {
    const claims = this.claims();
    if (!claims) return null;
    return (
      claims.sub ??
      (claims['username'] as string) ??
      (claims['email'] as string) ??
      null
    );
  });

  readonly authorities = computed<string[]>(() => {
    return this.authorityResolver.resolveAuthorities(this.claims());
  });

  constructor() {
    this.hydrateFromPersistence();
  }

  private hydrateFromPersistence(): void {
    const access = this.persistence.readAccessToken();
    const refresh = this.persistence.readRefreshToken();

    if (access) {
      try {
        const decoded = this.tokenDecoder<SentinelJwtClaims>(access);
        this.accessToken.set(access);
        this.refreshToken.set(refresh);
        this.claims.set(decoded);
      } catch {
        this.reset();
      }
    }
  }

  hasAuthority(authority: string): boolean {
    return this.authorities().includes(authority);
  }

  hasAnyAuthority(authorities: string[]): boolean {
    return authorities.some((auth) => this.authorities().includes(auth));
  }

  hasAllAuthorities(authorities: string[]): boolean {
    return authorities.every((auth) => this.authorities().includes(auth));
  }

  setTokens(accessToken: string, refreshToken?: string, requireRefreshToken = true): void {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new SentinelMalformedTokenException(
        `Invalid access token provided to setTokens: Expected non-empty string, received ${typeof accessToken}`
      );
    }

    // If your auth flow strictly mandates a refresh token:
    if (requireRefreshToken && (!refreshToken || typeof refreshToken !== 'string')) {
      throw new SentinelRefreshTokenException(
        `Invalid refresh token provided to setTokens: Expected non-empty string, received ${typeof refreshToken}`
      );
    }

    const decodedClaims = this.tokenDecoder<SentinelJwtClaims>(accessToken);
    const resolvedRefresh = refreshToken ?? this.persistence.readRefreshToken() ?? '';

    this.accessToken.set(accessToken);
    this.claims.set(decodedClaims);

    if (refreshToken) {
      this.refreshToken.set(refreshToken);
    }

    this.persistence.writeTokens(accessToken, resolvedRefresh);
  }

  reset(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.claims.set(null);
    this.persistence.purge();
  }
}
