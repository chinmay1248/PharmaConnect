import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { createNotification, shortOrderCode } from '../../lib/notifications.js';
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

const retailerOrderListQuerySchema = z.object({
  status: z
    .enum([
      'PENDING_ACTION',
      'ACTIVE',
      'PENDING_RETAILER_APPROVAL',
      'REJECTED_BY_RETAILER',
      'APPROVED_BY_RETAILER',
      'PAYMENT_PENDING',
      'PAYMENT_FAILED',
      'PAID',
      'PACKED',
      'OUT_FOR_DELIVERY',
      'READY_FOR_PICKUP',
      'DELIVERED',
      'CANCELLED',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const retailerDecisionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    notes: z.string().max(240).optional(),
  }),
  z.object({
    decision: z.literal('REJECT'),
    rejectionReason: z.string().min(5).max(240),
  }),
]);

const retailerStatusUpdateSchema = z.object({
  status: z.enum(['PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED']),
  notes: z.string().max(240).optional(),
});

const retailerInventoryUpsertSchema = z.object({
  medicineId: z.string().min(1),
  salePrice: z.coerce.number().positive(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  reorderLevel: z.coerce.number().int().nonnegative().optional(),
  batch: z
    .object({
      batchNumber: z.string().min(1).max(80),
      quantity: z.coerce.number().int().positive(),
      purchasePrice: z.coerce.number().positive().optional(),
      expiryDate: z.coerce.date(),
    })
    .optional(),
});

const retailerInventoryUpdateSchema = z
  .object({
    salePrice: z.coerce.number().positive().optional(),
    stockQuantity: z.coerce.number().int().nonnegative().optional(),
    reorderLevel: z.coerce.number().int().nonnegative().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one inventory field is required',
  });

const retailerBatchCreateSchema = z.object({
  batchNumber: z.string().min(1).max(80),
  quantity: z.coerce.number().int().positive(),
  purchasePrice: z.coerce.number().positive().optional(),
  expiryDate: z.coerce.date(),
});

const retailerBatchUpdateSchema = z
  .object({
    quantity: z.coerce.number().int().nonnegative().optional(),
    purchasePrice: z.coerce.number().positive().nullable().optional(),
    expiryDate: z.coerce.date().optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one batch field is required',
  });

const retailerPurchaseOrderCreateSchema = z.object({
  wholesellerId: z.string().min(1),
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

function buildPurchaseInvoiceNumber(orderId: string) {
  return `RPO-INV-${orderId.slice(-10).toUpperCase()}`;
}

function mapRetailerInventoryItem(item: any) {
  return {
    inventoryId: item.id,
    medicineId: item.medicine.id,
    brandName: item.medicine.brandName,
    genericName: item.medicine.genericName,
    dosage: item.medicine.dosage,
    packSize: item.medicine.packSize,
    salePrice: Number(item.salePrice),
    stockQuantity: item.stockQuantity,
    reservedQuantity: item.reservedQuantity,
    availableQuantity: item.stockQuantity - item.reservedQuantity,
    reorderLevel: item.reorderLevel,
    batches: item.batches?.map((batch: any) => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      purchasePrice: batch.purchasePrice ? Number(batch.purchasePrice) : null,
    })),
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
    wholeseller: {
      id: order.wholeseller.id,
      businessName: order.wholeseller.businessName,
      serviceArea: order.wholeseller.serviceArea,
    },
    items: order.items.map((item: any) => ({
      id: item.id,
      medicineId: item.medicineId,
      brandName: item.medicine.brandName,
      genericName: item.medicine.genericName,
      dosage: item.medicine.dosage,
      packSize: item.medicine.packSize,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    latestPayment: order.payments[0]
      ? {
          id: order.payments[0].id,
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
    trackingEvents: order.trackingEvents ?? [],
  };
}

function mapOrderStatusToTimeline(status: string) {
  if (status === 'APPROVED_BY_RETAILER' || status === 'PAYMENT_PENDING' || status === 'PAID') {
    return 'Confirmed';
  }

  if (status === 'PACKED') {
    return 'Packed';
  }

  if (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP') {
    return 'Out for Delivery';
  }

  if (status === 'DELIVERED') {
    return 'Delivered';
  }

  if (status === 'REJECTED_BY_RETAILER') {
    return 'Order Rejected';
  }

  return 'Order Placed';
}

function mapRetailerOrderResponse(order: any) {
  return {
    id: order.id,
    status: order.status,
    timelineStatus: mapOrderStatusToTimeline(order.status),
    placedAt: order.placedAt,
    approvedAt: order.approvedAt,
    completedAt: order.completedAt,
    deliveryMethod: order.deliveryMethod,
    rejectionReason: order.rejectionReason,
    subtotalAmount: Number(order.subtotalAmount),
    deliveryFee: Number(order.deliveryFee),
    totalAmount: Number(order.totalAmount),
    customer: {
      id: order.customer.id,
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email,
    },
    deliveryAddress: order.deliveryAddress,
    items: order.items.map((item: any) => ({
      id: item.id,
      medicineId: item.medicineId,
      brandName: item.medicine.brandName,
      genericName: item.medicine.genericName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    prescription: order.prescription
      ? {
          id: order.prescription.id,
          status: order.prescription.status,
          fileUrl: order.prescription.fileUrl,
          originalFileName: order.prescription.originalFileName,
          retailerNotes: order.prescription.retailerNotes,
          reviewedAt: order.prescription.reviewedAt,
        }
      : null,
    latestPayment: order.payments[0]
      ? {
          id: order.payments[0].id,
          method: order.payments[0].method,
          status: order.payments[0].status,
          amount: Number(order.payments[0].amount),
          gatewayReference: order.payments[0].gatewayReference,
          paidAt: order.payments[0].paidAt,
        }
      : null,
    latestInvoice: order.invoices[0]
      ? {
          id: order.invoices[0].id,
          invoiceNumber: order.invoices[0].invoiceNumber,
          status: order.invoices[0].status,
          generatedAt: order.invoices[0].generatedAt,
        }
      : null,
    latestTrackingEvent: order.trackingEvents[order.trackingEvents.length - 1] ?? null,
  };
}

function decisionStatusFromPayment(method: string | null | undefined) {
  if (!method || method === 'CASH_ON_DELIVERY') {
    return 'APPROVED_BY_RETAILER';
  }

  return 'PAYMENT_PENDING';
}

function statusLabelForRetailerUpdate(status: 'PACKED' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'DELIVERED') {
  if (status === 'PACKED') {
    return 'Order packed';
  }

  if (status === 'OUT_FOR_DELIVERY') {
    return 'Out for delivery';
  }

  if (status === 'READY_FOR_PICKUP') {
    return 'Ready for pickup';
  }

  return 'Order delivered';
}

function canMoveToStatus(currentStatus: string, nextStatus: 'PACKED' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'DELIVERED', deliveryMethod: string) {
  if (nextStatus === 'PACKED') {
    return ['APPROVED_BY_RETAILER', 'PAYMENT_PENDING', 'PAID'].includes(currentStatus);
  }

  if (nextStatus === 'OUT_FOR_DELIVERY') {
    return deliveryMethod === 'HOME_DELIVERY' && currentStatus === 'PACKED';
  }

  if (nextStatus === 'READY_FOR_PICKUP') {
    return deliveryMethod === 'PICKUP' && currentStatus === 'PACKED';
  }

  if (nextStatus === 'DELIVERED') {
    if (deliveryMethod === 'HOME_DELIVERY') {
      return currentStatus === 'OUT_FOR_DELIVERY';
    }

    return currentStatus === 'READY_FOR_PICKUP';
  }

  return false;
}

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
            reservedQuantity: item.reservedQuantity,
            availableQuantity: item.stockQuantity - item.reservedQuantity,
            reorderLevel: item.reorderLevel,
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

// Adds or updates one retailer inventory row, optionally creating an opening batch.
retailersRouter.post(
  '/:retailerId/inventory',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const payload = retailerInventoryUpsertSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const [retailer, medicine] = await Promise.all([
          transaction.retailer.findUnique({ where: { id: retailerId } }),
          transaction.medicine.findUnique({ where: { id: payload.medicineId } }),
        ]);

        if (!retailer) {
          throw new HttpError(404, 'Retailer not found');
        }

        if (!medicine) {
          throw new HttpError(404, 'Medicine not found');
        }

        const inventory = await transaction.retailerInventory.upsert({
          where: {
            retailerId_medicineId: {
              retailerId,
              medicineId: payload.medicineId,
            },
          },
          update: {
            salePrice: payload.salePrice.toFixed(2),
            stockQuantity: payload.stockQuantity,
            reorderLevel: payload.reorderLevel,
            isActive: true,
          },
          create: {
            retailerId,
            medicineId: payload.medicineId,
            salePrice: payload.salePrice.toFixed(2),
            stockQuantity: payload.stockQuantity,
            reorderLevel: payload.reorderLevel,
            isActive: true,
          },
        });

        if (payload.batch) {
          await transaction.retailerInventoryBatch.create({
            data: {
              retailerInventoryId: inventory.id,
              batchNumber: payload.batch.batchNumber,
              quantity: payload.batch.quantity,
              purchasePrice: payload.batch.purchasePrice?.toFixed(2),
              expiryDate: payload.batch.expiryDate,
            },
          });
        }

        return transaction.retailerInventory.findUnique({
          where: { id: inventory.id },
          include: {
            medicine: true,
            batches: {
              orderBy: { expiryDate: 'asc' },
            },
          },
        });
      });

      response.status(201).json({ inventory: mapRetailerInventoryItem(result) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Updates price, available stock, reorder level, or active flag for one retailer inventory item.
retailersRouter.patch(
  '/:retailerId/inventory/:inventoryId',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const inventoryId = String(request.params.inventoryId);
    const payload = retailerInventoryUpdateSchema.parse(request.body ?? {});

    try {
      const existing = await prisma.retailerInventory.findFirst({
        where: {
          id: inventoryId,
          retailerId,
        },
      });

      if (!existing) {
        throw new HttpError(404, 'Inventory item not found for this retailer');
      }

      const updated = await prisma.retailerInventory.update({
        where: { id: inventoryId },
        data: {
          ...(payload.salePrice !== undefined ? { salePrice: payload.salePrice.toFixed(2) } : {}),
          ...(payload.stockQuantity !== undefined ? { stockQuantity: payload.stockQuantity } : {}),
          ...(payload.reorderLevel !== undefined ? { reorderLevel: payload.reorderLevel } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        },
        include: {
          medicine: true,
          batches: {
            orderBy: { expiryDate: 'asc' },
          },
        },
      });

      response.json({ inventory: mapRetailerInventoryItem(updated) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Adds a new batch for an existing retailer inventory item.
retailersRouter.post(
  '/:retailerId/inventory/:inventoryId/batches',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const inventoryId = String(request.params.inventoryId);
    const payload = retailerBatchCreateSchema.parse(request.body ?? {});

    try {
      const inventory = await prisma.retailerInventory.findFirst({
        where: {
          id: inventoryId,
          retailerId,
        },
      });

      if (!inventory) {
        throw new HttpError(404, 'Inventory item not found for this retailer');
      }

      const batch = await prisma.retailerInventoryBatch.create({
        data: {
          retailerInventoryId: inventoryId,
          batchNumber: payload.batchNumber,
          quantity: payload.quantity,
          purchasePrice: payload.purchasePrice?.toFixed(2),
          expiryDate: payload.expiryDate,
        },
      });

      response.status(201).json({
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantity: batch.quantity,
          purchasePrice: batch.purchasePrice ? Number(batch.purchasePrice) : null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Updates an existing inventory batch owned by this retailer.
retailersRouter.patch(
  '/:retailerId/inventory/:inventoryId/batches/:batchId',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const inventoryId = String(request.params.inventoryId);
    const batchId = String(request.params.batchId);
    const payload = retailerBatchUpdateSchema.parse(request.body ?? {});

    try {
      const batch = await prisma.retailerInventoryBatch.findFirst({
        where: {
          id: batchId,
          retailerInventoryId: inventoryId,
          retailerInventory: {
            retailerId,
          },
        },
      });

      if (!batch) {
        throw new HttpError(404, 'Batch not found for this retailer inventory item');
      }

      const updated = await prisma.retailerInventoryBatch.update({
        where: { id: batchId },
        data: {
          ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
          ...(payload.purchasePrice !== undefined
            ? { purchasePrice: payload.purchasePrice === null ? null : payload.purchasePrice.toFixed(2) }
            : {}),
          ...(payload.expiryDate !== undefined ? { expiryDate: payload.expiryDate } : {}),
        },
      });

      response.json({
        batch: {
          id: updated.id,
          batchNumber: updated.batchNumber,
          expiryDate: updated.expiryDate,
          quantity: updated.quantity,
          purchasePrice: updated.purchasePrice ? Number(updated.purchasePrice) : null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns customer orders for one retailer so an operations dashboard can review and action them.
retailersRouter.get(
  '/:retailerId/customer-orders',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const query = retailerOrderListQuerySchema.parse({
      status: pickQueryValue(request.query.status),
      limit: pickQueryValue(request.query.limit),
    });

    try {
      const where: any = { retailerId };

      if (query.status === 'PENDING_ACTION') {
        where.status = 'PENDING_RETAILER_APPROVAL';
      } else if (query.status === 'ACTIVE') {
        where.status = {
          notIn: ['REJECTED_BY_RETAILER', 'DELIVERED', 'CANCELLED'],
        };
      } else if (query.status) {
        where.status = query.status;
      }

      const orders: any[] = await prisma.customerOrder.findMany({
        where,
        include: {
          customer: true,
          deliveryAddress: true,
          items: {
            include: {
              medicine: true,
            },
          },
          prescription: true,
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          invoices: {
            orderBy: {
              generatedAt: 'desc',
            },
          },
          trackingEvents: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: [{ placedAt: 'desc' }],
        take: query.limit ?? 40,
      });

      const pendingActionCount = orders.filter((order) => order.status === 'PENDING_RETAILER_APPROVAL').length;
      const activeCount = orders.filter((order) => !['REJECTED_BY_RETAILER', 'DELIVERED', 'CANCELLED'].includes(order.status)).length;

      response.json({
        retailerId,
        summary: {
          total: orders.length,
          pendingAction: pendingActionCount,
          active: activeCount,
        },
        orders: orders.map(mapRetailerOrderResponse),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Approves or rejects one customer order from the retailer queue.
retailersRouter.patch(
  '/:retailerId/customer-orders/:orderId/decision',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const orderId = String(request.params.orderId);
    const payload = retailerDecisionSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.customerOrder.findFirst({
          where: {
            id: orderId,
            retailerId,
          },
          include: {
            items: true,
            prescription: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Order not found for this retailer');
        }

        if (order.status !== 'PENDING_RETAILER_APPROVAL') {
          throw new HttpError(409, 'Retailer decision has already been recorded for this order');
        }

        if (payload.decision === 'REJECT') {
          await transaction.customerOrder.update({
            where: { id: order.id },
            data: {
              status: 'REJECTED_BY_RETAILER',
              rejectionReason: payload.rejectionReason,
              trackingEvents: {
                create: {
                  statusLabel: 'Order rejected',
                  notes: payload.rejectionReason,
                },
              },
            },
          });

          if (order.prescription) {
            await transaction.prescription.update({
              where: { customerOrderId: order.id },
              data: {
                status: 'REJECTED',
                retailerNotes: payload.rejectionReason,
                reviewedAt: new Date(),
              },
            });
          }

          for (const item of order.items as any[]) {
            const inventory = await transaction.retailerInventory.findFirst({
              where: {
                retailerId,
                medicineId: item.medicineId,
              },
            });

            if (!inventory) {
              continue;
            }

            await transaction.retailerInventory.update({
              where: { id: inventory.id },
              data: {
                reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity),
              },
            });
          }

          await createNotification(transaction, {
            userId: order.customerId,
            type: 'ORDER',
            title: 'Order rejected',
            body: `Order ${shortOrderCode(order.id)} was rejected: ${payload.rejectionReason}`,
            referenceKind: 'customer_order',
            referenceId: order.id,
          });
        } else {
          const nextStatus = decisionStatusFromPayment(order.payments[0]?.method);

          await transaction.customerOrder.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              approvedAt: new Date(),
              rejectionReason: null,
              trackingEvents: {
                create: {
                  statusLabel: 'Order approved',
                  notes:
                    payload.notes ??
                    (nextStatus === 'PAYMENT_PENDING'
                      ? 'Retailer approved order and is waiting for customer payment.'
                      : 'Retailer approved order and started fulfilment.'),
                },
              },
            },
          });

          if (order.prescription) {
            await transaction.prescription.update({
              where: { customerOrderId: order.id },
              data: {
                status: 'APPROVED',
                retailerNotes: payload.notes ?? order.prescription.retailerNotes,
                reviewedAt: new Date(),
              },
            });
          }

          await createNotification(transaction, {
            userId: order.customerId,
            type: order.prescription ? 'PRESCRIPTION' : 'ORDER',
            title: order.prescription ? 'Prescription approved' : 'Order approved',
            body:
              nextStatus === 'PAYMENT_PENDING'
                ? `Order ${shortOrderCode(order.id)} was approved. Payment is pending.`
                : `Order ${shortOrderCode(order.id)} was approved and fulfilment has started.`,
            referenceKind: 'customer_order',
            referenceId: order.id,
          });
        }

        const updatedOrder = await transaction.customerOrder.findUnique({
          where: { id: order.id },
          include: {
            customer: true,
            deliveryAddress: true,
            items: {
              include: {
                medicine: true,
              },
            },
            prescription: true,
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
        });

        if (!updatedOrder) {
          throw new HttpError(404, 'Updated order could not be loaded');
        }

        return updatedOrder;
      });

      response.json({
        order: mapRetailerOrderResponse(result),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Advances one approved customer order through packed, dispatch/pickup-ready, and delivered states.
retailersRouter.patch(
  '/:retailerId/customer-orders/:orderId/status',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const orderId = String(request.params.orderId);
    const payload = retailerStatusUpdateSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.customerOrder.findFirst({
          where: {
            id: orderId,
            retailerId,
          },
          include: {
            items: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!order) {
          throw new HttpError(404, 'Order not found for this retailer');
        }

        if (!canMoveToStatus(order.status, payload.status, order.deliveryMethod)) {
          throw new HttpError(409, `Cannot move order from ${order.status} to ${payload.status}`);
        }

        const updateData: any = {
          status: payload.status,
          completedAt: payload.status === 'DELIVERED' ? new Date() : null,
          trackingEvents: {
            create: {
              statusLabel: statusLabelForRetailerUpdate(payload.status),
              notes: payload.notes ?? null,
            },
          },
        };

        await transaction.customerOrder.update({
          where: { id: order.id },
          data: updateData,
        });

        await createNotification(transaction, {
          userId: order.customerId,
          type: payload.status === 'DELIVERED' ? 'DELIVERY' : 'ORDER',
          title: statusLabelForRetailerUpdate(payload.status),
          body: `Order ${shortOrderCode(order.id)} status changed to ${mapOrderStatusToTimeline(payload.status)}.`,
          referenceKind: 'customer_order',
          referenceId: order.id,
        });

        if (payload.status === 'DELIVERED') {
          for (const item of order.items as any[]) {
            const inventory = await transaction.retailerInventory.findFirst({
              where: {
                retailerId,
                medicineId: item.medicineId,
              },
            });

            if (!inventory) {
              continue;
            }

            await transaction.retailerInventory.update({
              where: { id: inventory.id },
              data: {
                reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity),
                stockQuantity: Math.max(0, inventory.stockQuantity - item.quantity),
              },
            });
          }

          const latestPayment = order.payments[0];

          if (latestPayment && latestPayment.method === 'CASH_ON_DELIVERY' && latestPayment.status !== 'SUCCESS') {
            await transaction.paymentRecord.update({
              where: { id: latestPayment.id },
              data: {
                status: 'SUCCESS',
                paidAt: new Date(),
                gatewayReference: latestPayment.gatewayReference ?? `cod-${order.id}-${Date.now()}`,
              },
            });
          }
        }

        const updatedOrder = await transaction.customerOrder.findUnique({
          where: { id: order.id },
          include: {
            customer: true,
            deliveryAddress: true,
            items: {
              include: {
                medicine: true,
              },
            },
            prescription: true,
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
        });

        if (!updatedOrder) {
          throw new HttpError(404, 'Updated order could not be loaded');
        }

        return updatedOrder;
      });

      response.json({
        order: mapRetailerOrderResponse(result),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Lists purchase orders this retailer placed with wholesalers.
retailersRouter.get(
  '/:retailerId/purchase-orders',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);

    try {
      const retailer = await prisma.retailer.findUnique({
        where: { id: retailerId },
        select: { id: true },
      });

      if (!retailer) {
        throw new HttpError(404, 'Retailer not found');
      }

      const orders = await prisma.retailerPurchaseOrder.findMany({
        where: { retailerId },
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
        orderBy: { placedAt: 'desc' },
      });

      response.json({
        retailerId,
        orders: orders.map(mapRetailerPurchaseOrder),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Creates a retailer purchase order against wholesaler inventory and reserves wholesaler stock.
retailersRouter.post(
  '/:retailerId/purchase-orders',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const payload = retailerPurchaseOrderCreateSchema.parse(request.body ?? {});

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const [retailer, wholeseller, inventoryRows] = await Promise.all([
          transaction.retailer.findUnique({ where: { id: retailerId } }),
          transaction.wholeseller.findUnique({ where: { id: payload.wholesellerId } }),
          transaction.wholesellerInventory.findMany({
            where: {
              wholesellerId: payload.wholesellerId,
              medicineId: { in: payload.items.map((item) => item.medicineId) },
              isActive: true,
            },
            include: {
              medicine: true,
            },
          }),
        ]);

        if (!retailer) {
          throw new HttpError(404, 'Retailer not found');
        }

        if (!wholeseller) {
          throw new HttpError(404, 'Wholeseller not found');
        }

        const inventoryByMedicineId = new Map<string, any>(
          inventoryRows.map((row: any) => [row.medicineId, row]),
        );

        for (const item of payload.items) {
          const inventory = inventoryByMedicineId.get(item.medicineId);

          if (!inventory) {
            throw new HttpError(400, 'One or more medicines are not available from this wholeseller');
          }

          const availableQuantity = inventory.stockQuantity - inventory.reservedQuantity;

          if (availableQuantity < item.quantity) {
            throw new HttpError(
              400,
              `Not enough wholeseller stock for ${inventory.medicine.brandName}. Available quantity: ${availableQuantity}.`,
            );
          }
        }

        const subtotalAmount = payload.items.reduce((sum, item) => {
          const inventory = inventoryByMedicineId.get(item.medicineId);
          return sum + Number(inventory?.salePrice ?? 0) * item.quantity;
        }, 0);
        const totalAmount = subtotalAmount;

        const order = await transaction.retailerPurchaseOrder.create({
          data: {
            retailerId,
            wholesellerId: payload.wholesellerId,
            subtotalAmount: subtotalAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            items: {
              create: payload.items.map((item) => {
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
            trackingEvents: {
              create: {
                statusLabel: 'Purchase order placed',
                notes: 'Retailer sent a restock request to the wholeseller.',
              },
            },
          },
        });

        if (payload.paymentMethod) {
          await transaction.paymentRecord.create({
            data: {
              retailerPurchaseOrderId: order.id,
              method: payload.paymentMethod,
              status: payload.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'SUCCESS',
              amount: totalAmount.toFixed(2),
              gatewayReference:
                payload.paymentMethod === 'CASH_ON_DELIVERY'
                  ? undefined
                  : `demo-rpo-${payload.paymentMethod.toLowerCase()}-${Date.now()}`,
              paidAt: payload.paymentMethod === 'CASH_ON_DELIVERY' ? undefined : new Date(),
            },
          });
        }

        await transaction.invoiceRecord.create({
          data: {
            retailerPurchaseOrderId: order.id,
            invoiceNumber: buildPurchaseInvoiceNumber(order.id),
            status: 'GENERATED',
          },
        });

        for (const item of payload.items) {
          const inventory = inventoryByMedicineId.get(item.medicineId)!;

          await transaction.wholesellerInventory.update({
            where: { id: inventory.id },
            data: {
              reservedQuantity: inventory.reservedQuantity + item.quantity,
            },
          });
        }

        await createNotification(transaction, {
          userId: wholeseller.userId,
          type: 'ORDER',
          title: 'New retailer purchase order',
          body: `${retailer.businessName} placed a restock order for ${payload.items.length} item${payload.items.length === 1 ? '' : 's'}.`,
          referenceKind: 'retailer_purchase_order',
          referenceId: order.id,
        });

        return transaction.retailerPurchaseOrder.findUnique({
          where: { id: order.id },
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
        });
      });

      response.status(201).json({
        order: mapRetailerPurchaseOrder(result),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Confirms receipt of a dispatched retailer purchase order and adds received quantities to retailer inventory.
retailersRouter.patch(
  '/:retailerId/purchase-orders/:orderId/confirm-receipt',
  asyncHandler(async (request, response) => {
    const retailerId = String(request.params.retailerId);
    const orderId = String(request.params.orderId);

    try {
      const result = await prisma.$transaction(async (transaction: any) => {
        const order = await transaction.retailerPurchaseOrder.findFirst({
          where: {
            id: orderId,
            retailerId,
          },
          include: {
            retailer: true,
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
        });

        if (!order) {
          throw new HttpError(404, 'Purchase order not found for this retailer');
        }

        if (!['DISPATCHED', 'PAID', 'APPROVED'].includes(order.status)) {
          throw new HttpError(409, `Cannot confirm receipt while purchase order is ${order.status}`);
        }

        await transaction.retailerPurchaseOrder.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            trackingEvents: {
              create: {
                statusLabel: 'Stock received',
                notes: 'Retailer confirmed receipt and inventory was updated.',
              },
            },
          },
        });

        for (const item of order.items as any[]) {
          const salePrice = Number(item.unitPrice) * 1.12;
          const inventory = await transaction.retailerInventory.upsert({
            where: {
              retailerId_medicineId: {
                retailerId,
                medicineId: item.medicineId,
              },
            },
            update: {
              stockQuantity: {
                increment: item.quantity,
              },
              salePrice: salePrice.toFixed(2),
              isActive: true,
            },
            create: {
              retailerId,
              medicineId: item.medicineId,
              stockQuantity: item.quantity,
              salePrice: salePrice.toFixed(2),
              reorderLevel: Math.max(5, Math.floor(item.quantity * 0.2)),
              isActive: true,
            },
          });

          await transaction.retailerInventoryBatch.create({
            data: {
              retailerInventoryId: inventory.id,
              batchNumber: `RPO-${order.id.slice(-6).toUpperCase()}-${item.medicineId.slice(-4).toUpperCase()}`,
              quantity: item.quantity,
              purchasePrice: Number(item.unitPrice).toFixed(2),
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const latestPayment = order.payments[0];

        if (latestPayment && latestPayment.method === 'CASH_ON_DELIVERY' && latestPayment.status !== 'SUCCESS') {
          await transaction.paymentRecord.update({
            where: { id: latestPayment.id },
            data: {
              status: 'SUCCESS',
              paidAt: new Date(),
              gatewayReference: latestPayment.gatewayReference ?? `rpo-cod-${order.id}-${Date.now()}`,
            },
          });
        }

        await createNotification(transaction, {
          userId: order.wholeseller.userId,
          type: 'ORDER',
          title: 'Retailer stock received',
          body: `${order.retailer.businessName} confirmed receipt of purchase order ${order.id.slice(-8).toUpperCase()}.`,
          referenceKind: 'retailer_purchase_order',
          referenceId: order.id,
        });

        return transaction.retailerPurchaseOrder.findUnique({
          where: { id: order.id },
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
        });
      });

      response.json({
        order: mapRetailerPurchaseOrder(result),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
