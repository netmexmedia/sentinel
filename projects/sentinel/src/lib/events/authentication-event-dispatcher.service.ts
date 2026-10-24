import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  AuthenticationDomainEvent,
  IAuthenticationEventDispatcher,
} from '../contracts/authentication-events.contract';

@Injectable()
export class AuthenticationEventDispatcher implements IAuthenticationEventDispatcher {
  private readonly eventStream$ = new Subject<AuthenticationDomainEvent>();

  /**
   * Broadcasts a domain event to all active observers.
   */
  dispatch(event: AuthenticationDomainEvent): void {
    this.eventStream$.next(event);
  }

  /**
   * Filters and selects a specific event stream by event type.
   */
  select<T extends AuthenticationDomainEvent['type']>(
    type: T
  ): Observable<Extract<AuthenticationDomainEvent, { type: T }>> {
    return this.eventStream$.pipe(
      filter((e): e is Extract<AuthenticationDomainEvent, { type: T }> => e.type === type)
    );
  }
}
