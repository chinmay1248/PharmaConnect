import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const paymentsRouter = Router();

const confirmPaymentSchema = z.object({
  gatewayReference: z.string().min(3).optional(),
});

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function buildInvoiceNumber(orderId: string) {
  return `INV-${orderId.slice(-10).toUpperCase()}`;
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

// Simulates payment confirmation so the current prototype can move the order into a paid state.
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

        const updatedPayment = await transaction.paymentRecord.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            gatewayReference: payload.gatewayReference ?? `demo-${payment.method.toLowerCase()}-${Date.now()}`,
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
