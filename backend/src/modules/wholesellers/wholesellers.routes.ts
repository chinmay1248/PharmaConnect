import { Prisma, type SchemeStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const wholesellersRouter = Router();

const wholesellerQuerySchema = z.object({
  q: z.string().optional(),
  serviceArea: z.string().optional(),
});

const schemeSchema = z.object({
  retailerId: z.string().min(1).optional(),
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
  discountType: z.string().min(2).max(40).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

function pickQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function mapWholeseller(wholeseller: any) {
  return {
    id: wholeseller.id,
    businessName: wholeseller.businessName,
    gstNumber: wholeseller.gstNumber,
    serviceArea: wholeseller.serviceArea,
    contact: wholeseller.owner
      ? {
          fullName: wholeseller.owner.fullName,
          email: wholeseller.owner.email,
          phone: wholeseller.owner.phone,
        }
      : null,
  };
}

function mapRetailerPurchaseOrder(order: any) {
  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    deliveredAt: order.deliveredAt,
    subtotalAmount: Number(order.subtotalAmount),
    schemeDiscountAmount: Number(order.schemeDiscountAmount),
    totalAmount: Number(order.totalAmount),
    rejectionReason: order.rejectionReason,
    retailer: {
      id: order.retailer.id,
      businessName: order.retailer.businessName,
      city: order.retailer.city,
      area: order.retailer.area,
    },
    items: order.items.map((item: any) => ({
      medicineId: item.medicineId,
      brandName: item.medicine.brandName,
      genericName: item.medicine.genericName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    latestPayment: order.payments[0]
      ? {
          method: order.payments[0].method,
          status: order.payments[0].status,
          amount: Number(order.payments[0].amount),
          paidAt: order.payments[0].paidAt,
        }
      : null,
    latestInvoice: order.invoices[0]
      ? {
          id: order.invoices[0].id,
          invoiceNumber: order.invoices[0].invoiceNumber,
          status: order.invoices[0].status,
        }
      : null,
  };
}

// Lists wholesalers for retailer restock discovery.
wholesellersRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = wholesellerQuerySchema.parse({
      q: pickQueryValue(request.query.q),
      serviceArea: pickQueryValue(request.query.serviceArea),
    });

    try {
      const wholesellers = await prisma.wholeseller.findMany({
        where: {
          businessName: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
          serviceArea: query.serviceArea ? { contains: query.serviceArea, mode: 'insensitive' } : undefined,
        },
        include: {
          owner: true,
          inventoryItems: {
            where: {
              isActive: true,
              stockQuantity: { gt: 0 },
            },
          },
        },
        orderBy: {
          businessName: 'asc',
        },
      });

      response.json({
        wholesellers: wholesellers.map((wholeseller: any) => ({
          ...mapWholeseller(wholeseller),
          activeMedicineCount: wholeseller.inventoryItems.length,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns one wholesaler's available inventory for retailer buy screens.
wholesellersRouter.get(
  '/:wholesellerId/inventory',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));

    try {
      const inventory = await prisma.wholesellerInventory.findMany({
        where: {
          wholesellerId,
          isActive: true,
        },
        include: {
          medicine: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      response.json({
        wholesellerId,
        inventory: inventory.map((item: any) => ({
          inventoryId: item.id,
          medicineId: item.medicineId,
          brandName: item.medicine.brandName,
          genericName: item.medicine.genericName,
          dosage: item.medicine.dosage,
          packSize: item.medicine.packSize,
          salePrice: Number(item.salePrice),
          stockQuantity: item.stockQuantity,
          reservedQuantity: item.reservedQuantity,
          availableQuantity: item.stockQuantity - item.reservedQuantity,
          reorderLevel: item.reorderLevel,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lists retailer purchase orders received by a wholesaler.
wholesellersRouter.get(
  '/:wholesellerId/retailer-orders',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));

    try {
      const orders = await prisma.retailerPurchaseOrder.findMany({
        where: { wholesellerId },
        include: {
          retailer: true,
          items: {
            include: {
              medicine: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          invoices: {
            orderBy: { generatedAt: 'desc' },
          },
        },
        orderBy: {
          placedAt: 'desc',
        },
      });

      response.json({
        wholesellerId,
        orders: orders.map(mapRetailerPurchaseOrder),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lists schemes created by a wholesaler for all retailers or one targeted retailer.
wholesellersRouter.get(
  '/:wholesellerId/schemes',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    const retailerId = z.string().optional().parse(pickQueryValue(request.query.retailerId));

    try {
      const schemes = await prisma.scheme.findMany({
        where: {
          wholesellerId,
          retailerId,
        },
        include: {
          retailer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      response.json({
        wholesellerId,
        schemes: schemes.map((scheme: any) => ({
          id: scheme.id,
          retailerId: scheme.retailerId,
          retailerName: scheme.retailer?.businessName ?? null,
          title: scheme.title,
          description: scheme.description,
          status: scheme.status,
          discountType: scheme.discountType,
          discountValue: scheme.discountValue ? Number(scheme.discountValue) : null,
          startsAt: scheme.startsAt,
          endsAt: scheme.endsAt,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Creates a wholesaler scheme and alerts a targeted retailer when present.
wholesellersRouter.post(
  '/:wholesellerId/schemes',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    const payload = schemeSchema.parse(request.body ?? {});

    if (payload.endsAt <= payload.startsAt) {
      throw new HttpError(400, 'Scheme end date must be after start date');
    }

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const wholeseller = await transaction.wholeseller.findUnique({
          where: { id: wholesellerId },
        });

        if (!wholeseller) {
          throw new HttpError(404, 'Wholeseller not found');
        }

        const retailer = payload.retailerId
          ? await transaction.retailer.findUnique({
              where: { id: payload.retailerId },
            })
          : null;

        if (payload.retailerId && !retailer) {
          throw new HttpError(404, 'Retailer not found');
        }

        const scheme = await transaction.scheme.create({
          data: {
            wholesellerId,
            retailerId: payload.retailerId,
            title: payload.title,
            description: payload.description,
            status: payload.status as SchemeStatus,
            discountType: payload.discountType,
            discountValue:
              payload.discountValue === undefined ? undefined : new Prisma.Decimal(payload.discountValue),
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
          },
        });

        await createNotification(transaction, {
          userId: retailer?.userId,
          type: 'SCHEME',
          title: 'New wholesaler scheme',
          body: `${payload.title} is available from ${wholeseller.businessName}.`,
          referenceKind: 'scheme',
          referenceId: scheme.id,
        });

        return scheme;
      });

      response.status(201).json({
        scheme: {
          id: result.id,
          wholesellerId: result.wholesellerId,
          retailerId: result.retailerId,
          title: result.title,
          description: result.description,
          status: result.status,
          discountType: result.discountType,
          discountValue: result.discountValue ? Number(result.discountValue) : null,
          startsAt: result.startsAt,
          endsAt: result.endsAt,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
