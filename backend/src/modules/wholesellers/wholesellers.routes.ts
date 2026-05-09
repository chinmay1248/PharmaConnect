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

const retailerOrderDecisionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    notes: z.string().max(240).optional(),
  }),
  z.object({
    decision: z.literal('REJECT'),
    rejectionReason: z.string().min(5).max(240),
  }),
]);

const retailerOrderStatusSchema = z.object({
  status: z.enum(['DISPATCHED', 'DELIVERED']),
  notes: z.string().max(240).optional(),
});

const companyPurchaseOrderCreateSchema = z.object({
  companyId: z.string().min(1),
  paymentMethod: z.enum(['UPI', 'CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']).optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
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
    trackingEvents: order.trackingEvents?.map((event: any) => ({
      id: event.id,
      statusLabel: event.statusLabel,
      notes: event.notes,
      createdAt: event.createdAt,
    })) ?? [],
  };
}

function buildWholesellerPurchaseInvoiceNumber(orderId: string) {
  return `WPO-${orderId.slice(-10).toUpperCase()}`;
}

function mapWholesellerPurchaseOrder(order: any) {
  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    deliveredAt: order.deliveredAt,
    subtotalAmount: Number(order.subtotalAmount),
    offerDiscountAmount: Number(order.offerDiscountAmount),
    totalAmount: Number(order.totalAmount),
    rejectionReason: order.rejectionReason,
    company: {
      id: order.company.id,
      legalName: order.company.legalName,
      contactEmail: order.company.contactEmail,
      contactPhone: order.company.contactPhone,
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
    trackingEvents: order.trackingEvents?.map((event: any) => ({
      id: event.id,
      statusLabel: event.statusLabel,
      notes: event.notes,
      createdAt: event.createdAt,
    })) ?? [],
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

// Lists wholesaler purchase orders sent to companies.
wholesellersRouter.get(
  '/:wholesellerId/company-orders',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));

    try {
      const orders = await prisma.wholesellerPurchaseOrder.findMany({
        where: { wholesellerId },
        include: {
          company: true,
          items: { include: { medicine: true } },
          payments: { orderBy: { createdAt: 'desc' } },
          invoices: { orderBy: { generatedAt: 'desc' } },
          trackingEvents: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { placedAt: 'desc' },
      });

      response.json({
        wholesellerId,
        orders: orders.map(mapWholesellerPurchaseOrder),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Creates a wholesaler purchase order against a company's medicine catalogue.
wholesellersRouter.post(
  '/:wholesellerId/company-orders',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    const payload = companyPurchaseOrderCreateSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const [wholeseller, company, medicines] = await Promise.all([
          transaction.wholeseller.findUnique({ where: { id: wholesellerId } }),
          transaction.company.findUnique({ where: { id: payload.companyId } }),
          transaction.medicine.findMany({
            where: {
              companyId: payload.companyId,
              id: { in: payload.items.map((item) => item.medicineId) },
            },
          }),
        ]);

        if (!wholeseller) {
          throw new HttpError(404, 'Wholeseller not found');
        }

        if (!company) {
          throw new HttpError(404, 'Company not found');
        }

        const medicinesById = new Map<string, any>(medicines.map((medicine: any) => [medicine.id, medicine]));

        for (const item of payload.items) {
          if (!medicinesById.has(item.medicineId)) {
            throw new HttpError(400, 'One or more medicines are not available from this company');
          }
        }

        const subtotalAmount = payload.items.reduce((sum, item) => {
          const medicine = medicinesById.get(item.medicineId);
          return sum + Number(medicine.mrp) * 0.74 * item.quantity;
        }, 0);

        const order = await transaction.wholesellerPurchaseOrder.create({
          data: {
            wholesellerId,
            companyId: payload.companyId,
            subtotalAmount: subtotalAmount.toFixed(2),
            totalAmount: subtotalAmount.toFixed(2),
            items: {
              create: payload.items.map((item) => {
                const medicine = medicinesById.get(item.medicineId)!;
                const unitPrice = Number(medicine.mrp) * 0.74;

                return {
                  medicineId: item.medicineId,
                  quantity: item.quantity,
                  unitPrice: unitPrice.toFixed(2),
                  lineTotal: (unitPrice * item.quantity).toFixed(2),
                };
              }),
            },
            trackingEvents: {
              create: {
                statusLabel: 'Company purchase order placed',
                notes: 'Wholesaler sent a bulk purchase request to the company.',
              },
            },
          },
        });

        if (payload.paymentMethod) {
          await transaction.paymentRecord.create({
            data: {
              wholesellerPurchaseOrderId: order.id,
              method: payload.paymentMethod,
              status: payload.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'SUCCESS',
              amount: subtotalAmount.toFixed(2),
              gatewayReference:
                payload.paymentMethod === 'CASH_ON_DELIVERY'
                  ? undefined
                  : `demo-wpo-${payload.paymentMethod.toLowerCase()}-${Date.now()}`,
              paidAt: payload.paymentMethod === 'CASH_ON_DELIVERY' ? undefined : new Date(),
            },
          });
        }

        await transaction.invoiceRecord.create({
          data: {
            wholesellerPurchaseOrderId: order.id,
            invoiceNumber: buildWholesellerPurchaseInvoiceNumber(order.id),
            status: 'GENERATED',
          },
        });

        await createNotification(transaction, {
          userId: company.userId,
          type: 'ORDER',
          title: 'New wholesaler purchase order',
          body: `${wholeseller.businessName} placed a company purchase order for ${payload.items.length} item${payload.items.length === 1 ? '' : 's'}.`,
          referenceKind: 'wholeseller_purchase_order',
          referenceId: order.id,
        });

        return transaction.wholesellerPurchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            company: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      response.status(201).json({ order: mapWholesellerPurchaseOrder(result) });
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
          trackingEvents: {
            orderBy: { createdAt: 'asc' },
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

// Lets a wholesaler approve or reject retailer restock requests and releases reserved stock on rejection.
wholesellersRouter.patch(
  '/:wholesellerId/retailer-orders/:orderId/decision',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = retailerOrderDecisionSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.retailerPurchaseOrder.findFirst({
          where: { id: orderId, wholesellerId },
          include: {
            retailer: true,
            wholeseller: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Retailer purchase order not found for this wholesaler');
        }

        if (order.status !== 'PENDING_APPROVAL') {
          throw new HttpError(409, `Cannot decide a purchase order while it is ${order.status}`);
        }

        if (payload.decision === 'REJECT') {
          for (const item of order.items as any[]) {
            await transaction.wholesellerInventory.update({
              where: {
                wholesellerId_medicineId: {
                  wholesellerId,
                  medicineId: item.medicineId,
                },
              },
              data: {
                reservedQuantity: { decrement: item.quantity },
              },
            });
          }

          await transaction.retailerPurchaseOrder.update({
            where: { id: order.id },
            data: {
              status: 'REJECTED',
              rejectionReason: payload.rejectionReason,
              trackingEvents: {
                create: {
                  statusLabel: 'Purchase order rejected',
                  notes: payload.rejectionReason,
                },
              },
            },
          });

          await createNotification(transaction, {
            userId: order.retailer.userId,
            type: 'ORDER',
            title: 'Restock order rejected',
            body: `${order.wholeseller.businessName} rejected your restock order: ${payload.rejectionReason}`,
            referenceKind: 'retailer_purchase_order',
            referenceId: order.id,
          });
        } else {
          const latestPayment = order.payments[0];
          const nextStatus = latestPayment?.status === 'SUCCESS' ? 'PAID' : latestPayment ? 'PAYMENT_PENDING' : 'APPROVED';

          await transaction.retailerPurchaseOrder.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              rejectionReason: null,
              trackingEvents: {
                create: {
                  statusLabel: 'Purchase order approved',
                  notes: payload.notes ?? 'Wholesaler approved the retailer restock request.',
                },
              },
            },
          });

          await createNotification(transaction, {
            userId: order.retailer.userId,
            type: 'ORDER',
            title: 'Restock order approved',
            body: `${order.wholeseller.businessName} approved your restock order.`,
            referenceKind: 'retailer_purchase_order',
            referenceId: order.id,
          });
        }

        return transaction.retailerPurchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            retailer: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      response.json({ order: mapRetailerPurchaseOrder(result) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Advances an approved retailer purchase order through wholesaler dispatch.
wholesellersRouter.patch(
  '/:wholesellerId/retailer-orders/:orderId/status',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = retailerOrderStatusSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.retailerPurchaseOrder.findFirst({
          where: { id: orderId, wholesellerId },
          include: {
            retailer: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Retailer purchase order not found for this wholesaler');
        }

        if (payload.status === 'DISPATCHED' && !['APPROVED', 'PAID'].includes(order.status)) {
          throw new HttpError(409, `Cannot dispatch a purchase order while it is ${order.status}`);
        }

        if (payload.status === 'DELIVERED' && order.status !== 'DISPATCHED') {
          throw new HttpError(409, `Cannot mark delivered while purchase order is ${order.status}`);
        }

        if (payload.status === 'DISPATCHED') {
          for (const item of order.items as any[]) {
            await transaction.wholesellerInventory.update({
              where: {
                wholesellerId_medicineId: {
                  wholesellerId,
                  medicineId: item.medicineId,
                },
              },
              data: {
                stockQuantity: { decrement: item.quantity },
                reservedQuantity: { decrement: item.quantity },
              },
            });
          }
        }

        await transaction.retailerPurchaseOrder.update({
          where: { id: order.id },
          data: {
            status: payload.status,
            deliveredAt: payload.status === 'DELIVERED' ? new Date() : undefined,
            trackingEvents: {
              create: {
                statusLabel: payload.status === 'DISPATCHED' ? 'Stock dispatched' : 'Stock delivered',
                notes: payload.notes ?? (payload.status === 'DISPATCHED'
                  ? 'Wholesaler dispatched the restock shipment.'
                  : 'Wholesaler marked the shipment delivered.'),
              },
            },
          },
        });

        await createNotification(transaction, {
          userId: order.retailer.userId,
          type: 'DELIVERY',
          title: payload.status === 'DISPATCHED' ? 'Restock order dispatched' : 'Restock order delivered',
          body: `Purchase order ${order.id.slice(-8).toUpperCase()} is ${payload.status.toLowerCase().replace(/_/g, ' ')}.`,
          referenceKind: 'retailer_purchase_order',
          referenceId: order.id,
        });

        return transaction.retailerPurchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            retailer: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      response.json({ order: mapRetailerPurchaseOrder(result) });
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
