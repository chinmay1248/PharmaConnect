import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerAddress } from '../screens/customer/customerTypes';
import { clearApiSessionToken, getJson, postJson, setApiSessionToken } from './api';

export type UserRole = 'CUSTOMER' | 'RETAILER' | 'WHOLESELLER' | 'COMPANY';

export type RetailerProfileSummary = {
  id: string;
  businessName: string;
  licenseNumber?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  rating?: number | null;
  deliveryAvailable?: boolean | null;
};

export type WholesellerProfileSummary = {
  id: string;
  businessName: string;
  gstNumber?: string | null;
  serviceArea: string;
};

export type CompanyProfileSummary = {
  id: string;
  legalName: string;
  gstNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type AuthUser = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  addresses: CustomerAddress[];
  retailerProfile: RetailerProfileSummary | null;
  wholesellerProfile: WholesellerProfileSummary | null;
  companyProfile: CompanyProfileSummary | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type CustomerSignupPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address?: {
    line1: string;
    line2?: string;
    area: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

const sessionStorageKey = 'pharmaconnect.session';

// The mobile app runs on Expo web as well as on devices. AsyncStorage covers both, but browser
// localStorage is read as a fallback so sessions saved by earlier builds still restore.
const legacyBrowserStorageKey = 'pharmaconnect.customerSession';

function getBrowserStorage() {
  return (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage ?? null;
}

export function normalizeAuthUser(user: any): AuthUser {
  return {
    id: String(user?.id ?? ''),
    role: (user?.role ?? 'CUSTOMER') as UserRole,
    fullName: String(user?.fullName ?? ''),
    email: String(user?.email ?? ''),
    phone: String(user?.phone ?? ''),
    addresses: Array.isArray(user?.addresses)
      ? user.addresses.map((address: any) => ({
          id: address.id,
          label: address.label ?? null,
          line1: address.line1,
          line2: address.line2 ?? null,
          area: address.area,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          isDefault: Boolean(address.isDefault),
        }))
      : [],
    retailerProfile: user?.retailerProfile ?? null,
    wholesellerProfile: user?.wholesellerProfile ?? null,
    companyProfile: user?.companyProfile ?? null,
  };
}

function normalizeSession(session: any): AuthSession {
  return {
    token: String(session?.token ?? ''),
    user: normalizeAuthUser(session?.user),
  };
}

function isUsableSession(session: AuthSession) {
  return Boolean(session.token && session.user.id && session.user.role);
}

async function writeStoredSession(session: AuthSession) {
  try {
    await AsyncStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } catch {
    // A device with storage disabled still gets a working in-memory session.
  }
}

async function readStoredSession(): Promise<AuthSession | null> {
  let raw: string | null = null;

  try {
    raw = await AsyncStorage.getItem(sessionStorageKey);
  } catch {
    raw = null;
  }

  if (!raw) {
    try {
      raw = getBrowserStorage()?.getItem(legacyBrowserStorageKey) ?? null;
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    return null;
  }

  try {
    const session = normalizeSession(JSON.parse(raw));
    return isUsableSession(session) ? session : null;
  } catch {
    return null;
  }
}

// Drops every trace of the signed-in user, both in memory and on disk.
export async function clearStoredSession() {
  clearApiSessionToken();

  try {
    await AsyncStorage.removeItem(sessionStorageKey);
  } catch {
    // Ignore storage failures so signing out always succeeds.
  }

  try {
    getBrowserStorage()?.removeItem(legacyBrowserStorageKey);
  } catch {
    // Same as above.
  }
}

async function activateSession(session: AuthSession) {
  setApiSessionToken(session.token);
  await writeStoredSession(session);
  return session;
}

// Signs in any role with an email address or phone number plus a password.
export async function login(identifier: string, password: string) {
  const response = await postJson<{ token: string; user: AuthUser }, { identifier: string; password: string }>(
    '/auth/login',
    { identifier: identifier.trim(), password },
  );

  return activateSession(normalizeSession(response));
}

// Registers a new customer account and signs it in.
export async function signupCustomer(payload: CustomerSignupPayload) {
  const response = await postJson<{ token: string; user: AuthUser }, CustomerSignupPayload>(
    '/auth/signup/customer',
    payload,
  );

  return activateSession(normalizeSession(response));
}

// Restores a stored session and refreshes it against the backend. Returns null when the stored
// token is missing, expired, or rejected, which is the signal to show the sign-in screen.
export async function restoreSession(): Promise<AuthSession | null> {
  const stored = await readStoredSession();

  if (!stored) {
    clearApiSessionToken();
    return null;
  }

  setApiSessionToken(stored.token);

  try {
    const profile = await getJson<{ user: AuthUser }>('/auth/session');
    return activateSession({ token: stored.token, user: normalizeAuthUser(profile.user) });
  } catch (error) {
    // An expired or revoked token must not leave the app in a half-signed-in state, but a backend
    // that is simply unreachable should not sign the user out either.
    if (isAuthenticationError(error)) {
      await clearStoredSession();
      return null;
    }

    return stored;
  }
}

// Distinguishes "your session is no longer valid" from "the backend is offline".
export function isAuthenticationError(error: unknown) {
  return (
    error instanceof Error &&
    /(session expired|invalid session token|authentication required|no longer exists|deactivated)/i.test(
      error.message,
    )
  );
}

// Replaces the cached user profile after a change such as adding an address.
export async function updateStoredUser(session: AuthSession, user: AuthUser) {
  return activateSession({ token: session.token, user: normalizeAuthUser(user) });
}

// Chooses which module the app should open for a signed-in account.
export function resolveModuleForRole(role: UserRole) {
  switch (role) {
    case 'RETAILER':
      return 'retailer' as const;
    case 'WHOLESELLER':
      return 'wholeseller' as const;
    case 'COMPANY':
      return 'company' as const;
    default:
      return 'customer' as const;
  }
}
