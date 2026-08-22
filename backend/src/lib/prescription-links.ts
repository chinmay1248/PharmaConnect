import { env } from '../config/env.js';
import { buildSignedPath } from './signed-links.js';

// The stable identity of a stored prescription. This is what gets persisted on the Prescription
// record, and it stays valid forever because it carries no signature and no expiry.
export function buildPrescriptionFileUrl(customerId: string, fileName: string) {
  return `/api/prescriptions/uploads/${encodeURIComponent(customerId)}/${encodeURIComponent(fileName)}`;
}

export function buildPrescriptionResourceId(customerId: string, fileName: string) {
  return `prescription:${customerId}/${fileName}`;
}

function parsePrescriptionFileUrl(fileUrl: string) {
  const match = /\/api\/prescriptions\/uploads\/([^/?#]+)\/([^/?#]+)/.exec(fileUrl);

  if (!match) {
    return null;
  }

  return {
    customerId: decodeURIComponent(match[1]),
    fileName: decodeURIComponent(match[2]),
  };
}

// Prescription images are private, but they are rendered by <Image> tags that cannot attach an
// Authorization header. Every read therefore mints a fresh short-lived signed link from the stored
// path, instead of persisting a signature that would expire before the pharmacy reviews the order.
// The link always points at this API: when S3 is configured the download route redirects to a
// presigned object URL, so one link shape works for both storage backends.
export function buildSignedPrescriptionUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return null;
  }

  const parsed = parsePrescriptionFileUrl(fileUrl);

  if (!parsed) {
    return fileUrl;
  }

  const signedPath = buildSignedPath(
    buildPrescriptionFileUrl(parsed.customerId, parsed.fileName),
    buildPrescriptionResourceId(parsed.customerId, parsed.fileName),
  );

  return env.STORAGE_PUBLIC_BASE_URL
    ? `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, '')}${signedPath}`
    : signedPath;
}
