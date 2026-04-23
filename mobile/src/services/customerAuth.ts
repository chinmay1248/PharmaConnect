import type { CustomerAddress, CustomerSession, SignupState } from '../screens/customer/customerTypes';
import { getJson, postJson } from './api';

type CustomerSignupPayload = {
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

type LoginPayload = {
  identifier: string;
  password: string;
};

type CustomerProfileResponse = {
  user: CustomerSession['user'];
};

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const customerSessionStorageKey = 'pharmaconnect.customerSession';

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, '');
}

function getBrowserStorage(): BrowserStorage | null {
  const candidate = (globalThis as typeof globalThis & { localStorage?: BrowserStorage }).localStorage;

  return candidate ?? null;
}

function isStoredSessionPayload(value: unknown): value is CustomerSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as CustomerSession;

  return Boolean(
    typeof session.token === 'string' &&
      session.user &&
      typeof session.user.id === 'string' &&
      typeof session.user.role === 'string' &&
      typeof session.user.fullName === 'string' &&
      typeof session.user.email === 'string' &&
      typeof session.user.phone === 'string' &&
      Array.isArray(session.user.addresses),
  );
}

function buildAddressPayload(address: string): CustomerSignupPayload['address'] | undefined {
  const cleaned = address.trim();

  if (!cleaned) {
    return undefined;
  }

  const segments = cleaned
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const postalCodeMatch = cleaned.match(/\b\d{4,6}\b/);

  return {
    line1: segments[0] ?? cleaned,
    area: segments[1] ?? segments[0] ?? 'Local area',
    city: segments[2] ?? 'City',
    state: segments[3] ?? 'State',
    postalCode: postalCodeMatch?.[0] ?? '000000',
  };
}

function normalizeAddress(address: CustomerAddress): CustomerAddress {
  return {
    id: address.id,
    label: address.label ?? null,
    line1: address.line1,
    line2: address.line2 ?? null,
    area: address.area,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    isDefault: Boolean(address.isDefault),
  };
}

function normalizeSession(session: CustomerSession): CustomerSession {
  return {
    token: session.token,
    user: {
      id: session.user.id,
      role: session.user.role,
      fullName: session.user.fullName,
      email: session.user.email,
      phone: session.user.phone,
      addresses: Array.isArray(session.user.addresses) ? session.user.addresses.map(normalizeAddress) : [],
    },
  };
}

function isExistingAccountError(error: unknown) {
  return error instanceof Error && /same unique field already exists/i.test(error.message);
}

function buildSignupPayload(signup: SignupState): CustomerSignupPayload {
  return {
    fullName: signup.fullName.trim(),
    email: signup.email.trim().toLowerCase(),
    phone: normalizePhone(signup.phone),
    password: signup.password,
    address: buildAddressPayload(signup.address),
  };
}

export function validateSignupState(signup: SignupState) {
  if (
    !signup.fullName.trim() ||
    !signup.email.trim() ||
    !signup.password.trim() ||
    !signup.phone.trim() ||
    !signup.address.trim()
  ) {
    return 'Fill in your name, email, password, phone number, and address to continue.';
  }

  if (!signup.email.includes('@')) {
    return 'Enter a valid email address before continuing.';
  }

  if (signup.password.trim().length < 6) {
    return 'Use at least 6 characters for the password.';
  }

  if (normalizePhone(signup.phone).length < 10) {
    return 'Enter a valid phone number with at least 10 digits.';
  }

  return null;
}

export function formatCustomerAddress(address: CustomerAddress) {
  return [address.line1, address.line2, address.area, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
}

export async function signupOrLoginCustomer(signup: SignupState) {
  const signupPayload = buildSignupPayload(signup);

  try {
    const createdSession = await postJson<CustomerSession, CustomerSignupPayload>('/auth/signup/customer', signupPayload);
    return normalizeSession(createdSession);
  } catch (error) {
    if (!isExistingAccountError(error)) {
      throw error;
    }

    const loginPayload: LoginPayload = {
      identifier: signup.email.trim() || normalizePhone(signup.phone),
      password: signup.password,
    };
    const existingSession = await postJson<CustomerSession, LoginPayload>('/auth/login', loginPayload);
    return normalizeSession(existingSession);
  }
}
