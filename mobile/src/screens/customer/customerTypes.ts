import { Retailer, RetailerStock } from '../../data/mockData';

// App-level stages shown before the user reaches the main customer app.
export type AppStage = 'splash' | 'signup' | 'app';

// Main customer screens currently available in the prototype.
export type Screen =
  | 'home'
  | 'search'
  | 'detail'
  | 'pharmacies'
  | 'cart'
  | 'prescription'
  | 'payment'
  | 'delivery'
  | 'tracking'
  | 'invoice'
  | 'orders'
  | 'account';

// Sorting options used on the nearby pharmacy comparison screen.
export type PharmacySort = 'closest' | 'cheapest' | 'rating';

// Payment methods offered during checkout.
export type PaymentMethod = 'upi' | 'card' | 'cod' | 'bank' | null;

// Delivery choices shown before placing the order.
export type DeliveryMethod = 'home' | 'pickup' | null;

// Signup form values collected before entering the app.
export type SignupState = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

export type CustomerAddress = {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

export type CustomerSession = {
  token: string;
  user: {
    id: string;
    role: 'CUSTOMER' | string;
    fullName: string;
    email: string;
    phone: string;
    addresses: CustomerAddress[];
  };
};

// Cart state used for the single-medicine prototype checkout flow.
export type CartState = {
  medicineId: string;
  retailerId: string;
  quantity: number;
};

// Invoice summary built after a successful mock order placement.
export type InvoiceState = {
  invoiceNo: string;
  orderId: string;
  medicineId: string;
  retailerId: string;
  quantity: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: Exclude<PaymentMethod, null>;
  deliveryMethod: Exclude<DeliveryMethod, null>;
};

// Sorted pharmacy row used by the pharmacy comparison screen.
export type SortedPharmacy = {
  retailer: Retailer;
  stock: RetailerStock;
};
