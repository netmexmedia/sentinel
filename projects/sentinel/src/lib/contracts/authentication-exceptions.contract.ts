export type SentinelExceptionCode =
  | 'ERR_AUTHENTICATION_CREDENTIALS_INVALID'
  | 'ERR_TRANSPORT_NETWORK'
  | 'ERR_JWT_MALFORMED'
  | 'ERR_TOKEN_EXPIRED'
  | 'ERR_TOKEN_RENEWAL_FAILED'
  | 'ERR_PERSISTENCE_UNAVAILABLE'
  | 'ERR_AUTHORITY_RESOLUTION_FAILED'
  | 'ERR_REFRESH_TOKEN_INVALID';

export abstract class SentinelException extends Error {
  abstract readonly code: SentinelExceptionCode;
  readonly occurredAt = new Date();

  constructor(message: string, public readonly underlyingCause?: unknown) {
    super(`[@netmex/sentinel]: ${message}`);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SentinelMalformedTokenException extends SentinelException {
  readonly code: SentinelExceptionCode = 'ERR_JWT_MALFORMED';
}

export class SentinelTokenRenewalException extends SentinelException {
  readonly code: SentinelExceptionCode = 'ERR_TOKEN_RENEWAL_FAILED';
}

export class SentinelPersistenceException extends SentinelException {
  readonly code: SentinelExceptionCode = 'ERR_PERSISTENCE_UNAVAILABLE';
}

export class SentinelAuthenticationException extends SentinelException {
  readonly code: SentinelExceptionCode = 'ERR_AUTHENTICATION_CREDENTIALS_INVALID';
}

export class SentinelRefreshTokenException extends SentinelException {
  readonly code: SentinelExceptionCode = 'ERR_REFRESH_TOKEN_INVALID';
}
