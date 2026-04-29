import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const analyticsRouter = Router();

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function decimalToNumber(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

// Retailer dashboard summary: customer order workload, revenue, and stock risk.
analyticsRouter.get(
  '/retailers/:retailerId/summary',
  asyncHandler(async (request, response) => {
    const retailerId = String(pickParamValue(request.params.retailerId));

    try {
      const retailer = await prisma.retailer.findUnique({
        where: { id: retailerId },
        select: { id: true, businessName: true },
      });

      if (!retailer) {
        throw new HttpError(404, 'Retailer not found');
      }

      const [totalOrders, pendingOrders, activeOrders, deliveredOrders, revenue, lowStockItems] =
        await Promise.all([
          prisma.customerOrder.count({ where: { retailerId } }),
          prisma.customerOrder.count({ where: { retailerId, status: 'PENDING_RETAILER_APPROVAL' } }),
          prisma.customerOrder.count({
            where: {
              retailerId,
              status: { notIn: ['REJECTED_BY_RETAILER', 'DELIVERED', 'CANCELLED'] },
            },
          }),
          prisma.customerOrder.count({ where: { retailerId, status: 'DELIVERED' } }),
          prisma.customerOrder.aggregate({
            where: { retailerId, status: { in: ['PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED'] } },
            _sum: { totalAmount: true },
          }),
          prisma.retailerInventory.findMany({
            where: {
              retailerId,
              isActive: true,
              reorderLevel: { not: null },
            },
            include: { medicine: true },
          }),
        ]);

      const stockAlerts = lowStockItems
        .filter((item: any) => item.stockQuantity - item.reservedQuantity <= (item.reorderLevel ?? 0))
        .map((item: any) => ({
          inventoryId: item.id,
          medicineId: item.medicineId,
          brandName: item.medicine.brandName,
          availableQuantity: item.stockQuantity - item.reservedQuantity,
          reorderLevel: item.reorderLevel,
        }));

      response.json({
        retailer,
        metrics: {
          totalOrders,
          pendingOrders,
          activeOrders,
          deliveredOrders,
          revenue: decimalToNumber(revenue._sum.totalAmount),
          lowStockCount: stockAlerts.length,
        },
        stockAlerts,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Wholeseller dashboard summary: retailer order workload, schemes, and inventory risk.
analyticsRouter.get(
  '/wholesellers/:wholesellerId/summary',
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));

    try {
      const wholeseller = await prisma.wholeseller.findUnique({
        where: { id: wholesellerId },
        select: { id: true, businessName: true, serviceArea: true },
      });

      if (!wholeseller) {
        throw new HttpError(404, 'Wholeseller not found');
      }

      const [totalRetailerOrders, pendingRetailerOrders, deliveredRetailerOrders, revenue, activeSchemes, lowStockItems] =
        await Promise.all([
          prisma.retailerPurchaseOrder.count({ where: { wholesellerId } }),
          prisma.retailerPurchaseOrder.count({ where: { wholesellerId, status: 'PENDING_APPROVAL' } }),
          prisma.retailerPurchaseOrder.count({ where: { wholesellerId, status: 'DELIVERED' } }),
          prisma.retailerPurchaseOrder.aggregate({
            where: { wholesellerId, status: { in: ['PAID', 'DISPATCHED', 'DELIVERED'] } },
            _sum: { totalAmount: true },
          }),
          prisma.scheme.count({ where: { wholesellerId, status: 'ACTIVE' } }),
          prisma.wholesellerInventory.findMany({
            where: {
              wholesellerId,
              isActive: true,
              reorderLevel: { not: null },
            },
            include: { medicine: true },
          }),
        ]);

      const stockAlerts = lowStockItems
        .filter((item: any) => item.stockQuantity - item.reservedQuantity <= (item.reorderLevel ?? 0))
        .map((item: any) => ({
          inventoryId: item.id,
          medicineId: item.medicineId,
          brandName: item.medicine.brandName,
          availableQuantity: item.stockQuantity - item.reservedQuantity,
          reorderLevel: item.reorderLevel,
        }));

      response.json({
        wholeseller,
        metrics: {
          totalRetailerOrders,
          pendingRetailerOrders,
          deliveredRetailerOrders,
          revenue: decimalToNumber(revenue._sum.totalAmount),
          activeSchemes,
          lowStockCount: stockAlerts.length,
        },
        stockAlerts,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Company dashboard summary: catalogue, supplier offers, and wholesaler order workload.
analyticsRouter.get(
  '/companies/:companyId/summary',
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));

    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, legalName: true },
      });

      if (!company) {
        throw new HttpError(404, 'Company not found');
      }

      const [medicineCount, activeOffers, pendingWholesellerOrders, deliveredWholesellerOrders, revenue] =
        await Promise.all([
          prisma.medicine.count({ where: { companyId } }),
          prisma.offer.count({ where: { companyId, status: 'ACTIVE' } }),
          prisma.wholesellerPurchaseOrder.count({ where: { companyId, status: 'PENDING_APPROVAL' } }),
          prisma.wholesellerPurchaseOrder.count({ where: { companyId, status: 'DELIVERED' } }),
          prisma.wholesellerPurchaseOrder.aggregate({
            where: { companyId, status: { in: ['PAID', 'DISPATCHED', 'DELIVERED'] } },
            _sum: { totalAmount: true },
          }),
        ]);

      response.json({
        company,
        metrics: {
          medicineCount,
          activeOffers,
          pendingWholesellerOrders,
          deliveredWholesellerOrders,
          revenue: decimalToNumber(revenue._sum.totalAmount),
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
