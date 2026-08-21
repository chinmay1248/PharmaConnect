import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

// Development-only fallback so a fresh clone can run without extra setup.
// `env.ts` refuses to boot in production unless a real secret is provided.
const developmentSigningSecret = 'pharmaconnect-development-session-secret';

const signingSecret = env.SESSION_TOKEN_SECRET ?? developmentSigningSecret;

if (!env.SESSION_TOKEN_SECRET) {
  console.warn(
    '[auth] SESSION_TOKEN_SECRET is not set. Using the development signing secret; do not use this outside local development.',
  );
}

export type SessionTokenPayload = {
  userId: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
};

function encodeSegment(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeSegment(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signSegment(segment: string) {
  return createHmac('sha256', signingSecret).update(segment).digest('base64url');
}

// Issues a signed, expiring session token that carries the user id and role.
export function signSessionToken(userId: string, role: string) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + env.SESSION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload: SessionTokenPayload = { userId, role, issuedAt, expiresAt };
  const encodedPayload = encodeSegment(JSON.stringify(payload));

  return `${encodedPayload}.${signSegment(encodedPayload)}`;
}

// Verifies a session token's signature and expiry, returning its payload when valid.
export function verifySessionToken(token: string): SessionTokenPayload {
  const [encodedPayload, providedSignature] = token.split('.');

  if (!encodedPayload || !providedSignature) {
    throw new HttpError(401, 'Invalid session token');
  }

  const expectedSignature = Buffer.from(signSegment(encodedPayload));
  const receivedSignature = Buffer.from(providedSignature);

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new HttpError(401, 'Invalid session token');
  }

  let payload: SessionTokenPayload;

  try {
    payload = JSON.parse(decodeSegment(encodedPayload)) as SessionTokenPayload;
  } catch {
    throw new HttpError(401, 'Invalid session token');
  }

  if (!payload.userId || !payload.role || typeof payload.expiresAt !== 'number') {
    throw new HttpError(401, 'Invalid session token');
  }

  if (payload.expiresAt <= Date.now()) {
    throw new HttpError(401, 'Session expired. Please sign in again.');
  }

  return payload;
}

// Reads a bearer token from the Authorization header, if one is present.
export function readBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, value] = authorizationHeader.split(' ');

  if (!value || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return value.trim() || null;
}
