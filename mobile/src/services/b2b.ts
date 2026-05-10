import { getJson, patchJson, postJson, setApiSessionToken } from './api';

type RoleSession<TProfileKey extends string, TProfile> = {
  token: string;
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    phone: string;
  } & Record<TProfileKey, TProfile | null>;
};

export type WholesellerProfile = {
  id: string;
  businessName: string;
  gstNumber?: string | null;
  serviceArea: string;
};

export type CompanyProfile = {
  id: string;
  legalName: string;
  gstNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type B2BOrder = {
  id: string;
  status: string;
  placedAt: string;
  deliveredAt?: string | null;
  subtotalAmount: number;
  totalAmount: number;
  rejectionReason?: string | null;
  retailer?: {
    id: string;
    businessName: string;
    city?: string;
    area?: string;
  };
  wholeseller?: {
    id: string;
    businessName: string;
    serviceArea?: string;
  };
  company?: {
    id: string;
    legalName: string;
  };
  items: Array<{
    medicineId: string;
    brandName: string;
    genericName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  latestPayment?: {
    method: string;
    status: string;
    amount: number;
  } | null;
  latestInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
};

export type B2BMedicine = {
  id: string;
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  mrp: number;
  medicineType: string;
};

export type WholesellerSummary = {
  wholeseller: {
    id: string;
    businessName: string;
    serviceArea: string;
  };
  metrics: {
    totalRetailerOrders: number;
    pendingRetailerOrders: number;
    deliveredRetailerOrders: number;
    revenue: number;
    activeSchemes: number;
    lowStockCount: number;
  };
};

export type CompanySummary = {
  company: {
    id: string;
    legalName: string;
  };
  metrics: {
    medicineCount: number;
    activeOffers: number;
    pendingWholesellerOrders: number;
    deliveredWholesellerOrders: number;
    revenue: number;
  };
};

export type CompanyListItem = CompanyProfile & {
  medicineCount: number;
};

export type WholesellerListItem = WholesellerProfile & {
  activeMedicineCount: number;
};

export type Offer = {
  id: string;
  wholesellerId: string;
  wholesellerName: string;
  title: string;
  description?: string | null;
  status: string;
  discountType?: string | null;
  discountValue?: number | null;
  startsAt: string;
  endsAt: string;
};

const wholesellerCredentials = {
  identifier: 'wholeseller@pharmaconnect.app',
  password: 'Pharma@123',
};

const companyCredentials = {
  identifier: 'company@pharmaconnect.app',
  password: 'Pharma@123',
};

export async function loginDemoWholeseller() {
  const session = await postJson<
    RoleSession<'wholesellerProfile', WholesellerProfile>,
    typeof wholesellerCredentials
  >('/auth/login', wholesellerCredentials);

  if (session.user.role !== 'WHOLESELLER' || !session.user.wholesellerProfile) {
    throw new Error('Demo wholeseller login did not return a wholeseller profile.');
  }

  setApiSessionToken(session.token);
  return session;
}

export async function loginDemoCompany() {
  const session = await postJson<RoleSession<'companyProfile', CompanyProfile>, typeof companyCredentials>(
    '/auth/login',
    companyCredentials,
  );

  if (session.user.role !== 'COMPANY' || !session.user.companyProfile) {
    throw new Error('Demo company login did not return a company profile.');
  }

  setApiSessionToken(session.token);
  return session;
}

export function fetchWholesellerSummary(wholesellerId: string) {
  return getJson<WholesellerSummary>(`/analytics/wholesellers/${wholesellerId}/summary`);
}

export function fetchCompanySummary(companyId: string) {
  return getJson<CompanySummary>(`/analytics/companies/${companyId}/summary`);
}

export function fetchWholesellerRetailerOrders(wholesellerId: string) {
  return getJson<{ wholesellerId: string; orders: B2BOrder[] }>(`/wholesellers/${wholesellerId}/retailer-orders`);
}

export function decideWholesellerRetailerOrder(
  wholesellerId: string,
  orderId: string,
  decision: 'APPROVE' | 'REJECT',
  text?: string,
) {
  const payload =
    decision === 'APPROVE'
      ? { decision, notes: text || 'Wholeseller approved the restock order.' }
      : { decision, rejectionReason: text || 'Stock cannot be fulfilled right now.' };

  return patchJson<{ order: B2BOrder }, typeof payload>(
    `/wholesellers/${wholesellerId}/retailer-orders/${orderId}/decision`,
    payload,
  );
}

export function updateWholesellerRetailerOrderStatus(
  wholesellerId: string,
  orderId: string,
  status: 'DISPATCHED' | 'DELIVERED',
) {
  return patchJson<{ order: B2BOrder }, { status: typeof status }>(
    `/wholesellers/${wholesellerId}/retailer-orders/${orderId}/status`,
    { status },
  );
}

export function fetchCompanies() {
  return getJson<{ companies: CompanyListItem[] }>('/companies');
}

export function fetchCompanyMedicines(companyId: string) {
  return getJson<{ companyId: string; medicines: B2BMedicine[] }>(`/companies/${companyId}/medicines`);
}

export function fetchWholesellerCompanyOrders(wholesellerId: string) {
  return getJson<{ wholesellerId: string; orders: B2BOrder[] }>(`/wholesellers/${wholesellerId}/company-orders`);
}

export function createWholesellerCompanyOrder(wholesellerId: string, companyId: string, medicineId: string) {
  return postJson<
    { order: B2BOrder },
    {
      companyId: string;
      paymentMethod: 'BANK_TRANSFER';
      items: Array<{ medicineId: string; quantity: number }>;
    }
  >(`/wholesellers/${wholesellerId}/company-orders`, {
    companyId,
    paymentMethod: 'BANK_TRANSFER',
    items: [{ medicineId, quantity: 50 }],
  });
}

export function fetchCompanyWholesellerOrders(companyId: string) {
  return getJson<{ companyId: string; orders: B2BOrder[] }>(`/companies/${companyId}/wholeseller-orders`);
}

export function decideCompanyWholesellerOrder(
  companyId: string,
  orderId: string,
  decision: 'APPROVE' | 'REJECT',
  text?: string,
) {
  const payload =
    decision === 'APPROVE'
      ? { decision, notes: text || 'Company approved the bulk order.' }
      : { decision, rejectionReason: text || 'Company cannot fulfil this order right now.' };

  return patchJson<{ order: B2BOrder }, typeof payload>(
    `/companies/${companyId}/wholeseller-orders/${orderId}/decision`,
    payload,
  );
}

export function updateCompanyWholesellerOrderStatus(
  companyId: string,
  orderId: string,
  status: 'DISPATCHED' | 'DELIVERED',
) {
  return patchJson<{ order: B2BOrder }, { status: typeof status }>(
    `/companies/${companyId}/wholeseller-orders/${orderId}/status`,
    { status },
  );
}

export function fetchWholesellers() {
  return getJson<{ wholesellers: WholesellerListItem[] }>('/wholesellers');
}

export function fetchCompanyOffers(companyId: string) {
  return getJson<{ companyId: string; offers: Offer[] }>(`/companies/${companyId}/offers`);
}

export function createCompanyOffer(companyId: string, wholesellerId: string) {
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  return postJson<
    { offer: Offer },
    {
      wholesellerId: string;
      title: string;
      description: string;
      status: 'ACTIVE';
      discountType: string;
      discountValue: number;
      startsAt: string;
      endsAt: string;
    }
  >(`/companies/${companyId}/offers`, {
    wholesellerId,
    title: 'Bulk seasonal supply offer',
    description: 'Demo offer for priority replenishment through PharmaConnect.',
    status: 'ACTIVE',
    discountType: 'PERCENT',
    discountValue: 8,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
}
