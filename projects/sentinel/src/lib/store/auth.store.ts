import { Injectable, computed, signal } from '@angular/core';
import { SentinelJwtPayload } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthStore<T = SentinelJwtPayload> {
  readonly user = signal<T | null>(null);

  readonly isAuthenticated = computed(() => !!this.user());

  setUser(user: T | null): void {
    this.user.set(user);
  }

  clear(): void {
    this.user.set(null);
  }
}
