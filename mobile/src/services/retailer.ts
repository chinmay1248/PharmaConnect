import { getJson, patchJson, postJson } from './api';
import type {
  RetailerInventoryItem,
  RetailerOrder,
  RetailerPurchaseOrder,
  RetailerProfile,
  RetailerSummary,
  WholesellerInventoryItem,
  WholesellerSummary,
} from '../screens/retailer/retailerTypes';

type RetailerProfileResponse = {
  retailer: RetailerProfile & {
    inventory: RetailerInventoryItem[];
  };
};

type RetailerOrdersResponse = {
  summary: {
    total: number;
    pendingAction: number;
    active: number;
  };
  orders: RetailerOrder[];
};

type RetailerOrderResponse = {
  order: RetailerOrder;
};

type WholesellersResponse = {
  wholesellers: WholesellerSummary[];
};

type WholesellerInventoryResponse = {
  wholesellerId: string;
  inventory: WholesellerInventoryItem[];
};

type RetailerInventoryResponse = {
  inventory: RetailerInventoryItem;
};

type RetailerPurchaseOrdersResponse = {
  retailerId: string;
  orders: RetailerPurchaseOrder[];
};

type RetailerPurchaseOrderResponse = {
  order: RetailerPurchaseOrder;
};

type CreatePurchaseOrderPayload = {
  wholesellerId: string;
  paymentMethod?: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
  items: Array<{
    medicineId: string;
    quantity: number;
  }>;
};

export async function fetchRetailerProfile(retailerId: string) {
  return getJson<RetailerProfileResponse>(`/retailers/${retailerId}`);
}

export async function fetchRetailerSummary(retailerId: string) {
  return getJson<RetailerSummary>(`/analytics/retailers/${retailerId}/summary`);
}

export async function fetchRetailerOrders(retailerId: string, status?: string) {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}&limit=40` : '?limit=40';
  return getJson<RetailerOrdersResponse>(`/retailers/${retailerId}/customer-orders${query}`);
}

export async function decideRetailerOrder(
  retailerId: string,
  orderId: string,
  decision: 'APPROVE' | 'REJECT',
  reasonOrNotes?: string,
) {
  const payload =
    decision === 'APPROVE'
      ? { decision, notes: reasonOrNotes || undefined }
      : { decision, rejectionReason: reasonOrNotes || 'Rejected by retailer after review.' };

  return patchJson<RetailerOrderResponse, typeof payload>(
    `/retailers/${retailerId}/customer-orders/${orderId}/decision`,
    payload,
  );
}

type DeliveryDispatchDetails = {
  courierName?: string;
  courierPhone?: string;
  vehicleNumber?: string;
  etaMinutes?: number;
};

export type RetailerDeliveryTracking = {
  id: string;
  courierName: string;
  courierPhone?: string | null;
  vehicleNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  etaMinutes?: number | null;
  lastLocationAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  isLive: boolean;
};

export async function updateRetailerOrderStatus(
  retailerId: string,
  orderId: string,
  status: 'PACKED' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'DELIVERED',
  notes?: string,
  delivery?: DeliveryDispatchDetails,
) {
  return patchJson<RetailerOrderResponse, { status: typeof status; notes?: string } & DeliveryDispatchDetails>(
    `/retailers/${retailerId}/customer-orders/${orderId}/status`,
    { status, notes, ...delivery },
  );
}

// Pushes a courier position or ETA update for an order that is already out for delivery.
export async function updateRetailerOrderDelivery(
  retailerId: string,
  orderId: string,
  payload: {
    latitude?: number;
    longitude?: number;
    etaMinutes?: number;
    courierName?: string;
    courierPhone?: string;
    vehicleNumber?: string;
  },
) {
  return patchJson<{ delivery: RetailerDeliveryTracking }, typeof payload>(
    `/retailers/${retailerId}/customer-orders/${orderId}/delivery`,
    payload,
  );
}

export async function fetchWholesellers() {
  return getJson<WholesellersResponse>('/wholesellers');
}

export async function fetchWholesellerInventory(wholesellerId: string) {
  return getJson<WholesellerInventoryResponse>(`/wholesellers/${wholesellerId}/inventory`);
}

export async function updateRetailerInventory(
  retailerId: string,
  inventoryId: string,
  payload: {
    salePrice?: number;
    stockQuantity?: number;
    reorderLevel?: number | null;
  },
) {
  return patchJson<RetailerInventoryResponse, typeof payload>(
    `/retailers/${retailerId}/inventory/${inventoryId}`,
    payload,
  );
}

export async function addRetailerInventoryBatch(
  retailerId: string,
  inventoryId: string,
  payload: {
    batchNumber: string;
    quantity: number;
    purchasePrice?: number;
    expiryDate: string;
  },
) {
  return postJson<
    {
      batch: {
        id: string;
        batchNumber: string;
        quantity: number;
        purchasePrice?: number | null;
        expiryDate: string;
      };
    },
    typeof payload
  >(`/retailers/${retailerId}/inventory/${inventoryId}/batches`, payload);
}

export async function fetchRetailerPurchaseOrders(retailerId: string) {
  return getJson<RetailerPurchaseOrdersResponse>(`/retailers/${retailerId}/purchase-orders`);
}

export async function createRetailerPurchaseOrder(retailerId: string, payload: CreatePurchaseOrderPayload) {
  return postJson<RetailerPurchaseOrderResponse, CreatePurchaseOrderPayload>(
    `/retailers/${retailerId}/purchase-orders`,
    payload,
  );
}

export async function confirmRetailerPurchaseReceipt(retailerId: string, orderId: string) {
  return patchJson<RetailerPurchaseOrderResponse, Record<string, never>>(
    `/retailers/${retailerId}/purchase-orders/${orderId}/confirm-receipt`,
    {},
  );
}
