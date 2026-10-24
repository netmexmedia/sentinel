import { Injectable, NgZone, inject } from '@angular/core';
import { AuthenticationEventDispatcher } from '../events/authentication-event-dispatcher.service';
import { SENTINEL_INACTIVITY_LIMIT_MS } from '../config/sentinel.config';

@Injectable()
export class UserInactivityDetector {
  private readonly ngZone = inject(NgZone);
  private readonly dispatcher = inject(AuthenticationEventDispatcher);
  private readonly timeoutThresholdMs = inject(SENTINEL_INACTIVITY_LIMIT_MS);

  private timeoutReference: ReturnType<typeof setTimeout> | null = null;
  private readonly interactionEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  private isActive = false;

  private readonly onUserActivityDetected = () => {
    if (this.timeoutReference) clearTimeout(this.timeoutReference);
    this.timeoutReference = setTimeout(() => {
      this.ngZone.run(() => {
        this.dispatcher.dispatch({ type: 'INACTIVITY_TIMEOUT_REACHED' });
      });
    }, this.timeoutThresholdMs);
  };

  initializeMonitoring(): void {
    if (this.isActive || typeof window === 'undefined') return;
    this.isActive = true;

    this.ngZone.runOutsideAngular(() => {
      this.interactionEvents.forEach((ev) =>
        window.addEventListener(ev, this.onUserActivityDetected, { passive: true })
      );
      this.onUserActivityDetected();
    });
  }

  terminateMonitoring(): void {
    if (!this.isActive || typeof window === 'undefined') return;
    this.isActive = false;

    if (this.timeoutReference) {
      clearTimeout(this.timeoutReference);
      this.timeoutReference = null;
    }
    this.interactionEvents.forEach((ev) =>
      window.removeEventListener(ev, this.onUserActivityDetected)
    );
  }
}
