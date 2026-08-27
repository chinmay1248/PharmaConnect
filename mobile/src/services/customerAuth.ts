import type { CustomerAddress, CustomerSession, SignupState } from '../screens/customer/customerTypes';
import { deleteJson, patchJson, postJson } from './api';
import { updateStoredUser, type AuthSession, type AuthUser } from './session';

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

type CustomerAddressMutationPayload = {
  label?: string | null;
  line1: string;
  line2?: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
};

type CustomerAddressUpdatePayload = Partial<Omit<CustomerAddressMutationPayload, 'isDefault'>>;

export type CustomerAddressDraft = {
  label: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
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

function normalizeAddressDraft(draft: CustomerAddressDraft) {
  return {
    label: draft.label.trim(),
    line1: draft.line1.trim(),
    line2: draft.line2.trim(),
    area: draft.area.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    postalCode: draft.postalCode.trim(),
    isDefault: Boolean(draft.isDefault),
  };
}

function buildCreateAddressPayload(draft: CustomerAddressDraft): CustomerAddressMutationPayload {
  const normalized = normalizeAddressDraft(draft);

  return {
    ...(normalized.label ? { label: normalized.label } : {}),
    line1: normalized.line1,
    ...(normalized.line2 ? { line2: normalized.line2 } : {}),
    area: normalized.area,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
    isDefault: normalized.isDefault,
  };
}

function buildUpdateAddressPayload(draft: CustomerAddressDraft): CustomerAddressUpdatePayload {
  const normalized = normalizeAddressDraft(draft);

  return {
    label: normalized.label || null,
    line1: normalized.line1,
    line2: normalized.line2 || null,
    area: normalized.area,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
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

function writeStoredSession(session: CustomerSession) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(customerSessionStorageKey, JSON.stringify(normalizeSession(session)));
  } catch {
    // Ignore storage write failures so auth still works in restricted runtimes.
  }
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

export function validateCustomerAddressDraft(draft: CustomerAddressDraft) {
  if (!draft.line1.trim() || !draft.area.trim() || !draft.city.trim() || !draft.state.trim() || !draft.postalCode.trim()) {
    return 'Fill in line 1, area, city, state, and postal code before saving the address.';
  }

  if (draft.postalCode.trim().length < 4) {
    return 'Postal code should have at least 4 characters.';
  }

  return null;
}

export function formatCustomerAddress(address: CustomerAddress) {
  return [address.line1, address.line2, address.area, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
}

export function buildSignupStateFromSession(session: CustomerSession): SignupState {
  const defaultAddress = session.user.addresses.find((address) => address.isDefault) ?? session.user.addresses[0];

  return {
    fullName: session.user.fullName,
    email: session.user.email,
    password: '',
    phone: session.user.phone,
    address: defaultAddress ? formatCustomerAddress(defaultAddress) : '',
  };
}

// Address edits change the signed-in profile, so the shared session store is updated in place and
// the caller receives the refreshed session to render.
async function mergeSessionWithProfile(session: CustomerSession, profile: CustomerProfileResponse) {
  await updateStoredUser(session as unknown as AuthSession, profile.user as unknown as AuthUser);

  return normalizeSession({
    token: session.token,
    user: profile.user,
  });
}

export async function createCustomerAddress(session: CustomerSession, draft: CustomerAddressDraft) {
  const payload = buildCreateAddressPayload(draft);
  const profile = await postJson<CustomerProfileResponse, CustomerAddressMutationPayload>(
    `/auth/users/${session.user.id}/addresses`,
    payload,
  );

  return mergeSessionWithProfile(session, profile);
}

export async function updateCustomerAddress(
  session: CustomerSession,
  addressId: string,
  draft: CustomerAddressDraft,
) {
  const payload = buildUpdateAddressPayload(draft);
  const profile = await patchJson<CustomerProfileResponse, CustomerAddressUpdatePayload>(
    `/auth/users/${session.user.id}/addresses/${addressId}`,
    payload,
  );

  return mergeSessionWithProfile(session, profile);
}

export async function setDefaultCustomerAddress(session: CustomerSession, addressId: string) {
  const profile = await patchJson<CustomerProfileResponse, Record<string, never>>(
    `/auth/users/${session.user.id}/addresses/${addressId}/default`,
    {},
  );

  return mergeSessionWithProfile(session, profile);
}

export async function deleteCustomerAddress(session: CustomerSession, addressId: string) {
  const profile = await deleteJson<CustomerProfileResponse>(`/auth/users/${session.user.id}/addresses/${addressId}`);

  return mergeSessionWithProfile(session, profile);
}
