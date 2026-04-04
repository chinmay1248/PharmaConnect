import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const medicinesRouter = Router();

function pickQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const medicineQuerySchema = z.object({
  q: z.string().optional(),
  generic: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  prescriptionOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const retailerQuerySchema = z.object({
  sort: z.enum(['closest', 'cheapest', 'rating']).default('closest'),
  city: z.string().optional(),
  area: z.string().optional(),
});

// Returns searchable medicines with enough metadata for the home/search pages.
medicinesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = medicineQuerySchema.parse({
      q: pickQueryValue(request.query.q),
      generic: pickQueryValue(request.query.generic),
      prescriptionOnly: pickQueryValue(request.query.prescriptionOnly),
      limit: pickQueryValue(request.query.limit),
    });

    try {
      const medicines: any[] = await prisma.medicine.findMany({
        where: {
          isGeneric: query.generic ? true : undefined,
          medicineType: query.prescriptionOnly ? 'PRESCRIPTION' : undefined,
          OR: query.q
            ? [
                { brandName: { contains: query.q, mode: 'insensitive' } },
                { genericName: { contains: query.q, mode: 'insensitive' } },
                {
                  searchAliases: {
                    some: {
                      alias: { contains: query.q, mode: 'insensitive' },
                    },
                  },
                },
                {
                  compositions: {
                    some: {
                      saltComposition: {
                        name: { contains: query.q, mode: 'insensitive' },
                      },
                    },
                  },
                },
              ]
            : undefined,
        },
        take: query.limit,
        include: {
          company: true,
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
          retailerInventoryItems: {
            where: {
              isActive: true,
              stockQuantity: { gt: 0 },
            },
            include: {
              retailer: true,
            },
          },
        },
        orderBy: [{ brandName: 'asc' }],
      });

      response.json({
        medicines: medicines.map((medicine: any) => ({
          id: medicine.id,
          brandName: medicine.brandName,
          genericName: medicine.genericName,
          dosage: medicine.dosage,
          packSize: medicine.packSize,
          mrp: Number(medicine.mrp),
          medicineType: medicine.medicineType,
          isGeneric: medicine.isGeneric,
          company: medicine.company?.legalName ?? null,
          salts: medicine.compositions.map(
            (composition: any) =>
              `${composition.saltComposition.name} ${composition.strength}${composition.unit}`,
          ),
          uses: medicine.diseases.map((entry: any) => entry.disease.name),
          retailerCount: medicine.retailerInventoryItems.length,
          lowestPrice:
            medicine.retailerInventoryItems.length > 0
              ? Math.min(...medicine.retailerInventoryItems.map((item: any) => Number(item.salePrice)))
              : null,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns a single medicine record with detail page content and substitute-related metadata.
medicinesRouter.get(
  '/:medicineId',
  asyncHandler(async (request, response) => {
    const medicineId = String(request.params.medicineId);

    try {
      const medicine: any = await prisma.medicine.findUnique({
        where: { id: medicineId },
        include: {
          company: true,
          searchAliases: true,
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
      });

      if (!medicine) {
        throw new HttpError(404, 'Medicine not found');
      }

      const substitutes: any[] = await prisma.medicine.findMany({
        where: {
          id: { not: medicine.id },
          genericName: medicine.genericName,
        },
        take: 6,
        orderBy: [{ mrp: 'asc' }],
      });

      response.json({
        medicine: {
          id: medicine.id,
          brandName: medicine.brandName,
          genericName: medicine.genericName,
          dosage: medicine.dosage,
          packSize: medicine.packSize,
          description: medicine.description,
          mrp: Number(medicine.mrp),
          medicineType: medicine.medicineType,
          isGeneric: medicine.isGeneric,
          company: medicine.company?.legalName ?? null,
          aliases: medicine.searchAliases.map((alias: any) => alias.alias),
          salts: medicine.compositions.map((composition: any) => ({
            name: composition.saltComposition.name,
            strength: composition.strength,
            unit: composition.unit,
          })),
          uses: medicine.diseases.map((entry: any) => entry.disease.name),
          substitutes: substitutes.map((entry: any) => ({
            id: entry.id,
            brandName: entry.brandName,
            genericName: entry.genericName,
            dosage: entry.dosage,
            mrp: Number(entry.mrp),
          })),
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns retailer options for one medicine so the frontend can sort by closest, cheapest, or top-rated.
medicinesRouter.get(
  '/:medicineId/retailers',
  asyncHandler(async (request, response) => {
    const medicineId = String(request.params.medicineId);
    const query = retailerQuerySchema.parse({
      sort: pickQueryValue(request.query.sort),
      city: pickQueryValue(request.query.city),
      area: pickQueryValue(request.query.area),
    });

    try {
      const retailers: any[] = await prisma.retailerInventory.findMany({
        where: {
          medicineId,
          isActive: true,
          stockQuantity: { gt: 0 },
        },
        include: {
          retailer: true,
        },
      });

      const sortedRetailers = [...retailers].sort((left, right) => {
        if (query.sort === 'cheapest') {
          return Number(left.salePrice) - Number(right.salePrice);
        }

        if (query.sort === 'rating') {
          return right.retailer.rating - left.retailer.rating;
        }

        const leftScore =
          (query.city && left.retailer.city.toLowerCase() === query.city.toLowerCase() ? 2 : 0) +
          (query.area && left.retailer.area.toLowerCase() === query.area.toLowerCase() ? 3 : 0);
        const rightScore =
          (query.city && right.retailer.city.toLowerCase() === query.city.toLowerCase() ? 2 : 0) +
          (query.area && right.retailer.area.toLowerCase() === query.area.toLowerCase() ? 3 : 0);

        return rightScore - leftScore || Number(left.salePrice) - Number(right.salePrice);
      });

      response.json({
        retailers: sortedRetailers.map((entry) => ({
          retailerId: entry.retailer.id,
          businessName: entry.retailer.businessName,
          area: entry.retailer.area,
          city: entry.retailer.city,
          state: entry.retailer.state,
          postalCode: entry.retailer.postalCode,
          rating: entry.retailer.rating,
          deliveryAvailable: entry.retailer.deliveryAvailable,
          salePrice: Number(entry.salePrice),
          stockQuantity: entry.stockQuantity,
          availableQuantity: entry.stockQuantity - entry.reservedQuantity,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
