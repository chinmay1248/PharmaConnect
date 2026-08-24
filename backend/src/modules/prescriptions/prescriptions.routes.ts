import { Router } from 'express';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { StorageService, useS3 } from '../../lib/storage.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification, shortOrderCode } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';
import {
  buildPrescriptionFileUrl,
  buildPrescriptionResourceId,
  buildSignedPrescriptionUrl,
} from '../../lib/prescription-links.js';
import { assertValidSignedLink, hasSignedLinkParams } from '../../lib/signed-links.js';
import {
  assertCustomerOrderAccess,
  assertSelf,
  getAuth,
  optionalAuth,
  requireAuth,
} from '../../middleware/auth.js';

export const prescriptionsRouter = Router();

const maxPrescriptionUploadBytes = 5 * 1024 * 1024;
const allowedPrescriptionMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);

const uploadDraftSchema = z.object({
  customerId: z.string().min(1),
  medicineId: z.string().min(1).optional(),
  source: z.enum(['camera', 'gallery']).default('gallery'),
  originalFileName: z.string().min(1).optional(),
  contentBase64: z.string().min(1).optional(),
  mimeType: z.string().min(3).optional(),
});

const attachPrescriptionSchema = z.object({
  customerId: z.string().min(1),
  medicineId: z.string().min(1).optional(),
  fileUrl: z.string().min(1),
  originalFileName: z.string().min(1).optional(),
});

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildUploadedFileName(customerId: string, source: 'camera' | 'gallery', originalFileName?: string) {
  const fallbackName = `prescription-${source}-${Date.now()}.jpg`;
  const normalized = sanitizeFileName(originalFileName?.trim() || fallbackName);

  return `${customerId.slice(-8)}-${normalized || fallbackName}`;
}

// A pharmacy may open the prescriptions of customers who ordered from it, and nobody else's.
async function assertPrescriptionFileAccess(request: Parameters<typeof getAuth>[0], customerId: string) {
  const auth = getAuth(request);

  if (auth.userId === customerId) {
    return;
  }

  if (auth.role === 'RETAILER' && auth.retailerId) {
    const relatedOrder = await prisma.customerOrder.findFirst({
      where: { customerId, retailerId: auth.retailerId },
      select: { id: true },
    });

    if (relatedOrder) {
      return;
    }
  }

  throw new HttpError(403, 'You cannot access this prescription file.');
}

async function savePrescriptionFile(customerId: string, fileName: string, contentBase64?: string, mimeType?: string) {
  if (!contentBase64) {
    return;
  }

  if (mimeType && !allowedPrescriptionMimeTypes.has(mimeType)) {
    throw new HttpError(400, 'Prescription file must be a JPG, PNG, WEBP, PDF, or text file');
  }

  const fileBuffer = Buffer.from(contentBase64, 'base64');

  if (fileBuffer.length > maxPrescriptionUploadBytes) {
    throw new HttpError(400, 'Prescription file must be 5 MB or smaller');
  }

  const key = `prescriptions/${customerId}/${fileName}`;
  await StorageService.saveFile(key, fileBuffer, mimeType);
}

