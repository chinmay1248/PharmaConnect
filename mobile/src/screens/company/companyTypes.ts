// Shared view-model types for the company (manufacturer) module. API shapes live
// in services/b2b.ts; these are re-exported and extended for screen state.
export type {
  B2BMedicine,
  B2BOrder,
  CompanyProfile,
  CompanySummary,
  Offer,
  WholesellerListItem,
} from '../../services/b2b';

export type CompanyTab = 'dashboard' | 'orders' | 'catalogue' | 'offers' | 'analytics';

// Wholesaler purchase-order lifecycle as seen from the company side.
export type CompanyOrderFilter =
  | 'ALL'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED';
