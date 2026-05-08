import { Router } from 'express';
import { createHmac } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
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
      pdfUrl: invoice.pdfUrl ?? buildSignedInvoiceDownloadPath(invoice.id),
      downloadUrl: buildSignedInvoiceDownloadPath(invoice.id),
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

function getInvoiceLinkSecret() {
  return env.INVOICE_LINK_SECRET || env.DATABASE_URL;
}

function signInvoiceDownload(invoiceId: string, expiresAt: number) {
  return createHmac('sha256', getInvoiceLinkSecret()).update(`${invoiceId}.${expiresAt}`).digest('hex');
}

function buildSignedInvoiceDownloadPath(invoiceId: string) {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const signature = signInvoiceDownload(invoiceId, expiresAt);

  return `/api/invoices/${encodeURIComponent(invoiceId)}/download?expires=${expiresAt}&signature=${signature}`;
}

function getInvoiceStorageRoot() {
  return path.join(process.cwd(), 'storage', 'invoices');
}

function buildInvoiceStorageFileName(invoiceId: string) {
  return `${invoiceId}.pdf`;
}

function buildInvoiceDownloadPath(invoiceId: string) {
  return `/api/invoices/${encodeURIComponent(invoiceId)}/download`;
}

function getInvoiceStoragePath(invoiceId: string) {
  const filePath = path.join(getInvoiceStorageRoot(), buildInvoiceStorageFileName(invoiceId));

  if (!filePath.startsWith(getInvoiceStorageRoot())) {
    throw new HttpError(400, 'Invalid invoice file path');
  }

  return filePath;
}

function validateInvoiceDownloadSignature(invoiceId: string, expires: unknown, signature: unknown) {
  if (expires === undefined && signature === undefined) {
    return;
  }

  const expiresAt = Number(Array.isArray(expires) ? expires[0] : expires);
  const providedSignature = String(Array.isArray(signature) ? signature[0] : signature ?? '');

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    throw new HttpError(403, 'Invoice download link has expired');
  }

  const expectedSignature = signInvoiceDownload(invoiceId, expiresAt);

  if (providedSignature !== expectedSignature) {
    throw new HttpError(403, 'Invoice download link is invalid');
  }
}

function escapePdfText(value: unknown) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}

function buildInvoiceLines(invoice: any) {
  const lines = [
    'PharmaConnect Invoice',
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Invoice Status: ${invoice.status}`,
    `Generated At: ${formatDateTime(invoice.generatedAt)}`,
    `Order ID: ${invoice.order.id}`,
    `Order Status: ${invoice.order.status}`,
    `Delivery Method: ${invoice.order.deliveryMethod === 'HOME_DELIVERY' ? 'Home delivery' : 'Pickup'}`,
    '',
    'Customer',
    `Name: ${invoice.customer.fullName}`,
    `Phone: ${invoice.customer.phone}`,
    `Email: ${invoice.customer.email}`,
    '',
    'Retailer',
    `Name: ${invoice.retailer.businessName}`,
    `Location: ${invoice.retailer.area}, ${invoice.retailer.city}, ${invoice.retailer.state} ${invoice.retailer.postalCode}`,
    '',
    'Items',
  ];

  for (const [index, item] of invoice.items.entries()) {
    lines.push(
      `${index + 1}. ${item.brandName} (${item.genericName}) | Qty: ${item.quantity} | Unit: ${formatCurrency(item.unitPrice)} | Line Total: ${formatCurrency(item.lineTotal)}`,
    );
  }

  lines.push('');
  lines.push('Bill Summary');
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

  return lines;
}

function buildInvoicePdf(invoice: any) {
  const pageWidth = 595;
  const pageHeight = 842;
  const contentLines = buildInvoiceLines(invoice).slice(0, 42);
  const textCommands = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    '(PharmaConnect Invoice) Tj',
    '/F1 10 Tf',
    '0 -24 Td',
    ...contentLines.slice(1).flatMap((line) => ['0 -15 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(textCommands, 'utf8')} >>\nstream\n${textCommands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

async function loadOrCreateInvoicePdf(invoiceRecord: any, mappedInvoice: any) {
  const filePath = getInvoiceStoragePath(invoiceRecord.id);

  try {
    await access(filePath);
    return readFile(filePath);
  } catch {
    const pdf = buildInvoicePdf(mappedInvoice);
    await mkdir(getInvoiceStorageRoot(), { recursive: true });
    await writeFile(filePath, pdf);

    if (!invoiceRecord.pdfUrl) {
      await prisma.invoiceRecord.update({
        where: { id: invoiceRecord.id },
        data: { pdfUrl: buildInvoiceDownloadPath(invoiceRecord.id) },
      });
    }

    return pdf;
  }
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

// Exports one invoice as a generated PDF. Signed links are returned by invoice detail endpoints.
invoicesRouter.get(
  '/:invoiceId/download',
  asyncHandler(async (request, response) => {
    const invoiceId = String(pickParamValue(request.params.invoiceId));

    try {
      validateInvoiceDownloadSignature(invoiceId, request.query.expires, request.query.signature);

      const invoice = await loadInvoiceByWhere({ id: invoiceId });

      if (!invoice) {
        throw new HttpError(404, 'Invoice not found');
      }

      const mapped = mapInvoiceResponse(invoice).invoice;
      const safeFileName = `${mapped.invoiceNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]+/g, '_');

      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      response.send(await loadOrCreateInvoicePdf(invoice, mapped));
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
