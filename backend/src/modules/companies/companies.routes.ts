import { Prisma, type OfferStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const companiesRouter = Router();

const companyQuerySchema = z.object({
  q: z.string().optional(),
});

const offerSchema = z.object({
  wholesellerId: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
  discountType: z.string().min(2).max(40).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

const wholesellerOrderDecisionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    notes: z.string().max(240).optional(),
  }),
  z.object({
    decision: z.literal('REJECT'),
    rejectionReason: z.string().min(5).max(240),
  }),
]);

const wholesellerOrderStatusSchema = z.object({
  status: z.enum(['DISPATCHED', 'DELIVERED']),
  notes: z.string().max(240).optional(),
});

function pickQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function mapCompany(company: any) {
  return {
    id: company.id,
    legalName: company.legalName,
    gstNumber: company.gstNumber,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    owner: company.owner
      ? {
          fullName: company.owner.fullName,
          email: company.owner.email,
          phone: company.owner.phone,
        }
      : null,
  };
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
    wholeseller: {
      id: order.wholeseller.id,
      businessName: order.wholeseller.businessName,
      serviceArea: order.wholeseller.serviceArea,
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

// Lists companies so wholesalers can discover suppliers.
companiesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = companyQuerySchema.parse({
      q: pickQueryValue(request.query.q),
    });

    try {
      const companies = await prisma.company.findMany({
        where: {
          legalName: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
        },
        include: {
          owner: true,
          medicines: true,
        },
        orderBy: {
          legalName: 'asc',
        },
      });

      response.json({
        companies: companies.map((company: any) => ({
          ...mapCompany(company),
          medicineCount: company.medicines.length,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns one company's medicine catalogue for wholesaler buy screens.
companiesRouter.get(
  '/:companyId/medicines',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));

    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });

      if (!company) {
        throw new HttpError(404, 'Company not found');
      }

      const medicines = await prisma.medicine.findMany({
        where: { companyId },
        include: {
          compositions: {
            include: {
              saltComposition: true,
            },
          },
          diseases: {
            include: {
              disease: true,
            },
          },
        },
        orderBy: {
          brandName: 'asc',
        },
      });

      response.json({
        companyId,
        medicines: medicines.map((medicine: any) => ({
          id: medicine.id,
          brandName: medicine.brandName,
          genericName: medicine.genericName,
          dosage: medicine.dosage,
          packSize: medicine.packSize,
          description: medicine.description,
          medicineType: medicine.medicineType,
          mrp: Number(medicine.mrp),
          isGeneric: medicine.isGeneric,
          salts: medicine.compositions.map((composition: any) => ({
            name: composition.saltComposition.name,
            strength: composition.strength,
            unit: composition.unit,
          })),
          uses: medicine.diseases.map((relation: any) => relation.disease.name),
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lists wholesaler purchase orders received by a company.
companiesRouter.get(
  '/:companyId/wholeseller-orders',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));

    try {
      const orders = await prisma.wholesellerPurchaseOrder.findMany({
        where: { companyId },
        include: {
          wholeseller: true,
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
        companyId,
        orders: orders.map(mapWholesellerPurchaseOrder),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lets a company approve or reject wholesaler bulk purchase orders.
companiesRouter.patch(
  '/:companyId/wholeseller-orders/:orderId/decision',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = wholesellerOrderDecisionSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.wholesellerPurchaseOrder.findFirst({
          where: { id: orderId, companyId },
          include: {
            wholeseller: true,
            company: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Wholeseller purchase order not found for this company');
        }

        if (order.status !== 'PENDING_APPROVAL') {
          throw new HttpError(409, `Cannot decide a purchase order while it is ${order.status}`);
        }

        if (payload.decision === 'REJECT') {
          await transaction.wholesellerPurchaseOrder.update({
            where: { id: order.id },
            data: {
              status: 'REJECTED',
              rejectionReason: payload.rejectionReason,
              trackingEvents: {
                create: {
                  statusLabel: 'Company purchase order rejected',
                  notes: payload.rejectionReason,
                },
              },
            },
          });

          await createNotification(transaction, {
            userId: order.wholeseller.userId,
            type: 'ORDER',
            title: 'Company purchase order rejected',
            body: `${order.company.legalName} rejected your purchase order: ${payload.rejectionReason}`,
            referenceKind: 'wholeseller_purchase_order',
            referenceId: order.id,
          });
        } else {
          const latestPayment = order.payments[0];
          const nextStatus = latestPayment?.status === 'SUCCESS' ? 'PAID' : latestPayment ? 'PAYMENT_PENDING' : 'APPROVED';

          await transaction.wholesellerPurchaseOrder.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              rejectionReason: null,
              trackingEvents: {
                create: {
                  statusLabel: 'Company purchase order approved',
                  notes: payload.notes ?? 'Company approved the wholesaler purchase request.',
                },
              },
            },
          });

          await createNotification(transaction, {
            userId: order.wholeseller.userId,
            type: 'ORDER',
            title: 'Company purchase order approved',
            body: `${order.company.legalName} approved your purchase order.`,
            referenceKind: 'wholeseller_purchase_order',
            referenceId: order.id,
          });
        }

        return transaction.wholesellerPurchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            wholeseller: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      response.json({ order: mapWholesellerPurchaseOrder(result) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Advances company fulfilment for a wholesaler bulk order.
companiesRouter.patch(
  '/:companyId/wholeseller-orders/:orderId/status',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));
    const orderId = String(pickParamValue(request.params.orderId));
    const payload = wholesellerOrderStatusSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.wholesellerPurchaseOrder.findFirst({
          where: { id: orderId, companyId },
          include: {
            wholeseller: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Wholeseller purchase order not found for this company');
        }

        if (payload.status === 'DISPATCHED' && !['APPROVED', 'PAID'].includes(order.status)) {
          throw new HttpError(409, `Cannot dispatch a purchase order while it is ${order.status}`);
        }

        if (payload.status === 'DELIVERED' && order.status !== 'DISPATCHED') {
          throw new HttpError(409, `Cannot mark delivered while purchase order is ${order.status}`);
        }

        await transaction.wholesellerPurchaseOrder.update({
          where: { id: order.id },
          data: {
            status: payload.status,
            deliveredAt: payload.status === 'DELIVERED' ? new Date() : undefined,
            trackingEvents: {
              create: {
                statusLabel: payload.status === 'DISPATCHED' ? 'Company shipment dispatched' : 'Company shipment delivered',
                notes: payload.notes ?? (payload.status === 'DISPATCHED'
                  ? 'Company dispatched the bulk shipment.'
                  : 'Company marked the bulk shipment delivered.'),
              },
            },
          },
        });

        if (payload.status === 'DELIVERED') {
          for (const item of order.items as any[]) {
            await transaction.wholesellerInventory.upsert({
              where: {
                wholesellerId_medicineId: {
                  wholesellerId: order.wholesellerId,
                  medicineId: item.medicineId,
                },
              },
              update: {
                stockQuantity: { increment: item.quantity },
                salePrice: (Number(item.unitPrice) * 1.18).toFixed(2),
                isActive: true,
              },
              create: {
                wholesellerId: order.wholesellerId,
                medicineId: item.medicineId,
                stockQuantity: item.quantity,
                salePrice: (Number(item.unitPrice) * 1.18).toFixed(2),
                reorderLevel: Math.max(20, Math.floor(item.quantity * 0.2)),
                isActive: true,
              },
            });
          }
        }

        await createNotification(transaction, {
          userId: order.wholeseller.userId,
          type: 'DELIVERY',
          title: payload.status === 'DISPATCHED' ? 'Company shipment dispatched' : 'Company shipment delivered',
          body: `Company purchase order ${order.id.slice(-8).toUpperCase()} is ${payload.status.toLowerCase().replace(/_/g, ' ')}.`,
          referenceKind: 'wholeseller_purchase_order',
          referenceId: order.id,
        });

        return transaction.wholesellerPurchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            wholeseller: true,
            items: { include: { medicine: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { generatedAt: 'desc' } },
            trackingEvents: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      response.json({ order: mapWholesellerPurchaseOrder(result) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lists offers created by one company.
companiesRouter.get(
  '/:companyId/offers',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));
    const wholesellerId = z.string().optional().parse(pickQueryValue(request.query.wholesellerId));

    try {
      const offers = await prisma.offer.findMany({
        where: {
          companyId,
          wholesellerId,
        },
        include: {
          wholeseller: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      response.json({
        companyId,
        offers: offers.map((offer: any) => ({
          id: offer.id,
          wholesellerId: offer.wholesellerId,
          wholesellerName: offer.wholeseller.businessName,
          title: offer.title,
          description: offer.description,
          status: offer.status,
          discountType: offer.discountType,
          discountValue: offer.discountValue ? Number(offer.discountValue) : null,
          startsAt: offer.startsAt,
          endsAt: offer.endsAt,
          acceptedAt: offer.acceptedAt,
          rejectedAt: offer.rejectedAt,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Creates a company offer and alerts the target wholesaler.
companiesRouter.post(
  '/:companyId/offers',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));
    const payload = offerSchema.parse(request.body ?? {});

    if (payload.endsAt <= payload.startsAt) {
      throw new HttpError(400, 'Offer end date must be after start date');
    }

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const [company, wholeseller] = await Promise.all([
          transaction.company.findUnique({
            where: { id: companyId },
          }),
          transaction.wholeseller.findUnique({
            where: { id: payload.wholesellerId },
          }),
        ]);

        if (!company) {
          throw new HttpError(404, 'Company not found');
        }

        if (!wholeseller) {
          throw new HttpError(404, 'Wholeseller not found');
        }

        const offer = await transaction.offer.create({
          data: {
            companyId,
            wholesellerId: payload.wholesellerId,
            title: payload.title,
            description: payload.description,
            status: payload.status as OfferStatus,
            discountType: payload.discountType,
            discountValue:
              payload.discountValue === undefined ? undefined : new Prisma.Decimal(payload.discountValue),
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
          },
        });

        await createNotification(transaction, {
          userId: wholeseller.userId,
          type: 'OFFER',
          title: 'New company offer',
          body: `${payload.title} is available from ${company.legalName}.`,
          referenceKind: 'offer',
          referenceId: offer.id,
        });

        return offer;
      });

      response.status(201).json({
        offer: {
          id: result.id,
          companyId: result.companyId,
          wholesellerId: result.wholesellerId,
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
