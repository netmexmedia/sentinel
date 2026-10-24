import { Signal } from '@angular/core';
import { SentinelJwtClaims } from './authentication-models.contract';

export interface IAuthenticationStateReader {
  readonly accessToken: Signal<string | null>;
  readonly refreshToken: Signal<string | null>;
  readonly claims: Signal<SentinelJwtClaims | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly subjectIdentifier: Signal<string | null>;
  readonly authorities: Signal<string[]>;

  hasAuthority(authority: string): boolean;
  hasAnyAuthority(authorities: string[]): boolean;
  hasAllAuthorities(authorities: string[]): boolean;
}

/** CQRS Command Interface: State mutation */
export interface IAuthenticationStateWriter {
  setTokens(accessToken: string, refreshToken?: string): void;
  reset(): void; // Formerly clear()
}
