// Shared view-model types for the wholesaler module. The API shapes live in
// services/b2b.ts; these are re-exported and extended for screen state.
export type {
  B2BOrder,
  B2BMedicine,
  B2BInventoryItem,
  B2BPaymentMethod,
  CompanyListItem,
  Scheme,
  RetailerListItem,
  WholesellerProfile,
  WholesellerSummary,
} from '../../services/b2b';

export type WholesellerTab =
  | 'dashboard'
  | 'retailerOrders'
  | 'inventory'
  | 'companyBuy'
  | 'schemes'
  | 'analytics';

// Retailer purchase-order lifecycle as seen from the wholesaler side.
export type WholesellerOrderFilter =
  | 'ALL'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED';

export type InventoryFilter = 'all' | 'low' | 'out';

// One line in the company-buy cart before the bulk order is placed.
export type CompanyCartLine = {
  medicineId: string;
  brandName: string;
  unitPrice: number;
  quantity: number;
};
