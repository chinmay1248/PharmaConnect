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
