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
