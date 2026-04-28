import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification, shortOrderCode } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const prescriptionsRouter = Router();

const uploadDraftSchema = z.object({
  customerId: z.string().min(1),
  medicineId: z.string().min(1).optional(),
  source: z.enum(['camera', 'gallery']).default('gallery'),
  originalFileName: z.string().min(1).optional(),
});

const attachPrescriptionSchema = z.object({
  customerId: z.string().min(1),
  medicineId: z.string().min(1).optional(),
  fileUrl: z.string().url(),
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

function buildPrescriptionFileUrl(customerId: string, fileName: string) {
  return `https://uploads.pharmaconnect.app/prescriptions/${customerId}/${fileName}`;
}

// Simulates a validated prescription upload so the mobile app can stop depending on a hardcoded file URL.
prescriptionsRouter.post(
  '/uploads',
  asyncHandler(async (request, response) => {
    const payload = uploadDraftSchema.parse(request.body);

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

      response.status(201).json({
        upload: {
          fileUrl,
          originalFileName: payload.originalFileName ?? fileName,
          source: payload.source,
          uploadedAt: new Date().toISOString(),
          medicineId: payload.medicineId ?? null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns one order-linked prescription so customer and retailer screens can read the stored metadata.
prescriptionsRouter.get(
  '/customer-orders/:orderId',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));

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
          fileUrl: order.prescription.fileUrl,
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
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = attachPrescriptionSchema.parse(request.body);

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
          fileUrl: savedPrescription.fileUrl,
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
