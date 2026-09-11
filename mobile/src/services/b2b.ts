import { getJson, patchJson, postJson } from './api';

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
  schemeDiscountAmount?: number;
  offerDiscountAmount?: number;
  trackingEvents?: Array<{
    id?: string;
    statusLabel: string;
    notes?: string | null;
    createdAt?: string;
  }>;
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

export type B2BInventoryItem = {
  inventoryId: string;
  medicineId: string;
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  medicineType?: 'OTC' | 'PRESCRIPTION';
  salePrice: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel?: number | null;
  isActive?: boolean;
  batches?: Array<{
    id: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchasePrice?: number | null;
  }>;
};

export type Scheme = {
  id: string;
  wholesellerId: string;
  retailerId?: string | null;
  retailerName?: string | null;
  title: string;
  description?: string | null;
  status: string;
  discountType?: string | null;
  discountValue?: number | null;
  startsAt: string;
  endsAt: string;
};

export type RetailerListItem = {
  id: string;
  businessName: string;
  city?: string | null;
  area?: string | null;
};

export type B2BPaymentMethod = 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';

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

export function createWholesellerCompanyOrder(
  wholesellerId: string,
  companyId: string,
  items: Array<{ medicineId: string; quantity: number }>,
  paymentMethod: B2BPaymentMethod = 'BANK_TRANSFER',
) {
  return postJson<
    { order: B2BOrder },
    {
      companyId: string;
      paymentMethod: B2BPaymentMethod;
      items: Array<{ medicineId: string; quantity: number }>;
    }
  >(`/wholesellers/${wholesellerId}/company-orders`, { companyId, paymentMethod, items });
}

export function fetchWholesellerInventory(wholesellerId: string) {
  return getJson<{ wholesellerId: string; inventory: B2BInventoryItem[] }>(
    `/wholesellers/${wholesellerId}/inventory`,
  );
}

export function addWholesellerInventory(
  wholesellerId: string,
  payload: {
    medicineId: string;
    salePrice: number;
    stockQuantity: number;
    reorderLevel?: number;
    batch?: { batchNumber: string; quantity: number; purchasePrice?: number; expiryDate: string };
  },
) {
  return postJson<{ inventory: B2BInventoryItem }, typeof payload>(
    `/wholesellers/${wholesellerId}/inventory`,
    payload,
  );
}

export function updateWholesellerInventory(
  wholesellerId: string,
  inventoryId: string,
  payload: { salePrice?: number; stockQuantity?: number; reorderLevel?: number | null; isActive?: boolean },
) {
  return patchJson<{ inventory: B2BInventoryItem }, typeof payload>(
    `/wholesellers/${wholesellerId}/inventory/${inventoryId}`,
    payload,
  );
}

export function addWholesellerInventoryBatch(
  wholesellerId: string,
  inventoryId: string,
  payload: { batchNumber: string; quantity: number; purchasePrice?: number; expiryDate: string },
) {
  return postJson<
    { batch: { id: string; batchNumber: string; quantity: number; purchasePrice?: number | null; expiryDate: string } },
    typeof payload
  >(`/wholesellers/${wholesellerId}/inventory/${inventoryId}/batches`, payload);
}

export function fetchWholesellerSchemes(wholesellerId: string) {
  return getJson<{ wholesellerId: string; schemes: Scheme[] }>(
    `/wholesellers/${wholesellerId}/schemes`,
  );
}

export function createWholesellerScheme(
  wholesellerId: string,
  payload: {
    retailerId?: string;
    title: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE';
    discountType?: string;
    discountValue?: number;
    startsAt: string;
    endsAt: string;
  },
) {
  return postJson<{ scheme: Scheme }, typeof payload>(
    `/wholesellers/${wholesellerId}/schemes`,
    payload,
  );
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

export function fetchRetailers() {
  return getJson<{ retailers: RetailerListItem[] }>('/retailers');
}

export function fetchCompanyOffers(companyId: string) {
  return getJson<{ companyId: string; offers: Offer[] }>(`/companies/${companyId}/offers`);
}

export function createCompanyOffer(
  companyId: string,
  payload: {
    wholesellerId: string;
    title: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE';
    discountType?: string;
    discountValue?: number;
    startsAt: string;
    endsAt: string;
  },
) {
  return postJson<{ offer: Offer }, typeof payload>(`/companies/${companyId}/offers`, payload);
}

export function addCompanyMedicine(
  companyId: string,
  payload: {
    brandName: string;
    genericName: string;
    dosage: string;
    packSize: string;
    mrp: number;
    medicineType?: 'OTC' | 'PRESCRIPTION';
    isGeneric?: boolean;
    description?: string;
  },
) {
  return postJson<{ medicine: B2BMedicine }, typeof payload>(
    `/companies/${companyId}/medicines`,
    payload,
  );
}

export function updateCompanyMedicine(
  companyId: string,
  medicineId: string,
  payload: {
    mrp?: number;
    medicineType?: 'OTC' | 'PRESCRIPTION';
    dosage?: string;
    packSize?: string;
    isGeneric?: boolean;
    description?: string;
  },
) {
  return patchJson<{ medicine: B2BMedicine }, typeof payload>(
    `/companies/${companyId}/medicines/${medicineId}`,
    payload,
  );
}
