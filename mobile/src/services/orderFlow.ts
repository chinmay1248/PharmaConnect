import type {
  CustomerSession,
  InvoiceState,
  DeliveryMethod,
  PaymentMethod,
  PrescriptionUpload,
} from '../screens/customer/customerTypes';
import { postJson } from './api';
import { openRazorpayCheckout } from './razorpayCheckout';

type CreateOrderResponse = {
  order: {
    id: string;
    status: string;
    timelineStatus?: string;
    deliveryMethod: 'HOME_DELIVERY' | 'PICKUP';
    subtotalAmount: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY' | null;
    paymentStatus?: string;
    prescriptionStatus: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
  nextStep: string;
};

type ConfirmPaymentResponse = {
  payment: {
    status: string;
    gatewayReference?: string | null;
  };
  order: {
    id: string;
    status: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  };
};

type PaymentInitiationResponse = {
  mode: 'cash' | 'demo' | 'razorpay';
  keyId?: string;
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    gatewayReference?: string | null;
  };
  gatewayOrder: {
    id: string;
    currency: string;
    amount: number;
    receipt: string;
    status?: string;
  } | null;
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
  prescriptionRequired: boolean;
  prescriptionUpload?: PrescriptionUpload | null;
};

type DemoCustomerContext = {
  customerId: string;
  deliveryAddressId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

export type CreatedOrderResult = {
  orderId: string;
  displayStatus: 'Order Placed' | 'Confirmed' | 'Packed' | 'Out for Delivery' | 'Delivered';
  paymentFlow: 'cash' | 'demo_confirmed' | 'gateway_pending' | 'pending';
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
    demoCustomerContextPromise = postJson<CustomerSession, typeof demoCustomerCredentials>(
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
        fullName: payload.user.fullName,
        email: payload.user.email,
        phone: payload.user.phone,
      };
    });
  }

  return demoCustomerContextPromise;
}

export function buildCustomerOrderContext(session: CustomerSession): DemoCustomerContext {
  const defaultAddress = session.user.addresses.find((address) => address.isDefault) ?? session.user.addresses[0];

  return {
    customerId: session.user.id,
    deliveryAddressId: defaultAddress?.id,
    fullName: session.user.fullName,
    email: session.user.email,
    phone: session.user.phone,
  };
}

export async function createCustomerOrder(
  input: CreateDemoOrderInput,
  customerContext?: DemoCustomerContext,
): Promise<CreatedOrderResult> {
  const customer = customerContext ?? (await ensureDemoCustomerContext());
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
      input.prescriptionRequired && input.prescriptionUpload
        ? {
            fileUrl: input.prescriptionUpload.fileUrl,
            originalFileName: input.prescriptionUpload.originalFileName,
          }
        : undefined,
  };

  const response = await postJson<CreateOrderResponse, BackendCreateOrderPayload>('/orders', payload);
  let confirmedPayment: ConfirmPaymentResponse | null = null;
  let paymentInitiation: PaymentInitiationResponse | null = null;

  if (paymentMethod !== 'CASH_ON_DELIVERY') {
    try {
      paymentInitiation = await postJson<PaymentInitiationResponse, Record<string, never>>(
        `/payments/customer-orders/${response.order.id}/initiate`,
        {},
      );

      if (paymentInitiation.mode === 'demo') {
        confirmedPayment = await postJson<ConfirmPaymentResponse, { gatewayReference: string }>(
          `/payments/customer-orders/${response.order.id}/confirm`,
          {
            gatewayReference: paymentInitiation.gatewayOrder?.id ?? `demo-${paymentMethod.toLowerCase()}-${Date.now()}`,
          },
        );
      } else if (paymentInitiation.mode === 'razorpay' && paymentInitiation.keyId && paymentInitiation.gatewayOrder) {
        const checkoutResponse = await openRazorpayCheckout({
          keyId: paymentInitiation.keyId,
          orderId: paymentInitiation.gatewayOrder.id,
          amount: paymentInitiation.gatewayOrder.amount,
          currency: paymentInitiation.gatewayOrder.currency,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
        });

        confirmedPayment = await postJson<
          ConfirmPaymentResponse,
          {
            razorpayOrderId: string;
            razorpayPaymentId: string;
            razorpaySignature: string;
          }
        >(`/payments/customer-orders/${response.order.id}/confirm`, {
          razorpayOrderId: checkoutResponse.razorpay_order_id,
          razorpayPaymentId: checkoutResponse.razorpay_payment_id,
          razorpaySignature: checkoutResponse.razorpay_signature,
        });
      }
    } catch {
      confirmedPayment = null;
    }
  }

  const firstItem = response.order.items[0];

  return {
    orderId: response.order.id,
    displayStatus: toDisplayStatus(confirmedPayment?.order.status ?? response.order.timelineStatus ?? response.order.status),
    paymentFlow:
      paymentMethod === 'CASH_ON_DELIVERY'
        ? 'cash'
        : confirmedPayment
          ? 'demo_confirmed'
          : paymentInitiation?.mode === 'razorpay'
            ? 'gateway_pending'
            : 'pending',
    subtotal: response.order.subtotalAmount,
    deliveryFee: response.order.deliveryFee,
    total: response.order.totalAmount,
    quantity: firstItem?.quantity ?? input.quantity,
    retailerId: input.retailerId,
    medicineId: firstItem?.medicineId ?? input.medicineId,
    nextStep: response.nextStep,
    invoice: {
      invoiceId: confirmedPayment?.invoice.id ?? response.order.invoiceId ?? null,
      invoiceNo: confirmedPayment?.invoice.invoiceNumber ?? response.order.invoiceNumber ?? 'Invoice pending',
      orderId: response.order.id,
      medicineId: firstItem?.medicineId ?? input.medicineId,
      retailerId: input.retailerId,
      quantity: firstItem?.quantity ?? input.quantity,
      subtotal: response.order.subtotalAmount,
      deliveryFee: response.order.deliveryFee,
      total: response.order.totalAmount,
      paymentMethod: input.paymentMethod,
      paymentStatus: confirmedPayment?.payment.status ?? response.order.paymentStatus ?? 'PENDING',
      paymentGatewayOrderId: paymentInitiation?.gatewayOrder?.id ?? null,
      deliveryMethod: input.deliveryMethod,
      status: confirmedPayment?.invoice.status ?? null,
    },
  };
}
