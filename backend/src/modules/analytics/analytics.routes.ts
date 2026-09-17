import { Router } from 'express';
import type { CustomerOrderStatus, PurchaseOrderStatus } from '@prisma/client';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';
import {
  assertCompanyScope,
  assertRetailerScope,
  assertWholesellerScope,
  requireAuth,
} from '../../middleware/auth.js';

export const analyticsRouter = Router();

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function decimalToNumber(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

const TREND_DAYS = 14;
const TOP_ITEMS_LIMIT = 5;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Builds a zero-filled revenue/order-count series for the last TREND_DAYS days so the
// chart always renders a full axis even on days with no orders.
function buildRevenueTrend(orders: Array<{ placedAt: Date; totalAmount: unknown }>) {
  const days: { date: string; revenue: number; orders: number }[] = [];
  const byDay = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const key = dayKey(order.placedAt);
    const bucket = byDay.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += decimalToNumber(order.totalAmount);
    bucket.orders += 1;
    byDay.set(key, bucket);
  }

  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = dayKey(date);
    const bucket = byDay.get(key) ?? { revenue: 0, orders: 0 };
    days.push({ date: key, revenue: bucket.revenue, orders: bucket.orders });
  }

  return days;
}

function trendStartDate() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (TREND_DAYS - 1));
  return date;
}

// Aggregates order line items by medicine, in JS rather than a Prisma groupBy, because the
// grouping key (medicine brand name) lives on a joined relation.
function buildTopItems(
  items: Array<{ medicineId: string; quantity: number; lineTotal: unknown; medicine: { brandName: string } }>,
) {
  const byMedicine = new Map<string, { medicineId: string; brandName: string; quantity: number; revenue: number }>();

  for (const item of items) {
    const bucket = byMedicine.get(item.medicineId) ?? {
      medicineId: item.medicineId,
      brandName: item.medicine.brandName,
      quantity: 0,
      revenue: 0,
    };
    bucket.quantity += item.quantity;
    bucket.revenue += decimalToNumber(item.lineTotal);
    byMedicine.set(item.medicineId, bucket);
  }

  return Array.from(byMedicine.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, TOP_ITEMS_LIMIT);
}

// Retailer dashboard summary: customer order workload, revenue, and stock risk.
analyticsRouter.get(
  '/retailers/:retailerId/summary',
  requireAuth,
  asyncHandler(async (request, response) => {
    const retailerId = String(pickParamValue(request.params.retailerId));
    assertRetailerScope(request, retailerId);

    try {
      const retailer = await prisma.retailer.findUnique({
        where: { id: retailerId },
        select: { id: true, businessName: true },
      });

      if (!retailer) {
        throw new HttpError(404, 'Retailer not found');
      }

      const paidStatuses: CustomerOrderStatus[] = ['PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED'];

      const [totalOrders, pendingOrders, activeOrders, deliveredOrders, revenue, lowStockItems, trendOrders, topItemLines] =
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
            where: { retailerId, status: { in: paidStatuses } },
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
          prisma.customerOrder.findMany({
            where: { retailerId, status: { in: paidStatuses }, placedAt: { gte: trendStartDate() } },
            select: { placedAt: true, totalAmount: true },
          }),
          prisma.customerOrderItem.findMany({
            where: { customerOrder: { retailerId, status: { in: paidStatuses } } },
            select: { medicineId: true, quantity: true, lineTotal: true, medicine: { select: { brandName: true } } },
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
        revenueTrend: buildRevenueTrend(trendOrders),
        topItems: buildTopItems(topItemLines),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Wholeseller dashboard summary: retailer order workload, schemes, and inventory risk.
analyticsRouter.get(
  '/wholesellers/:wholesellerId/summary',
  requireAuth,
  asyncHandler(async (request, response) => {
    const wholesellerId = String(pickParamValue(request.params.wholesellerId));
    assertWholesellerScope(request, wholesellerId);

    try {
      const wholeseller = await prisma.wholeseller.findUnique({
        where: { id: wholesellerId },
        select: { id: true, businessName: true, serviceArea: true },
      });

      if (!wholeseller) {
        throw new HttpError(404, 'Wholeseller not found');
      }

      const paidStatuses: PurchaseOrderStatus[] = ['PAID', 'DISPATCHED', 'DELIVERED'];

      const [
        totalRetailerOrders,
        pendingRetailerOrders,
        deliveredRetailerOrders,
        revenue,
        activeSchemes,
        lowStockItems,
        trendOrders,
        topItemLines,
      ] = await Promise.all([
        prisma.retailerPurchaseOrder.count({ where: { wholesellerId } }),
        prisma.retailerPurchaseOrder.count({ where: { wholesellerId, status: 'PENDING_APPROVAL' } }),
        prisma.retailerPurchaseOrder.count({ where: { wholesellerId, status: 'DELIVERED' } }),
        prisma.retailerPurchaseOrder.aggregate({
          where: { wholesellerId, status: { in: paidStatuses } },
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
        prisma.retailerPurchaseOrder.findMany({
          where: { wholesellerId, status: { in: paidStatuses }, placedAt: { gte: trendStartDate() } },
          select: { placedAt: true, totalAmount: true },
        }),
        prisma.retailerPurchaseOrderItem.findMany({
          where: { retailerPurchaseOrder: { wholesellerId, status: { in: paidStatuses } } },
          select: { medicineId: true, quantity: true, lineTotal: true, medicine: { select: { brandName: true } } },
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
        revenueTrend: buildRevenueTrend(trendOrders),
        topItems: buildTopItems(topItemLines),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Company dashboard summary: catalogue, supplier offers, and wholesaler order workload.
analyticsRouter.get(
  '/companies/:companyId/summary',
  requireAuth,
  asyncHandler(async (request, response) => {
    const companyId = String(pickParamValue(request.params.companyId));
    assertCompanyScope(request, companyId);

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
