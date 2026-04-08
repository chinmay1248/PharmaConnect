import type { InvoiceState, DeliveryMethod, PaymentMethod } from '../screens/customer/customerTypes';
import { postJson } from './api';

type DemoCustomerLoginResponse = {
  token: string;
  user: {
    id: string;
    role: 'CUSTOMER' | string;
    fullName: string;
    phone: string;
    addresses: Array<{
      id: string;
      isDefault: boolean;
    }>;
  };
};

type CreateOrderResponse = {
  order: {
    id: string;
    status: string;
    deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
    subtotalAmount: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY' | null;
    prescriptionStatus: string;
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
  nextStep: string;
};

type BackendCreateOrderPayload = {
  customerId: string;
  retailerId: string;
  deliveryAddressId?: string;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
  paymentMethod: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
  prescription?: {
    fileUrl: string;
    originalFileName: string;
  };
  items: Array<{
    medicineId: string;
    quantity: number;
  }>;
};

type CreateDemoOrderInput = {
  retailerId: string;
  medicineId: string;
  quantity: number;
  paymentMethod: Exclude<PaymentMethod, null>;
  deliveryMethod: Exclude<DeliveryMethod, null>;
  prescriptionUploaded: boolean;
  prescriptionRequired: boolean;
};

type DemoCustomerContext = {
  customerId: string;
  deliveryAddressId?: string;
};

export type CreatedOrderResult = {
  orderId: string;
  displayStatus: 'Order Placed' | 'Confirmed' | 'Packed' | 'Out for Delivery' | 'Delivered';
  subtotal: number;
  deliveryFee: number;
  total: number;
  quantity: number;
  retailerId: string;
  medicineId: string;
  invoice: InvoiceState;
  nextStep: string;
};

const demoCustomerCredentials = {
  identifier: 'customer@pharmaconnect.app',
  password: 'Pharma@123',
};

let demoCustomerContextPromise: Promise<DemoCustomerContext> | null = null;

function toBackendDeliveryMethod(value: Exclude<DeliveryMethod, null>) {
  return value === 'home' ? 'HOME_DELIVERY' : 'PICKUP';
}

function toBackendPaymentMethod(value: Exclude<PaymentMethod, null>) {
  if (value === 'upi') {
    return 'UPI';
  }

  if (value === 'card') {
    return 'CARD';
  }

  if (value === 'bank') {
    return 'BANK_TRANSFER';
  }

  return 'CASH_ON_DELIVERY';
}

function toDisplayStatus(status: string): CreatedOrderResult['displayStatus'] {
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

  return 'Order Placed';
}

async function ensureDemoCustomerContext() {
  if (!demoCustomerContextPromise) {
    demoCustomerContextPromise = postJson<DemoCustomerLoginResponse, typeof demoCustomerCredentials>(
      '/auth/login',
      demoCustomerCredentials,
    ).then((payload) => {
      if (payload.user.role !== 'CUSTOMER') {
        throw new Error('Demo customer login returned a non-customer user.');
      }

      const defaultAddress = payload.user.addresses.find((address) => address.isDefault) ?? payload.user.addresses[0];

      return {
        customerId: payload.user.id,
        deliveryAddressId: defaultAddress?.id,
      };
    });
  }

  return demoCustomerContextPromise;
}

export async function createDemoCustomerOrder(input: CreateDemoOrderInput): Promise<CreatedOrderResult> {
  const customer = await ensureDemoCustomerContext();
  const paymentMethod = toBackendPaymentMethod(input.paymentMethod);
  const deliveryMethod = toBackendDeliveryMethod(input.deliveryMethod);

  const payload: BackendCreateOrderPayload = {
    customerId: customer.customerId,
    retailerId: input.retailerId,
    deliveryAddressId: deliveryMethod === 'HOME_DELIVERY' ? customer.deliveryAddressId : undefined,
    deliveryMethod,
    paymentMethod,
    items: [
      {
        medicineId: input.medicineId,
        quantity: input.quantity,
      },
    ],
    prescription:
      input.prescriptionRequired && input.prescriptionUploaded
        ? {
            fileUrl: 'https://example.com/pharmaconnect/demo-prescription.jpg',
            originalFileName: 'demo-prescription.jpg',
          }
        : undefined,
  };

  const response = await postJson<CreateOrderResponse, BackendCreateOrderPayload>('/orders', payload);
  const firstItem = response.order.items[0];

  return {
    orderId: response.order.id,
    displayStatus: toDisplayStatus(response.order.status),
    subtotal: response.order.subtotalAmount,
    deliveryFee: response.order.deliveryFee,
    total: response.order.totalAmount,
    quantity: firstItem?.quantity ?? input.quantity,
    retailerId: input.retailerId,
    medicineId: firstItem?.medicineId ?? input.medicineId,
    nextStep: response.nextStep,
    invoice: {
      invoiceNo: 'Invoice pending',
      orderId: response.order.id,
      medicineId: firstItem?.medicineId ?? input.medicineId,
      retailerId: input.retailerId,
      quantity: firstItem?.quantity ?? input.quantity,
      subtotal: response.order.subtotalAmount,
      deliveryFee: response.order.deliveryFee,
      total: response.order.totalAmount,
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
    },
  };
}
