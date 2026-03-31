export type Medicine = {
  id: string;
  brandName: string;
  genericName: string;
  company: string;
  dosage: string;
  packSize: string;
  mrp: number;
  salePrice: number;
  rating: number;
  reviewCount: string;
  monthlyOrders: string;
  description: string;
  diseases: string[];
  prescriptionRequired: boolean;
  isGeneric: boolean;
  substitutes: string[];
  badge?: string;
  imageColor: string;
  couponPrice?: number;
};

export type RetailerStock = {
  medicineId: string;
  price: number;
  stockQty: number;
};

export type Retailer = {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  rating: number;
  deliveryTime: string;
  deliveryAvailable: boolean;
  stocks: RetailerStock[];
};

export type OrderStatus =
  | 'Order Placed'
  | 'Confirmed'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered';

export type OrderItem = {
  medicineId: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  retailerId: string;
  dateLabel: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
};

export type Shortcut = {
  id: string;
  title: string;
};

export type QuickService = {
  id: string;
  title: string;
  color: string;
};

export type Category = {
  id: string;
  title: string;
  tint: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
};

export const quickServices: QuickService[] = [
  { id: 'svc-1', title: 'Rx Upload', color: '#ffe9a5' },
  { id: 'svc-2', title: 'Refill', color: '#d6f4ff' },
  { id: 'svc-3', title: 'Deals', color: '#ffd9d0' },
  { id: 'svc-4', title: 'Doctor', color: '#e6f6d5' },
  { id: 'svc-5', title: 'Care+', color: '#dfe6ff' },
];

export const shortcutChips: Shortcut[] = [
  { id: 'shortcut-1', title: 'Orders' },
  { id: 'shortcut-2', title: 'Buy Again' },
  { id: 'shortcut-3', title: 'Account' },
  { id: 'shortcut-4', title: 'Lists' },
];

export const categories: Category[] = [
  { id: 'cat-1', title: 'Fever', tint: '#e8f7ff' },
  { id: 'cat-2', title: 'Diabetes', tint: '#fef0d8' },
  { id: 'cat-3', title: 'Vitamins', tint: '#f6e9ff' },
  { id: 'cat-4', title: 'Heart', tint: '#eaf5e8' },
  { id: 'cat-5', title: 'Skin', tint: '#fff0f0' },
  { id: 'cat-6', title: 'Baby Care', tint: '#eef3ff' },
  { id: 'cat-7', title: 'Pain Relief', tint: '#fff6d9' },
  { id: 'cat-8', title: 'Digestive', tint: '#e8fbf5' },
];

export const banners: Banner[] = [
  {
    id: 'banner-1',
    title: 'Bulk discounts on daily medicines',
    subtitle: 'Up to 18% off on repeat orders and faster home delivery.',
    accent: '#d8eefc',
  },
  {
    id: 'banner-2',
    title: 'Nearby pharmacy deals',
    subtitle: 'Compare prices from trusted pharmacies around you in one view.',
    accent: '#ffe3d6',
  },
  {
    id: 'banner-3',
    title: 'Prescription support',
    subtitle: 'Upload once, get retailer approval live, and reorder easily later.',
    accent: '#e2f2d5',
  },
];

export const recentSearches = [
  'Paracetamol 650',
  'Vitamin B12 capsules',
  'Azithromycin 500',
  'Sugar tablets',
];

