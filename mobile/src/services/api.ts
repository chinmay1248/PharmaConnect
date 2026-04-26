const fallbackApiBaseUrl = 'http://localhost:4000/api';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const apiBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || fallbackApiBaseUrl,
);

const httpUrlPattern = /^https?:\/\//i;

function buildApiOrigin() {
  return apiBaseUrl.replace(/\/api(?:\/.*)?$/i, '');
}

type ApiErrorPayload = {
  error?: string;
};

// Sends one JSON request to the PharmaConnect backend and normalizes API errors.
async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

export async function getJson<T>(path: string) {
  return requestJson<T>(path);
}

export async function postJson<TResponse, TBody>(path: string, body: TBody) {
  return requestJson<TResponse>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export function resolveApiUrl(pathOrUrl: string) {
  const trimmed = pathOrUrl.trim();

  if (httpUrlPattern.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${buildApiOrigin()}${trimmed}`;
  }

  return `${apiBaseUrl}/${trimmed.replace(/^\/+/, '')}`;
}
