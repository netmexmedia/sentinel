import { InjectionToken } from '@angular/core';

export interface AuthorityResolverStrategy {
  resolveAuthorities(claims: Record<string, unknown> | null): string[];
}

export class StandardAuthorityResolverStrategy implements AuthorityResolverStrategy {
  constructor(private readonly authorityClaimKeys: string[] = ['roles', 'role', 'authorities']) {}

  resolveAuthorities(claims: Record<string, unknown> | null): string[] {
    if (!claims) return [];
    for (const key of this.authorityClaimKeys) {
      const value = claims[key];
      if (value !== undefined && value !== null) {
        return Array.isArray(value) ? value.map(String) : [String(value)];
      }
    }
    return [];
  }
}

export class CustomAuthorityResolverStrategy implements AuthorityResolverStrategy {
  constructor(private readonly resolverFn: (claims: Record<string, unknown>) => string[]) {}

  resolveAuthorities(claims: Record<string, unknown> | null): string[] {
    return claims ? this.resolverFn(claims) : [];
  }
}

export const SENTINEL_AUTHORITY_RESOLVER = new InjectionToken<AuthorityResolverStrategy>(
  'SENTINEL_AUTHORITY_RESOLVER'
);
