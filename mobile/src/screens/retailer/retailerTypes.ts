export type RetailerTab = 'dashboard' | 'orders' | 'inventory' | 'buy' | 'analytics';

export type RetailerProfile = {
  id: string;
  businessName: string;
  licenseNumber?: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  rating: number;
  deliveryAvailable: boolean;
  contact?: {
    fullName: string;
    email: string;
    phone: string;
  } | null;
};

export type RetailerSession = {
  token: string;
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    phone: string;
    retailerProfile?: RetailerProfile | null;
  };
};

export type RetailerInventoryItem = {
  inventoryId: string;
  medicineId: string;
  brandName: string;
  genericName: string;
  dosage?: string;
  packSize?: string;
  salePrice: number;
  stockQuantity: number;
  reservedQuantity?: number;
  availableQuantity: number;
  reorderLevel?: number | null;
};

export type RetailerOrder = {
  id: string;
  status: string;
  timelineStatus: string;
  placedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
  rejectionReason?: string | null;
  subtotalAmount: number;
  deliveryFee: number;
  totalAmount: number;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  deliveryAddress?: {
    line1: string;
    line2?: string | null;
    area: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  items: Array<{
    id?: string;
    medicineId: string;
    brandName: string;
    genericName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  prescription?: {
    id: string;
    status: string;
    fileUrl: string;
    originalFileName?: string | null;
    retailerNotes?: string | null;
    reviewedAt?: string | null;
  } | null;
  latestPayment?: {
    method: string;
    status: string;
    amount: number;
    paidAt?: string | null;
  } | null;
  latestInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    generatedAt?: string | null;
  } | null;
  latestTrackingEvent?: {
    statusLabel: string;
    notes?: string | null;
    createdAt?: string;
  } | null;
};

export type RetailerSummary = {
  retailer: {
    id: string;
    businessName: string;
  };
  metrics: {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    revenue: number;
    lowStockCount: number;
  };
  stockAlerts: Array<{
    inventoryId: string;
    medicineId: string;
    brandName: string;
    availableQuantity: number;
    reorderLevel?: number | null;
  }>;
};

export type WholesellerSummary = {
  id: string;
  businessName: string;
  gstNumber?: string | null;
  serviceArea: string;
  activeMedicineCount: number;
  contact?: {
    fullName: string;
    email: string;
    phone: string;
  } | null;
};

export type WholesellerInventoryItem = {
  inventoryId: string;
  medicineId: string;
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  salePrice: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel?: number | null;
};

export type RetailerPurchaseOrder = {
  id: string;
  status: string;
  placedAt: string;
  deliveredAt?: string | null;
  subtotalAmount: number;
  schemeDiscountAmount: number;
  totalAmount: number;
  rejectionReason?: string | null;
  wholeseller: {
    id: string;
    businessName: string;
    serviceArea: string;
  };
  items: Array<{
    id: string;
    medicineId: string;
    brandName: string;
    genericName: string;
    dosage: string;
    packSize: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  latestPayment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
    paidAt?: string | null;
  } | null;
  latestInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
  trackingEvents?: Array<{
    id?: string;
    statusLabel: string;
    notes?: string | null;
    createdAt?: string;
  }>;
};
