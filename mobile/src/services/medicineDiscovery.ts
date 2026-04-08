import type { Medicine, Retailer, RetailerStock } from '../data/mockData';
import type { PharmacySort, SortedPharmacy } from '../screens/customer/customerTypes';
import { getJson } from './api';

type SearchMedicineDto = {
  id: string;
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  mrp: number;
  medicineType: 'OTC' | 'PRESCRIPTION';
  isGeneric: boolean;
  company: string | null;
  salts: string[];
  uses: string[];
  retailerCount: number;
  lowestPrice: number | null;
};

type MedicineDetailDto = {
  id: string;
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  description: string | null;
  mrp: number;
  medicineType: 'OTC' | 'PRESCRIPTION';
  isGeneric: boolean;
  company: string | null;
  aliases: string[];
  salts: Array<{
    name: string;
    strength: string;
    unit: string;
  }>;
  uses: string[];
  substitutes: Array<{
    id: string;
    brandName: string;
    genericName: string;
    dosage: string;
    mrp: number;
  }>;
};

type RetailerDto = {
  retailerId: string;
  businessName: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  rating: number;
  deliveryAvailable: boolean;
  salePrice: number;
  stockQuantity: number;
  availableQuantity: number;
};

type SearchResponse = {
  medicines: SearchMedicineDto[];
};

type DetailResponse = {
  medicine: MedicineDetailDto;
};

type RetailersResponse = {
  retailers: RetailerDto[];
};

const previewColors = ['#dceeff', '#f5ebff', '#e7f8ec', '#fff0d8', '#ffe3d6', '#e4f3ff'];

function buildPreviewColor(seed: string) {
  const hash = Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0);
  return previewColors[hash % previewColors.length];
}

function formatReviewCount(retailerCount: number) {
  if (retailerCount <= 1) {
    return '24';
  }

  return `${retailerCount * 48}+`;
}

function formatMonthlyOrders(retailerCount: number) {
  if (!retailerCount) {
    return 'New catalogue item ready for pharmacy onboarding';
  }

  if (retailerCount === 1) {
    return '1 pharmacy currently stocking this medicine';
  }

  return `${retailerCount} pharmacies currently stocking this medicine`;
}

function inferRating(retailerCount: number) {
  return Number(Math.min(4.9, 4 + retailerCount * 0.18).toFixed(1));
}

function mapSearchMedicine(medicine: SearchMedicineDto): Medicine {
  const salePrice = medicine.lowestPrice ?? medicine.mrp;
  const salts = medicine.salts.length ? medicine.salts : [`${medicine.genericName} ${medicine.dosage}`];
  const uses = medicine.uses.length ? medicine.uses : ['General care'];

  return {
    id: medicine.id,
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    company: medicine.company ?? 'PharmaConnect partner',
    dosage: medicine.dosage,
    packSize: medicine.packSize,
    mrp: medicine.mrp,
    salePrice,
    rating: inferRating(medicine.retailerCount),
    reviewCount: formatReviewCount(medicine.retailerCount),
    monthlyOrders: formatMonthlyOrders(medicine.retailerCount),
    description: `Salt composition: ${salts.join(', ')}. Used for ${uses.join(', ').toLowerCase()}.`,
    diseases: uses,
    prescriptionRequired: medicine.medicineType === 'PRESCRIPTION',
    isGeneric: medicine.isGeneric,
    substitutes: [],
    badge: medicine.isGeneric ? 'Generic option' : medicine.retailerCount > 1 ? 'Nearby stock' : undefined,
    imageColor: buildPreviewColor(medicine.id),
    couponPrice: salePrice > 5 ? Number(Math.max(salePrice - 4, 0).toFixed(2)) : undefined,
  };
}

function mapMedicineDetail(medicine: MedicineDetailDto): Medicine {
  const salts = medicine.salts.map((salt) => `${salt.name} ${salt.strength}${salt.unit}`);
  const salePrice = medicine.mrp;

  return {
    id: medicine.id,
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    company: medicine.company ?? 'PharmaConnect partner',
    dosage: medicine.dosage,
    packSize: medicine.packSize,
    mrp: medicine.mrp,
    salePrice,
    rating: 4.4,
    reviewCount: '96+',
    monthlyOrders: medicine.aliases.length
      ? `${medicine.aliases.length} alternate search aliases synced`
      : 'Medicine details synced from backend',
    description:
      medicine.description ||
      `Salt composition: ${salts.join(', ')}. Used for ${medicine.uses.join(', ').toLowerCase()}.`,
    diseases: medicine.uses,
    prescriptionRequired: medicine.medicineType === 'PRESCRIPTION',
    isGeneric: medicine.isGeneric,
    substitutes: medicine.substitutes.map((item) => item.brandName),
    badge: medicine.isGeneric ? 'Generic option' : undefined,
    imageColor: buildPreviewColor(medicine.id),
    couponPrice: salePrice > 5 ? Number(Math.max(salePrice - 4, 0).toFixed(2)) : undefined,
  };
}

function mapRetailerOption(medicineId: string, retailer: RetailerDto): SortedPharmacy {
  const stock: RetailerStock = {
    medicineId,
    price: retailer.salePrice,
    stockQty: retailer.availableQuantity,
  };

  const entry: Retailer = {
    id: retailer.retailerId,
    name: retailer.businessName,
    area: `${retailer.area}, ${retailer.city}`,
    distanceKm: null,
    rating: retailer.rating,
    deliveryTime: retailer.deliveryAvailable ? 'Same day delivery' : 'Pickup only',
    deliveryAvailable: retailer.deliveryAvailable,
    stocks: [stock],
  };

  return {
    retailer: entry,
    stock,
  };
}

export async function fetchCatalogueMedicines(limit = 12) {
  const payload = await getJson<SearchResponse>(`/medicines?limit=${limit}`);
  return payload.medicines.map(mapSearchMedicine);
}

export async function searchMedicines(query: string, limit = 20) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  params.set('limit', String(limit));

  const payload = await getJson<SearchResponse>(`/medicines?${params.toString()}`);
  return payload.medicines.map(mapSearchMedicine);
}

export async function fetchMedicineDetail(medicineId: string) {
  const payload = await getJson<DetailResponse>(`/medicines/${medicineId}`);
  return mapMedicineDetail(payload.medicine);
}

export async function fetchMedicineRetailers(medicineId: string, sortBy: PharmacySort) {
  const params = new URLSearchParams({
    sort: sortBy,
  });

  const payload = await getJson<RetailersResponse>(`/medicines/${medicineId}/retailers?${params.toString()}`);
  return payload.retailers.map((retailer) => mapRetailerOption(medicineId, retailer));
}
