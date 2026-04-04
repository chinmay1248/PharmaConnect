import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const retailersRouter = Router();

function pickQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const retailerQuerySchema = z.object({
  city: z.string().optional(),
  area: z.string().optional(),
  q: z.string().optional(),
});

// Returns nearby pharmacies with enough summary information for store comparison screens.
retailersRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = retailerQuerySchema.parse({
      city: pickQueryValue(request.query.city),
      area: pickQueryValue(request.query.area),
      q: pickQueryValue(request.query.q),
    });

    try {
      const retailers: any[] = await prisma.retailer.findMany({
        where: {
          city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
          area: query.area ? { equals: query.area, mode: 'insensitive' } : undefined,
          businessName: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
        },
        include: {
          inventoryItems: {
            where: {
              isActive: true,
              stockQuantity: { gt: 0 },
            },
            include: {
              medicine: true,
            },
          },
        },
        orderBy: [{ rating: 'desc' }, { businessName: 'asc' }],
      });

      response.json({
        retailers: retailers.map((retailer: any) => ({
          id: retailer.id,
          businessName: retailer.businessName,
          area: retailer.area,
          city: retailer.city,
          state: retailer.state,
          postalCode: retailer.postalCode,
          rating: retailer.rating,
          deliveryAvailable: retailer.deliveryAvailable,
          activeMedicineCount: retailer.inventoryItems.length,
          sampleMedicines: retailer.inventoryItems.slice(0, 4).map((item: any) => ({
            medicineId: item.medicine.id,
            brandName: item.medicine.brandName,
            genericName: item.medicine.genericName,
            salePrice: Number(item.salePrice),
          })),
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns one retailer profile plus an inventory snapshot for product detail and store pages.
retailersRouter.get(
  '/:retailerId',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);

    try {
      const retailer: any = await prisma.retailer.findUnique({
        where: { id: retailerId },
        include: {
          owner: {
            select: {
              fullName: true,
              email: true,
              phone: true,
            },
          },
          inventoryItems: {
            where: {
              isActive: true,
              stockQuantity: { gt: 0 },
            },
            include: {
              medicine: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      });

      if (!retailer) {
        throw new HttpError(404, 'Retailer not found');
      }

      response.json({
        retailer: {
          id: retailer.id,
          businessName: retailer.businessName,
          licenseNumber: retailer.licenseNumber,
          area: retailer.area,
          city: retailer.city,
          state: retailer.state,
          postalCode: retailer.postalCode,
          rating: retailer.rating,
          deliveryAvailable: retailer.deliveryAvailable,
          contact: retailer.owner,
          inventory: retailer.inventoryItems.map((item: any) => ({
            inventoryId: item.id,
            medicineId: item.medicine.id,
            brandName: item.medicine.brandName,
            genericName: item.medicine.genericName,
            dosage: item.medicine.dosage,
            packSize: item.medicine.packSize,
            salePrice: Number(item.salePrice),
            stockQuantity: item.stockQuantity,
            availableQuantity: item.stockQuantity - item.reservedQuantity,
          })),
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns retailer inventory filtered to one medicine when the frontend needs a lightweight availability call.
retailersRouter.get(
  '/:retailerId/inventory',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const medicineId = z.string().optional().parse(pickQueryValue(request.query.medicineId));

    try {
      const inventory: any[] = await prisma.retailerInventory.findMany({
        where: {
          retailerId,
          medicineId,
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
        inventory: inventory.map((item: any) => ({
          inventoryId: item.id,
          medicineId: item.medicine.id,
          brandName: item.medicine.brandName,
          genericName: item.medicine.genericName,
          salePrice: Number(item.salePrice),
          stockQuantity: item.stockQuantity,
          reservedQuantity: item.reservedQuantity,
          availableQuantity: item.stockQuantity - item.reservedQuantity,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
