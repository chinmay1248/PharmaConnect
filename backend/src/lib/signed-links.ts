import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

// Short-lived signed links let a browser or an <Image> tag fetch a private file without being able
// to attach an Authorization header. Anything reachable this way must also stay reachable to an
// authenticated owner, so callers fall back to a normal permission check when no signature is sent.
function getLinkSecret() {
  return env.INVOICE_LINK_SECRET || env.SESSION_TOKEN_SECRET || env.DATABASE_URL;
}

function signResource(resource: string, expiresAt: number) {
  return createHmac('sha256', getLinkSecret()).update(`${resource}.${expiresAt}`).digest('hex');
}

function pickValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

// Appends `expires` and `signature` query parameters to a path.
export function buildSignedPath(basePath: string, resource: string, ttlMs = 15 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  const signature = signResource(resource, expiresAt);
  const separator = basePath.includes('?') ? '&' : '?';

  return `${basePath}${separator}expires=${expiresAt}&signature=${signature}`;
}

// Reports whether the caller supplied signed-link parameters at all.
export function hasSignedLinkParams(query: { expires?: unknown; signature?: unknown }) {
  return pickValue(query.expires) !== undefined && pickValue(query.signature) !== undefined;
}

// Validates a signed link, throwing when it is expired or tampered with.
export function assertValidSignedLink(
  resource: string,
  query: { expires?: unknown; signature?: unknown },
  resourceLabel = 'download link',
) {
  const expiresAt = Number(pickValue(query.expires));
  const providedSignature = String(pickValue(query.signature) ?? '');

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    throw new HttpError(403, `This ${resourceLabel} has expired.`);
  }

  const expected = Buffer.from(signResource(resource, expiresAt));
  const provided = Buffer.from(providedSignature);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new HttpError(403, `This ${resourceLabel} is invalid.`);
  }
}
