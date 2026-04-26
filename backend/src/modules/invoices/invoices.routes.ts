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

function formatCurrency(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `INR ${safeAmount.toFixed(2)}`;
}

function formatDateTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

function buildInvoiceExportText(invoice: any) {
  const lines = [
    'PharmaConnect Invoice',
    '====================',
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Invoice Status: ${invoice.status}`,
    `Generated At: ${formatDateTime(invoice.generatedAt)}`,
    '',
    `Order ID: ${invoice.order.id}`,
    `Order Status: ${invoice.order.status}`,
    `Delivery Method: ${invoice.order.deliveryMethod === 'HOME_DELIVERY' ? 'Home delivery' : 'Pickup'}`,
    '',
    'Customer',
    '--------',
    `Name: ${invoice.customer.fullName}`,
    `Phone: ${invoice.customer.phone}`,
    `Email: ${invoice.customer.email}`,
    '',
    'Retailer',
    '--------',
    `Name: ${invoice.retailer.businessName}`,
    `Location: ${invoice.retailer.area}, ${invoice.retailer.city}, ${invoice.retailer.state} ${invoice.retailer.postalCode}`,
    '',
    'Items',
    '-----',
  ];

  for (const [index, item] of invoice.items.entries()) {
    lines.push(
      `${index + 1}. ${item.brandName} (${item.genericName}) | Qty: ${item.quantity} | Unit: ${formatCurrency(item.unitPrice)} | Line Total: ${formatCurrency(item.lineTotal)}`,
    );
  }

  lines.push('');
  lines.push('Bill Summary');
  lines.push('------------');
  lines.push(`Subtotal: ${formatCurrency(invoice.order.subtotalAmount)}`);
  lines.push(`Delivery Fee: ${formatCurrency(invoice.order.deliveryFee)}`);
  lines.push(`Total: ${formatCurrency(invoice.order.totalAmount)}`);

  if (invoice.payment) {
    lines.push(`Payment Method: ${invoice.payment.method}`);
    lines.push(`Payment Status: ${invoice.payment.status}`);
    lines.push(`Paid At: ${formatDateTime(invoice.payment.paidAt)}`);
  } else {
    lines.push('Payment: Not available');
  }

  return `${lines.join('\n')}\n`;
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

// Exports one invoice as a downloadable text file for the current prototype download flow.
invoicesRouter.get(
  '/:invoiceId/download',
  asyncHandler(async (request, response) => {
    const invoiceId = String(pickParamValue(request.params.invoiceId));

    try {
      const invoice = await loadInvoiceByWhere({ id: invoiceId });

      if (!invoice) {
        throw new HttpError(404, 'Invoice not found');
      }

      const mapped = mapInvoiceResponse(invoice).invoice;
      const safeFileName = `${mapped.invoiceNumber}.txt`.replace(/[^a-zA-Z0-9_.-]+/g, '_');

      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      response.send(buildInvoiceExportText(mapped));
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