// Stores a prescription upload draft under backend-controlled local storage for development.
prescriptionsRouter.post(
  '/uploads',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = uploadDraftSchema.parse(request.body);
    assertSelf(request, payload.customerId);

    try {
      const [customer, medicine] = await Promise.all([
        prisma.user.findUnique({
          where: { id: payload.customerId },
        }),
        payload.medicineId
          ? prisma.medicine.findUnique({
              where: { id: payload.medicineId },
            })
          : Promise.resolve(null),
      ]);

      if (!customer || customer.role !== 'CUSTOMER') {
        throw new HttpError(404, 'Customer not found');
      }

      if (payload.medicineId && !medicine) {
        throw new HttpError(404, 'Medicine not found');
      }

      const fileName = buildUploadedFileName(customer.id, payload.source, payload.originalFileName);
      const fileUrl = buildPrescriptionFileUrl(customer.id, fileName);
      await savePrescriptionFile(customer.id, fileName, payload.contentBase64, payload.mimeType);

      response.status(201).json({
        upload: {
          // `fileUrl` is the durable reference the client sends back when attaching the
          // prescription to an order; `previewUrl` is a short-lived link for showing it right away.
          fileUrl,
          previewUrl: buildSignedPrescriptionUrl(fileUrl),
          originalFileName: payload.originalFileName ?? fileName,
          source: payload.source,
          uploadedAt: new Date().toISOString(),
          medicineId: payload.medicineId ?? null,
          mimeType: payload.mimeType ?? null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Serves locally stored prescription files back to customer and retailer screens during development.
prescriptionsRouter.get(
  '/uploads/:customerId/:fileName',
  optionalAuth,
  asyncHandler(async (request, response) => {
    const customerId = sanitizeFileName(String(pickParamValue(request.params.customerId)));
    const fileName = sanitizeFileName(String(pickParamValue(request.params.fileName)));
    const key = `prescriptions/${customerId}/${fileName}`;

    if (hasSignedLinkParams(request.query)) {
      assertValidSignedLink(
        buildPrescriptionResourceId(customerId, fileName),
        request.query,
        'prescription link',
      );
    } else {
      await assertPrescriptionFileAccess(request, customerId);
    }

    if (useS3) {
      response.redirect(await StorageService.getDownloadUrl(key, ''));
      return;
    }

    try {
      const filePath = await StorageService.getLocalFilePath(key);
      await access(filePath);
      response.sendFile(filePath);
    } catch {
      throw new HttpError(404, 'Prescription file not found');
    }
  }),
);

// Returns one order-linked prescription so customer and retailer screens can read the stored metadata.
prescriptionsRouter.get(
  '/customer-orders/:orderId',
  requireAuth,
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));
    await assertCustomerOrderAccess(request, orderId);

    try {
      const order: any = await prisma.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          prescription: {
            include: {
              medicine: true,
              customer: true,
            },
          },
        },
      });

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      if (!order.prescription) {
        response.json({ prescription: null });
        return;
      }

      response.json({
        prescription: {
          id: order.prescription.id,
          customerOrderId: order.id,
          customerId: order.prescription.customerId,
          customerName: order.prescription.customer.fullName,
          medicineId: order.prescription.medicineId,
          medicineName: order.prescription.medicine?.brandName ?? null,
          fileUrl: buildSignedPrescriptionUrl(order.prescription.fileUrl),
          originalFileName: order.prescription.originalFileName,
          status: order.prescription.status,
          retailerNotes: order.prescription.retailerNotes,
          reviewedAt: order.prescription.reviewedAt,
          createdAt: order.prescription.createdAt,
          updatedAt: order.prescription.updatedAt,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Attaches or replaces a prescription after order creation so the API can support both current and future checkout sequences.
prescriptionsRouter.post(
  '/customer-orders/:orderId',
  requireAuth,
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = attachPrescriptionSchema.parse(request.body);
    assertSelf(request, payload.customerId);
    await assertCustomerOrderAccess(request, orderId, { customerOnly: true });

    try {
      const [order, customer, medicine] = await Promise.all([
        prisma.customerOrder.findUnique({
          where: { id: orderId },
          include: {
            prescription: true,
            retailer: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: payload.customerId },
        }),
        payload.medicineId
          ? prisma.medicine.findUnique({
              where: { id: payload.medicineId },
            })
          : Promise.resolve(null),
      ]);

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      if (!customer || customer.role !== 'CUSTOMER') {
        throw new HttpError(404, 'Customer not found');
      }

      if (order.customerId !== customer.id) {
        throw new HttpError(403, 'This order does not belong to the provided customer');
      }

      if (payload.medicineId && !medicine) {
        throw new HttpError(404, 'Medicine not found');
      }

      const savedPrescription: any = await prisma.$transaction(async (transaction: any) => {
        const prescription = order.prescription
          ? await transaction.prescription.update({
              where: { customerOrderId: order.id },
              data: {
                medicineId: payload.medicineId,
                fileUrl: payload.fileUrl,
                originalFileName: payload.originalFileName,
                status: 'UPLOADED',
                retailerNotes: null,
                reviewedAt: null,
              },
            })
          : await transaction.prescription.create({
              data: {
                customerOrderId: order.id,
                customerId: customer.id,
                medicineId: payload.medicineId,
                fileUrl: payload.fileUrl,
                originalFileName: payload.originalFileName,
                status: 'UPLOADED',
              },
            });

        await transaction.deliveryTrackingEvent.create({
          data: {
            customerOrderId: order.id,
            statusLabel: 'Prescription uploaded',
            notes: 'Customer uploaded a prescription for retailer review.',
          },
        });

        await createNotification(transaction, {
          userId: order.retailer.userId,
          type: 'PRESCRIPTION',
          title: 'Prescription uploaded',
          body: `Order ${shortOrderCode(order.id)} has a prescription ready for review.`,
          referenceKind: 'customer_order',
          referenceId: order.id,
        });

        return prescription;
      });

      response.status(201).json({
        prescription: {
          id: savedPrescription.id,
          customerOrderId: order.id,
          customerId: savedPrescription.customerId,
          medicineId: savedPrescription.medicineId,
          fileUrl: buildSignedPrescriptionUrl(savedPrescription.fileUrl),
          originalFileName: savedPrescription.originalFileName,
          status: savedPrescription.status,
          retailerNotes: savedPrescription.retailerNotes,
          reviewedAt: savedPrescription.reviewedAt,
          createdAt: savedPrescription.createdAt,
          updatedAt: savedPrescription.updatedAt,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
