import { initialOrders, medicines, retailers } from '../../data/mockData';
import type {
  CustomerOrderSummary,
  CustomerOrderTrackingState,
  PharmacySort,
  SignupState,
  SortedPharmacy,
} from './customerTypes';

export function filterMockMedicines(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return medicines.filter((medicine) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      medicine.brandName.toLowerCase().includes(normalizedQuery) ||
      medicine.genericName.toLowerCase().includes(normalizedQuery) ||
      medicine.company.toLowerCase().includes(normalizedQuery) ||
      medicine.diseases.some((disease) => disease.toLowerCase().includes(normalizedQuery))
    );
  });
}

export function sortMockPharmacies(medicineId: string, sortBy: PharmacySort) {
  const list = retailers
    .map((retailer) => {
      const stock = retailer.stocks.find((item) => item.medicineId === medicineId);
      return stock ? { retailer, stock } : null;
    })
    .filter((item): item is SortedPharmacy => item !== null);

  return list.sort((a, b) => {
    if (sortBy === 'cheapest') {
      return a.stock.price - b.stock.price;
    }

    if (sortBy === 'rating') {
      return b.retailer.rating - a.retailer.rating;
    }

    return (a.retailer.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.retailer.distanceKm ?? Number.MAX_SAFE_INTEGER);
  });
}

export function mapMockOrderToSummary(order: (typeof initialOrders)[number]): CustomerOrderSummary {
  return {
    id: order.id,
    retailerId: order.retailerId,
    dateLabel: order.dateLabel,
    status: order.status,
    total: order.total,
    items: order.items,
    paymentStatus: 'PENDING',
    prescriptionStatus: 'NOT_REQUIRED',
    invoiceId: null,
    invoiceNumber: null,
  };
}

export function mapSummaryToTracking(order: CustomerOrderSummary): CustomerOrderTrackingState {
  return {
    ...order,
    deliveryMethod: 'home',
    trackingEvents: [
      {
        id: `${order.id}-placed`,
        statusLabel: 'Order placed',
        notes: 'Visible in the local prototype timeline.',
      },
    ],
    rejectionReason: null,
  };
}

export const emptySignupState: SignupState = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
};
