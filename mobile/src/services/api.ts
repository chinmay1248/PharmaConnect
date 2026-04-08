const fallbackApiBaseUrl = 'http://localhost:4000/api';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const apiBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || fallbackApiBaseUrl,
);

type ApiErrorPayload = {
  error?: string;
};

// Sends one JSON request to the PharmaConnect backend and normalizes API errors.
export async function getJson<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
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
