import { SentinelMalformedTokenException } from '../contracts/authentication-exceptions.contract';

/**
 * Parses and decodes an RFC 7519 JSON Web Token payload.
 *
 * @template T Type shape expected in the payload claims
 * @param rawToken Base64/Base64Url encoded JWT string
 * @returns Parsed payload object or null if input is empty
 * @throws SentinelMalformedTokenException when token format or JSON decoding fails
 */
export function decodeJwtPayload<T = Record<string, unknown>>(rawToken: string | null): T | null {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenSegments = rawToken.trim().split('.');
  if (tokenSegments.length !== 3) {
    throw new SentinelMalformedTokenException(
      `Malformed JWT structure: Expected 3 segments separated by dots, found ${tokenSegments.length}`
    );
  }

  try {
    const rawPayload = tokenSegments[1];

    // Standard base64url to base64 conversion
    let base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');

    // Add necessary '=' padding to align to 4-character blocks
    const remainder = base64.length % 4;
    if (remainder === 2) {
      base64 += '==';
    } else if (remainder === 3) {
      base64 += '=';
    } else if (remainder === 1) {
      throw new Error('Illegal base64url string length');
    }

    // Decode binary string to UTF-8 handling characters outside ASCII range
    const binaryString = atob(base64);
    const byteBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteBuffer[i] = binaryString.charCodeAt(i);
    }

    const jsonString = new TextDecoder().decode(byteBuffer);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new SentinelMalformedTokenException(
      'Failed to decode and deserialize JWT payload segment',
      error
    );
  }
}
