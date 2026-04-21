import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const invoicesRouter = Router();

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadInvoiceByWhere(where: Record<string, string>) {
  return prisma.invoiceRecord.findFirst({
    where,
    include: {
      customerOrder: {
        include: {
          customer: true,
          retailer: true,
          items: {
            include: {
              medicine: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          deliveryAddress: true,
        },
      },
    },
  });
}

function mapInvoiceResponse(invoice: any) {
  const order = invoice.customerOrder;

  if (!order) {
    throw new HttpError(404, 'Customer invoice details are not available');
  }

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      pdfUrl: invoice.pdfUrl,
      generatedAt: invoice.generatedAt,
      order: {
        id: order.id,
        status: order.status,
        deliveryMethod: order.deliveryMethod,
        subtotalAmount: Number(order.subtotalAmount),
        deliveryFee: Number(order.deliveryFee),
        totalAmount: Number(order.totalAmount),
      },
      customer: {
        id: order.customer.id,
        fullName: order.customer.fullName,
        phone: order.customer.phone,
        email: order.customer.email,
      },
      retailer: {
        id: order.retailer.id,
        businessName: order.retailer.businessName,
        area: order.retailer.area,
        city: order.retailer.city,
        state: order.retailer.state,
        postalCode: order.retailer.postalCode,
      },
      deliveryAddress: order.deliveryAddress,
      items: order.items.map((item: any) => ({
        medicineId: item.medicineId,
        brandName: item.medicine.brandName,
        genericName: item.medicine.genericName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      payment:
        order.payments[0]
          ? {
              id: order.payments[0].id,
              method: order.payments[0].method,
              status: order.payments[0].status,
              amount: Number(order.payments[0].amount),
              gatewayReference: order.payments[0].gatewayReference,
              paidAt: order.payments[0].paidAt,
            }
          : null,
    },
  };
}

// Returns the invoice for one customer order so the mobile bill view can use backend data.
invoicesRouter.get(
  '/order/:orderId',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));

    try {
      const invoice = await loadInvoiceByWhere({ customerOrderId: orderId });

      if (!invoice) {
        throw new HttpError(404, 'Invoice not found');
      }

      response.json(mapInvoiceResponse(invoice));
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns one invoice record with bill details for invoice screen and download actions.
invoicesRouter.get(
  '/:invoiceId',
  asyncHandler(async (request, response) => {
    const invoiceId = String(pickParamValue(request.params.invoiceId));

    try {
      const invoice = await loadInvoiceByWhere({ id: invoiceId });

      if (!invoice) {
        throw new HttpError(404, 'Invoice not found');
      }

      response.json(mapInvoiceResponse(invoice));
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
