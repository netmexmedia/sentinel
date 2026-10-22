import { inject, Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Subject, Subscription, timer } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { SENTINEL_CONFIG } from '../config/sentinel.config';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly ngZone = inject(NgZone);
  private readonly config = inject(SENTINEL_CONFIG);

  private readonly timeoutSubject = new Subject<void>();
  readonly onTimeout$ = this.timeoutSubject.asObservable();

  private sub: Subscription | null = null;

  start(): void {
    this.stop();
    if (typeof window === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      const events$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'wheel'),
        fromEvent(window, 'touchstart')
      );

      this.sub = events$
        .pipe(
          startWith(null),
          switchMap(() => timer(this.config.idleTimeoutMs))
        )
        .subscribe(() => {
          this.ngZone.run(() => this.timeoutSubject.next());
        });
    });
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }
}
