// Shapes a delivery assignment row for API responses shared by retailer and customer screens.
export function mapDeliveryAssignment(delivery: any) {
  if (!delivery) {
    return null;
  }

  return {
    id: delivery.id,
    courierName: delivery.courierName,
    courierPhone: delivery.courierPhone ?? null,
    vehicleNumber: delivery.vehicleNumber ?? null,
    latitude: delivery.latitude ?? null,
    longitude: delivery.longitude ?? null,
    etaMinutes: delivery.etaMinutes ?? null,
    lastLocationAt: delivery.lastLocationAt ?? null,
    dispatchedAt: delivery.dispatchedAt,
    deliveredAt: delivery.deliveredAt ?? null,
    isLive: Boolean(delivery.latitude !== null && delivery.longitude !== null && !delivery.deliveredAt),
  };
}
