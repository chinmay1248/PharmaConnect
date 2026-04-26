import { apiBaseUrl, getJson, resolveApiUrl } from './api';
import type {
  CustomerOrderSummary,
  CustomerOrderTrackingState,
  DeliveryMethod,
  InvoiceState,
  PaymentMethod,
} from '../screens/customer/customerTypes';

type BackendOrderSummaryResponse = {
  orders: Array<{
    id: string;
    totalAmount: number;
    placedAt: string;
    deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
    retailer: {
      id: string;
      businessName: string;
    };
    items: Array<{
      medicineId: string;
      quantity: number;
      lineTotal: number;
    }>;
    paymentStatus: string;
    paymentMethod?: string | null;
    prescriptionStatus: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    timelineStatus?: string;
  }>;
};

type BackendOrderDetailResponse = {
  order: {
    id: string;
    status: string;
    timelineStatus?: string;
    placedAt: string;
    subtotalAmount: number;
    deliveryFee: number;
    totalAmount: number;
    deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
    rejectionReason?: string | null;
    retailer: {
      id: string;
      businessName: string;
    };
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: number;
    }>;
    prescription?: {
      status?: string;
    } | null;
    payments: Array<{
      method: string;
      status: string;
    }>;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
    }>;
    trackingEvents: Array<{
      id: string;
      statusLabel: string;
      notes?: string | null;
      createdAt?: string;
    }>;
  };
};

type BackendInvoiceResponse = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    pdfUrl?: string | null;
    generatedAt: string;
    retailer: {
      id: string;
      businessName: string;
    };
    order: {
      id: string;
      deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
      subtotalAmount: number;
      deliveryFee: number;
      totalAmount: number;
    };
    items: Array<{
      medicineId: string;
      quantity: number;
      lineTotal: number;
    }>;
    payment: {
      method: string;
      status: string;
    } | null;
  };
};

function toDisplayStatus(status: string | undefined) {
  if (status === 'APPROVED_BY_RETAILER' || status === 'PAYMENT_PENDING' || status === 'PAID') {
    return 'Confirmed';
  }

  if (status === 'PACKED') {
    return 'Packed';
  }

  if (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP') {
    return 'Out for Delivery';
  }

  if (status === 'DELIVERED') {
    return 'Delivered';
  }

  if (status === 'Confirmed' || status === 'Packed' || status === 'Out for Delivery' || status === 'Delivered') {
    return status;
  }

  return 'Order Placed';
}

function toPaymentMethod(method: string | null | undefined): Exclude<PaymentMethod, null> {
  if (method === 'UPI') {
    return 'upi';
  }

  if (method === 'CARD') {
    return 'card';
  }

  if (method === 'BANK_TRANSFER') {
    return 'bank';
  }

  return 'cod';
}

function toDeliveryMethod(method: 'HOME_DELIVERY' | 'PICKUP'): Exclude<DeliveryMethod, null> {
  return method === 'HOME_DELIVERY' ? 'home' : 'pickup';
}

function formatOrderDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export async function fetchCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  const payload = await getJson<BackendOrderSummaryResponse>(`/orders/customer/${customerId}`);

  return payload.orders.map((order) => ({
    id: order.id,
    retailerId: order.retailer.id,
    retailerName: order.retailer.businessName,
    dateLabel: formatOrderDateLabel(order.placedAt),
    status: toDisplayStatus(order.timelineStatus),
    total: order.totalAmount,
    items: order.items.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitPrice: item.quantity > 0 ? item.lineTotal / item.quantity : item.lineTotal,
    })),
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod ?? null,
    prescriptionStatus: order.prescriptionStatus,
    invoiceId: order.invoiceId ?? null,
    invoiceNumber: order.invoiceNumber ?? null,
  }));
}

export async function fetchCustomerOrderDetail(orderId: string): Promise<CustomerOrderTrackingState> {
  const payload = await getJson<BackendOrderDetailResponse>(`/orders/${orderId}`);
  const order = payload.order;

  return {
    id: order.id,
    retailerId: order.retailer.id,
    retailerName: order.retailer.businessName,
    dateLabel: formatOrderDateLabel(order.placedAt),
    status: toDisplayStatus(order.timelineStatus),
    total: order.totalAmount,
    items: order.items.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    paymentStatus: order.payments[0]?.status ?? 'PENDING',
    paymentMethod: order.payments[0]?.method ?? null,
    prescriptionStatus: order.prescription?.status ?? 'NOT_REQUIRED',
    invoiceId: order.invoices[0]?.id ?? null,
    invoiceNumber: order.invoices[0]?.invoiceNumber ?? null,
    deliveryMethod: toDeliveryMethod(order.deliveryMethod),
    rejectionReason: order.rejectionReason ?? null,
    trackingEvents: order.trackingEvents.map((event) => ({
      id: event.id,
      statusLabel: event.statusLabel,
      notes: event.notes ?? null,
      createdAt: event.createdAt ?? null,
    })),
  };
}

export async function fetchCustomerInvoice(orderId: string): Promise<InvoiceState | null> {
  const payload = await getJson<BackendInvoiceResponse>(`/invoices/order/${orderId}`);
  const invoice = payload.invoice;
  const firstItem = invoice.items[0];

  if (!firstItem) {
    return null;
  }

  return {
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNumber,
    pdfUrl: invoice.pdfUrl ? resolveApiUrl(invoice.pdfUrl) : null,
    orderId: invoice.order.id,
    medicineId: firstItem.medicineId,
    retailerId: invoice.retailer.id,
    retailerName: invoice.retailer.businessName,
    quantity: invoice.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: invoice.order.subtotalAmount,
    deliveryFee: invoice.order.deliveryFee,
    total: invoice.order.totalAmount,
    paymentMethod: toPaymentMethod(invoice.payment?.method),
    paymentStatus: invoice.payment?.status ?? 'PENDING',
    deliveryMethod: toDeliveryMethod(invoice.order.deliveryMethod),
    generatedAt: invoice.generatedAt,
    status: invoice.status,
  };
}

export function buildCustomerInvoiceDownloadUrl(invoiceId: string) {
  return `${apiBaseUrl}/invoices/${encodeURIComponent(invoiceId)}/download`;
}