export const medicines: Medicine[] = [
  {
    id: 'med-1',
    brandName: 'Paracip 650',
    genericName: 'Paracetamol',
    company: 'Cipla',
    dosage: '650 mg',
    packSize: '15 tablets',
    mrp: 34,
    salePrice: 31,
    rating: 4.3,
    reviewCount: '2.1K',
    monthlyOrders: '4K+ bought in past month',
    description:
      'Fast-moving fever and body pain medicine with same-salt substitutes from multiple brands.',
    diseases: ['Fever', 'Body Pain', 'Headache'],
    prescriptionRequired: false,
    isGeneric: false,
    substitutes: ['Dolo 650', 'Calpol 650', 'PCM 650'],
    badge: 'Amazon-style pick',
    imageColor: '#dceeff',
    couponPrice: 29,
  },
  {
    id: 'med-2',
    brandName: 'Azifast 500',
    genericName: 'Azithromycin',
    company: 'Sun Pharma',
    dosage: '500 mg',
    packSize: '5 tablets',
    mrp: 96,
    salePrice: 89,
    rating: 4.0,
    reviewCount: '884',
    monthlyOrders: '500+ bought in past month',
    description:
      'Antibiotic used for bacterial infections. Prescription validation required before dispatch.',
    diseases: ['Throat Infection', 'Chest Infection'],
    prescriptionRequired: true,
    isGeneric: false,
    substitutes: ['Azee 500', 'Azikem 500'],
    imageColor: '#f5ebff',
    couponPrice: 84,
  },
  {
    id: 'med-3',
    brandName: 'Glucozen-M',
    genericName: 'Metformin',
    company: 'Mankind',
    dosage: '500 mg',
    packSize: '15 tablets',
    mrp: 58,
    salePrice: 52,
    rating: 4.2,
    reviewCount: '1.3K',
    monthlyOrders: '2K+ bought in past month',
    description:
      'Daily diabetes medicine often bought in repeat cycles with nearby stock visibility.',
    diseases: ['Type 2 Diabetes'],
    prescriptionRequired: true,
    isGeneric: true,
    substitutes: ['Met XL 500', 'Glycomet 500'],
    badge: 'Best price nearby',
    imageColor: '#e7f8ec',
    couponPrice: 49,
  },
  {
    id: 'med-4',
    brandName: 'Neurovit Gold',
    genericName: 'Methylcobalamin',
    company: 'Dr. Morepen',
    dosage: '1500 mcg',
    packSize: '10 capsules',
    mrp: 112,
    salePrice: 104,
    rating: 4.5,
    reviewCount: '3.4K',
    monthlyOrders: '1K+ bought in past month',
    description:
      'Vitamin B12 support capsule usually ordered for regular refill and delivery convenience.',
    diseases: ['Nerve Pain', 'Vitamin B12 Deficiency'],
    prescriptionRequired: false,
    isGeneric: false,
    substitutes: ['Nurokind Gold', 'Mecobal Plus'],
    imageColor: '#fff0d8',
    couponPrice: 99,
  },
];

export const retailers: Retailer[] = [
  {
    id: 'ret-1',
    name: 'MedSquare Pharmacy',
    area: 'Salt Lake Sector V',
    distanceKm: 1.3,
    rating: 4.8,
    deliveryTime: '25 min',
    deliveryAvailable: true,
    stocks: [
      { medicineId: 'med-1', price: 31, stockQty: 42 },
      { medicineId: 'med-2', price: 91, stockQty: 8 },
      { medicineId: 'med-3', price: 54, stockQty: 16 },
    ],
  },
  {
    id: 'ret-2',
    name: 'CareNest Drugs',
    area: 'Kankurgachi',
    distanceKm: 2.7,
    rating: 4.5,
    deliveryTime: '40 min',
    deliveryAvailable: true,
    stocks: [
      { medicineId: 'med-1', price: 32, stockQty: 30 },
      { medicineId: 'med-3', price: 52, stockQty: 11 },
      { medicineId: 'med-4', price: 104, stockQty: 14 },
    ],
  },
  {
    id: 'ret-3',
    name: 'CityCare Medical',
    area: 'Ultadanga',
    distanceKm: 4.1,
    rating: 4.9,
    deliveryTime: 'Pickup in 10 min',
    deliveryAvailable: false,
    stocks: [
      { medicineId: 'med-2', price: 88, stockQty: 5 },
      { medicineId: 'med-4', price: 108, stockQty: 22 },
      { medicineId: 'med-1', price: 33, stockQty: 18 },
    ],
  },
];

export const initialOrders: Order[] = [
  {
    id: 'ORD-2048',
    retailerId: 'ret-1',
    dateLabel: 'Today, 6:15 PM',
    status: 'Out for Delivery',
    total: 91,
    items: [{ medicineId: 'med-2', quantity: 1, unitPrice: 91 }],
  },
  {
    id: 'ORD-1933',
    retailerId: 'ret-2',
    dateLabel: '27 Mar, 10:40 AM',
    status: 'Delivered',
    total: 104,
    items: [{ medicineId: 'med-4', quantity: 1, unitPrice: 104 }],
  },
];
