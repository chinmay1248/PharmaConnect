import { Router } from 'express';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification, shortOrderCode } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const paymentsRouter = Router();

const confirmPaymentSchema = z.object({
  gatewayReference: z.string().min(3).optional(),
  razorpayOrderId: z.string().min(3).optional(),
  razorpayPaymentId: z.string().min(3).optional(),
  razorpaySignature: z.string().min(3).optional(),
});

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
};

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function buildInvoiceNumber(orderId: string) {
  return `INV-${orderId.slice(-10).toUpperCase()}`;
}

function hasRazorpayCredentials() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function buildRazorpayAuthHeader() {
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

function amountToPaise(amount: unknown) {
  return Math.round(Number(amount) * 100);
}

function verifyRazorpaySignature(payload: z.infer<typeof confirmPaymentSchema>, storedRazorpayOrderId: string | null) {
  if (!payload.razorpayOrderId && !payload.razorpayPaymentId && !payload.razorpaySignature) {
    return null;
  }

  if (!payload.razorpayOrderId || !payload.razorpayPaymentId || !payload.razorpaySignature) {
    throw new HttpError(400, 'Razorpay order id, payment id, and signature are required together');
  }

  if (!env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(400, 'Razorpay verification is not configured on this server');
  }

  if (!storedRazorpayOrderId) {
    throw new HttpError(400, 'No Razorpay order is stored for this payment');
  }

  if (payload.razorpayOrderId !== storedRazorpayOrderId) {
    throw new HttpError(400, 'Razorpay order id does not match this payment');
  }

  const expectedSignature = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${storedRazorpayOrderId}|${payload.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== payload.razorpaySignature) {
    throw new HttpError(400, 'Razorpay payment signature is invalid');
  }

  return payload.razorpayPaymentId;
}

async function createRazorpayOrder(order: any, payment: any) {
  const receipt = shortOrderCode(order.id);
  const gatewayResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: buildRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountToPaise(payment.amount),
      currency: 'INR',
      receipt,
      notes: {
        customerOrderId: order.id,
        paymentRecordId: payment.id,
      },
    }),
  });

  const payload = (await gatewayResponse.json().catch(() => null)) as RazorpayOrderResponse | { error?: { description?: string } } | null;

  if (!gatewayResponse.ok) {
    const message =
      payload && 'error' in payload && payload.error?.description
        ? payload.error.description
        : 'Razorpay order creation failed';

    throw new HttpError(502, message);
  }

  return payload as RazorpayOrderResponse;
}

// Returns the stored payment attempt for a customer order so checkout screens can show status.
paymentsRouter.get(
  '/customer-orders/:orderId',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));

    try {
      const order: any = await prisma.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      const payment = order.payments[0];

      response.json({
        payment: payment
          ? {
              id: payment.id,
              method: payment.method,
              status: payment.status,
              amount: Number(payment.amount),
              gatewayReference: payment.gatewayReference,
              paidAt: payment.paidAt,
            }
          : null,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Creates a gateway payment order when Razorpay credentials are configured; otherwise returns demo checkout metadata.
paymentsRouter.post(
  '/customer-orders/:orderId/initiate',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));

    try {
      const order: any = await prisma.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      const payment = order.payments[0];

      if (!payment) {
        throw new HttpError(400, 'No payment method has been selected for this order');
      }

      if (payment.method === 'CASH_ON_DELIVERY') {
        response.json({
          mode: 'cash',
          payment: {
            id: payment.id,
            method: payment.method,
            status: payment.status,
            amount: Number(payment.amount),
            gatewayReference: payment.gatewayReference,
          },
          gatewayOrder: null,
        });
        return;
      }

      if (!hasRazorpayCredentials()) {
        response.json({
          mode: 'demo',
          payment: {
            id: payment.id,
            method: payment.method,
            status: payment.status,
            amount: Number(payment.amount),
            gatewayReference: payment.gatewayReference,
          },
          gatewayOrder: {
            id: `demo-order-${order.id}`,
            currency: 'INR',
            amount: amountToPaise(payment.amount),
            receipt: shortOrderCode(order.id),
          },
        });
        return;
      }

      const gatewayOrder = await createRazorpayOrder(order, payment);
      const updatedPayment = await prisma.paymentRecord.update({
        where: { id: payment.id },
        data: {
          gatewayReference: gatewayOrder.id,
        },
      });

      response.json({
        mode: 'razorpay',
        keyId: env.RAZORPAY_KEY_ID,
        payment: {
          id: updatedPayment.id,
          method: updatedPayment.method,
          status: updatedPayment.status,
          amount: Number(updatedPayment.amount),
          gatewayReference: updatedPayment.gatewayReference,
        },
        gatewayOrder: {
          id: gatewayOrder.id,
          currency: gatewayOrder.currency,
          amount: gatewayOrder.amount,
          receipt: gatewayOrder.receipt,
          status: gatewayOrder.status,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Confirms a payment after demo checkout or a verified Razorpay signature.
paymentsRouter.post(
  '/customer-orders/:orderId/confirm',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = confirmPaymentSchema.parse(request.body ?? {});

    try {
      const result: any = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.customerOrder.findUnique({
          where: { id: orderId },
          include: {
            retailer: true,
            payments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            invoices: {
              orderBy: {
                generatedAt: 'desc',
              },
            },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Order not found');
        }

        const payment = order.payments[0];

        if (!payment) {
          throw new HttpError(400, 'No payment method has been selected for this order');
        }

        const verifiedGatewayReference = verifyRazorpaySignature(payload, payment.gatewayReference);

        const updatedPayment = await transaction.paymentRecord.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            gatewayReference:
              verifiedGatewayReference ?? payload.gatewayReference ?? `demo-${payment.method.toLowerCase()}-${Date.now()}`,
            paidAt: new Date(),
          },
        });

        const updatedOrder = await transaction.customerOrder.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            approvedAt: order.approvedAt ?? new Date(),
            trackingEvents: {
              create: {
                statusLabel: 'Payment confirmed',
                notes: `Customer payment was captured through ${payment.method}.`,
              },
            },
          },
        });

        const invoice =
          order.invoices[0] ??
          (await transaction.invoiceRecord.create({
            data: {
              customerOrderId: order.id,
              invoiceNumber: buildInvoiceNumber(order.id),
              status: 'GENERATED',
            },
          }));

        await createNotification(transaction, {
          userId: order.customerId,
          type: 'PAYMENT',
          title: 'Payment confirmed',
          body: `Payment for order ${shortOrderCode(order.id)} was confirmed.`,
          referenceKind: 'customer_order',
          referenceId: order.id,
        });

        await createNotification(transaction, {
          userId: order.retailer.userId,
          type: 'PAYMENT',
          title: 'Customer payment received',
          body: `Order ${shortOrderCode(order.id)} is paid and ready for fulfilment.`,
          referenceKind: 'customer_order',
          referenceId: order.id,
        });

        return {
          order: updatedOrder,
          payment: updatedPayment,
          invoice,
        };
      });

      response.json({
        payment: {
          id: result.payment.id,
          method: result.payment.method,
          status: result.payment.status,
          amount: Number(result.payment.amount),
          gatewayReference: result.payment.gatewayReference,
          paidAt: result.payment.paidAt,
        },
        order: {
          id: result.order.id,
          status: result.order.status,
        },
        invoice: {
          id: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          status: result.invoice.status,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
