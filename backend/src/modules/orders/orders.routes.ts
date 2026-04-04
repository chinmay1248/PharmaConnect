import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const ordersRouter = Router();

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  retailerId: z.string().min(1),
  deliveryAddressId: z.string().optional(),
  deliveryMethod: z.enum(['HOME_DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['UPI', 'CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']).optional(),
  prescription: z
    .object({
      fileUrl: z.string().url(),
      originalFileName: z.string().min(1).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

// Creates a customer order, reserves stock, and captures prescription metadata when required.
ordersRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = createOrderSchema.parse(request.body);

    try {
      const [customer, retailer, inventoryRows]: [any, any, any[]] = (await Promise.all([
        prisma.user.findUnique({
          where: { id: payload.customerId },
        }),
        prisma.retailer.findUnique({
          where: { id: payload.retailerId },
        }),
        prisma.retailerInventory.findMany({
          where: {
            retailerId: payload.retailerId,
            medicineId: { in: payload.items.map((item) => item.medicineId) },
            isActive: true,
          },
          include: {
            medicine: true,
          },
        }),
      ])) as [any, any, any[]];

      if (!customer || customer.role !== 'CUSTOMER') {
        throw new HttpError(404, 'Customer not found');
      }

      if (!retailer) {
        throw new HttpError(404, 'Retailer not found');
      }

      const inventoryByMedicineId = new Map(inventoryRows.map((row) => [row.medicineId, row]));

      for (const item of payload.items) {
        const inventory = inventoryByMedicineId.get(item.medicineId);

        if (!inventory) {
          throw new HttpError(400, 'One or more medicines are not sold by this retailer');
        }

        const availableQuantity = inventory.stockQuantity - inventory.reservedQuantity;

        if (availableQuantity < item.quantity) {
          throw new HttpError(
            400,
            `Not enough stock for ${inventory.medicine.brandName}. Available quantity: ${availableQuantity}.`,
          );
        }
      }

      const requiresPrescription = inventoryRows.some(
        (row) =>
          row.medicine.medicineType === 'PRESCRIPTION' &&
          payload.items.some((item) => item.medicineId === row.medicineId),
      );

      if (requiresPrescription && !payload.prescription) {
        throw new HttpError(400, 'Prescription upload is required for this order');
      }

      const subtotalAmount = payload.items.reduce((sum, item) => {
        const inventory = inventoryByMedicineId.get(item.medicineId);
        return sum + Number(inventory?.salePrice ?? 0) * item.quantity;
      }, 0);

      const deliveryFee = payload.deliveryMethod === 'HOME_DELIVERY' ? 35 : 0;
      const totalAmount = subtotalAmount + deliveryFee;

      const createdOrder: any = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.customerOrder.create({
          data: {
            customerId: payload.customerId,
            retailerId: payload.retailerId,
            deliveryAddressId: payload.deliveryAddressId,
            deliveryMethod: payload.deliveryMethod,
            subtotalAmount: subtotalAmount.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            items: {
              create: payload.items.map((item: any) => {
                const inventory = inventoryByMedicineId.get(item.medicineId)!;
                const unitPrice = Number(inventory.salePrice);
                return {
                  medicineId: item.medicineId,
                  quantity: item.quantity,
                  unitPrice: unitPrice.toFixed(2),
                  lineTotal: (unitPrice * item.quantity).toFixed(2),
                };
              }),
            },
            prescription: payload.prescription
              ? {
                  create: {
                    customerId: payload.customerId,
                    medicineId: payload.items[0]?.medicineId,
                    fileUrl: payload.prescription.fileUrl,
                    originalFileName: payload.prescription.originalFileName,
                    status: 'UPLOADED',
                  },
                }
              : undefined,
            trackingEvents: {
              create: {
                statusLabel: 'Order placed',
                notes: 'Customer created the order and waiting for retailer approval.',
              },
            },
          },
          include: {
            items: {
              include: {
                medicine: true,
              },
            },
            prescription: true,
            trackingEvents: true,
          },
        });

        for (const item of payload.items as any[]) {
          const inventory = inventoryByMedicineId.get(item.medicineId)!;

          await transaction.retailerInventory.update({
            where: { id: inventory.id },
            data: {
              reservedQuantity: inventory.reservedQuantity + item.quantity,
            },
          });
        }

        return order;
      });

      response.status(201).json({
        order: {
          id: createdOrder.id,
          status: createdOrder.status,
          deliveryMethod: createdOrder.deliveryMethod,
          subtotalAmount: Number(createdOrder.subtotalAmount),
          deliveryFee: Number(createdOrder.deliveryFee),
          totalAmount: Number(createdOrder.totalAmount),
          prescriptionStatus: createdOrder.prescription?.status ?? 'NOT_REQUIRED',
          paymentMethod: payload.paymentMethod ?? null,
          items: createdOrder.items.map((item: any) => ({
            medicineId: item.medicineId,
            brandName: item.medicine.brandName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
          trackingEvents: createdOrder.trackingEvents,
        },
        nextStep: 'retailer_approval',
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns the customer order list so the frontend can power orders and reorder screens.
ordersRouter.get(
  '/customer/:customerId',
  asyncHandler(async (request, response) => {
    const customerId = String(pickParamValue(request.params.customerId));

    try {
      const orders: any[] = await prisma.customerOrder.findMany({
        where: { customerId },
        include: {
          retailer: true,
          items: {
            include: {
              medicine: true,
            },
          },
          prescription: true,
          payments: true,
          invoices: true,
          trackingEvents: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          placedAt: 'desc',
        },
      });

      response.json({
        orders: orders.map((order: any) => ({
          id: order.id,
          status: order.status,
          placedAt: order.placedAt,
          totalAmount: Number(order.totalAmount),
          deliveryMethod: order.deliveryMethod,
          retailer: {
            id: order.retailer.id,
            businessName: order.retailer.businessName,
          },
          items: order.items.map((item: any) => ({
            medicineId: item.medicineId,
            brandName: item.medicine.brandName,
            quantity: item.quantity,
            lineTotal: Number(item.lineTotal),
          })),
          prescriptionStatus: order.prescription?.status ?? 'NOT_REQUIRED',
          paymentStatus: order.payments[0]?.status ?? 'PENDING',
          invoiceNumber: order.invoices[0]?.invoiceNumber ?? null,
          latestTrackingStatus:
            order.trackingEvents[order.trackingEvents.length - 1]?.statusLabel ?? null,
        })),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns a single order with all detail blocks needed for tracking, invoice, and support screens.
ordersRouter.get(
  '/:orderId',
  asyncHandler(async (request, response) => {
    const orderId = String(pickParamValue(request.params.orderId));

    try {
      const order: any = await prisma.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          retailer: true,
          deliveryAddress: true,
          items: {
            include: {
              medicine: true,
            },
          },
          prescription: true,
          payments: true,
          invoices: true,
          trackingEvents: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      response.json({
        order: {
          id: order.id,
          status: order.status,
          placedAt: order.placedAt,
          approvedAt: order.approvedAt,
          completedAt: order.completedAt,
          subtotalAmount: Number(order.subtotalAmount),
          deliveryFee: Number(order.deliveryFee),
          totalAmount: Number(order.totalAmount),
          deliveryMethod: order.deliveryMethod,
          rejectionReason: order.rejectionReason,
          customer: {
            id: order.customer.id,
            fullName: order.customer.fullName,
            phone: order.customer.phone,
          },
          retailer: {
            id: order.retailer.id,
            businessName: order.retailer.businessName,
            city: order.retailer.city,
            area: order.retailer.area,
          },
          deliveryAddress: order.deliveryAddress,
          items: order.items.map((item: any) => ({
            medicineId: item.medicineId,
            brandName: item.medicine.brandName,
            genericName: item.medicine.genericName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
          prescription: order.prescription,
          payments: order.payments.map((payment: any) => ({
            id: payment.id,
            method: payment.method,
            status: payment.status,
            amount: Number(payment.amount),
            paidAt: payment.paidAt,
          })),
          invoices: order.invoices,
          trackingEvents: order.trackingEvents,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
