import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { formatCurrency } from '../../utils/format';
import { ThemeMode, glowShadow, themes } from '../../theme/theme';
import type {
  RetailerInventoryItem,
  RetailerOrder,
  RetailerProfile,
  RetailerPurchaseOrder,
  RetailerSummary,
  WholesellerInventoryItem,
  WholesellerSummary,
} from './retailerTypes';

export type OrderFilter = 'ALL' | 'PENDING_ACTION' | 'APPROVED_BY_RETAILER' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'REJECTED_BY_RETAILER';
export type InventoryFilter = 'all' | 'low' | 'out';

export const mockRetailer: RetailerProfile = {
  id: 'ret-1',
  businessName: 'Apex Care Pharmacy',
  licenseNumber: 'MH-RX-998877',
  area: 'Shivaji Nagar',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411005',
  rating: 4.7,
  deliveryAvailable: true,
  contact: {
    fullName: 'Apex Care Retailer',
    email: 'retailer@pharmaconnect.app',
    phone: '9000000002',
  },
};

export const mockInventory: RetailerInventoryItem[] = [
  {
    inventoryId: 'inv-paracip',
    medicineId: 'med-1',
    brandName: 'Paracip 650',
    genericName: 'Paracetamol',
    dosage: '650 mg',
    packSize: '15 tablets',
    salePrice: 38,
    stockQuantity: 120,
    reservedQuantity: 0,
    availableQuantity: 120,
    reorderLevel: 20,
  },
  {
    inventoryId: 'inv-glucozen',
    medicineId: 'med-3',
    brandName: 'Glucozen-M',
    genericName: 'Metformin + Glimepiride',
    dosage: '500 mg / 2 mg',
    packSize: '10 tablets',
    salePrice: 104,
    stockQuantity: 8,
    reservedQuantity: 0,
    availableQuantity: 8,
    reorderLevel: 10,
  },
];

export const mockOrders: RetailerOrder[] = [
  {
    id: 'ORD-DEMO-1001',
    status: 'PENDING_RETAILER_APPROVAL',
    timelineStatus: 'Order Placed',
    placedAt: new Date().toISOString(),
    deliveryMethod: 'HOME_DELIVERY',
    subtotalAmount: 104,
    deliveryFee: 35,
    totalAmount: 139,
    customer: {
      id: 'customer-demo',
      fullName: 'Chinmay Customer',
      phone: '9000000001',
      email: 'customer@pharmaconnect.app',
    },
    deliveryAddress: {
      line1: 'Flat 12, Demo Society',
      area: 'Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411005',
    },
    items: [
      {
        medicineId: 'med-3',
        brandName: 'Glucozen-M',
        genericName: 'Metformin + Glimepiride',
        quantity: 1,
        unitPrice: 104,
        lineTotal: 104,
      },
    ],
    prescription: {
      id: 'rx-demo',
      status: 'UPLOADED',
      fileUrl: 'https://uploads.pharmaconnect.app/demo/prescription.jpg',
      originalFileName: 'prescription-demo.jpg',
    },
    latestPayment: {
      method: 'UPI',
      status: 'SUCCESS',
      amount: 139,
      paidAt: new Date().toISOString(),
    },
  },
];

export const mockWholesellers: WholesellerSummary[] = [
  {
    id: 'wh-demo',
    businessName: 'HealthGrid Distribution',
    serviceArea: 'Pune Region',
    activeMedicineCount: 2,
    contact: {
      fullName: 'HealthGrid Wholeseller',
      email: 'wholeseller@pharmaconnect.app',
      phone: '9000000003',
    },
  },
];

export const mockWholesellerInventory: WholesellerInventoryItem[] = [
  {
    inventoryId: 'wh-inv-paracip',
    medicineId: 'med-1',
    brandName: 'Paracip 650',
    genericName: 'Paracetamol',
    dosage: '650 mg',
    packSize: '15 tablets',
    salePrice: 31,
    stockQuantity: 500,
    reservedQuantity: 0,
    availableQuantity: 500,
    reorderLevel: 75,
  },
  {
    inventoryId: 'wh-inv-glucozen',
    medicineId: 'med-3',
    brandName: 'Glucozen-M',
    genericName: 'Metformin + Glimepiride',
    dosage: '500 mg / 2 mg',
    packSize: '10 tablets',
    salePrice: 88,
    stockQuantity: 220,
    reservedQuantity: 0,
    availableQuantity: 220,
    reorderLevel: 40,
  },
];

export const mockPurchaseOrders: RetailerPurchaseOrder[] = [];

export const orderFilters: Array<{ id: OrderFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING_ACTION', label: 'Pending' },
  { id: 'APPROVED_BY_RETAILER', label: 'Approved' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'OUT_FOR_DELIVERY', label: 'Dispatched' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'REJECTED_BY_RETAILER', label: 'Denied' },
];

export const prescriptionDenialReasons = [
  'Prescription image is unclear or cropped.',
  'Medicine or dosage does not match the order.',
  'Prescription date or patient details could not be verified.',
];

export function statusColor(status: string) {
  if (status === 'PENDING_RETAILER_APPROVAL') {
    return '#f59e0b';
  }

  if (status === 'REJECTED_BY_RETAILER') {
    return '#ef4444';
  }

  if (status === 'DELIVERED') {
    return '#16a34a';
  }

  if (status === 'PACKED') {
    return '#8b5cf6';
  }

  if (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP') {
    return '#4f46e5';
  }

  return '#1d8cf8';
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatAddress(order: RetailerOrder) {
  const address = order.deliveryAddress;

  if (!address) {
    return 'Pickup from pharmacy';
  }

  return [address.line1, address.line2, address.area, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
}

export function countByStatus(orders: RetailerOrder[], filter: OrderFilter) {
  if (filter === 'ALL') {
    return orders.length;
  }

  if (filter === 'PENDING_ACTION') {
    return orders.filter((order) => order.status === 'PENDING_RETAILER_APPROVAL').length;
  }

  return orders.filter((order) => order.status === filter).length;
}

export function normalizeStatusLabel(status: string) {
  return status
    .replace('PENDING_RETAILER_APPROVAL', 'Pending')
    .replace('APPROVED_BY_RETAILER', 'Approved')
    .replace('REJECTED_BY_RETAILER', 'Denied')
    .replace('OUT_FOR_DELIVERY', 'Dispatched')
    .replace('READY_FOR_PICKUP', 'Pickup Ready')
    .replace(/_/g, ' ');
}

export function hasPrescription(order: RetailerOrder) {
  return Boolean(order.prescription);
}

export const PAID_ORDER_STATUSES = ['PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED'];

export function buildMockRevenueTrend(orders: RetailerOrder[]) {
  const paidOrders = orders.filter((order) => PAID_ORDER_STATUSES.includes(order.status));
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const order of paidOrders) {
    const key = order.placedAt.slice(0, 10);
    const bucket = byDay.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += order.totalAmount;
    bucket.orders += 1;
    byDay.set(key, bucket);
  }

  const days: Array<{ date: string; revenue: number; orders: number }> = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? { revenue: 0, orders: 0 };
    days.push({ date: key, revenue: bucket.revenue, orders: bucket.orders });
  }
  return days;
}

export function buildMockTopItems(orders: RetailerOrder[]) {
  const paidOrders = orders.filter((order) => PAID_ORDER_STATUSES.includes(order.status));
  const byMedicine = new Map<string, { medicineId: string; brandName: string; quantity: number; revenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const bucket = byMedicine.get(item.medicineId) ?? {
        medicineId: item.medicineId,
        brandName: item.brandName,
        quantity: 0,
        revenue: 0,
      };
      bucket.quantity += item.quantity;
      bucket.revenue += item.lineTotal;
      byMedicine.set(item.medicineId, bucket);
    }
  }
  return Array.from(byMedicine.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export function buildMockSummary(orders: RetailerOrder[], inventory: RetailerInventoryItem[]): RetailerSummary {
  const lowStock = inventory.filter((item) => item.availableQuantity <= (item.reorderLevel ?? 0));

  return {
    retailer: {
      id: mockRetailer.id,
      businessName: mockRetailer.businessName,
    },
    metrics: {
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === 'PENDING_RETAILER_APPROVAL').length,
      activeOrders: orders.filter((order) => !['REJECTED_BY_RETAILER', 'DELIVERED', 'CANCELLED'].includes(order.status)).length,
      deliveredOrders: orders.filter((order) => order.status === 'DELIVERED').length,
      revenue: orders
        .filter((order) => PAID_ORDER_STATUSES.includes(order.status))
        .reduce((sum, order) => sum + order.totalAmount, 0),
      lowStockCount: lowStock.length,
    },
    stockAlerts: lowStock.map((item) => ({
      inventoryId: item.inventoryId,
      medicineId: item.medicineId,
      brandName: item.brandName,
      availableQuantity: item.availableQuantity,
      reorderLevel: item.reorderLevel,
    })),
    revenueTrend: buildMockRevenueTrend(orders),
    topItems: buildMockTopItems(orders),
  };
}

export function ActionButton({
  label,
  icon,
  mode,
  onPress,
  variant = 'primary',
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  mode: ThemeMode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const theme = themes[mode];
  const palette =
    variant === 'danger'
      ? { bg: '#ef4444', color: '#ffffff', border: '#ef4444' }
      : variant === 'secondary'
        ? { bg: theme.surface, color: theme.text, border: theme.border }
        : { bg: theme.primary, color: theme.buttonText, border: theme.primary };

  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}
      hoveredStyle={{ backgroundColor: variant === 'secondary' ? theme.surfaceAlt : palette.bg }}
      pressedStyle={{ backgroundColor: theme.elevated }}
    >
      <Feather name={icon} size={16} color={palette.color} />
      <Text style={[styles.actionLabel, { color: palette.color }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function OrderCard({
  mode,
  order,
  active,
  onPress,
}: {
  mode: ThemeMode;
  order: RetailerOrder;
  active: boolean;
  onPress: () => void;
}) {
  const theme = themes[mode];

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: active ? theme.surfaceAlt : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{order.id}</Text>
          <Text style={[styles.cardMeta, { color: theme.subtext }]}>
            {order.customer.fullName} - {order.items.length} item{order.items.length === 1 ? '' : 's'} - {formatShortDate(order.placedAt)}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor(order.status), backgroundColor: `${statusColor(order.status)}22` }]}>
          <Text style={[styles.statusText, { color: statusColor(order.status) }]}>{normalizeStatusLabel(order.status)}</Text>
        </View>
      </View>
      <View style={styles.inlineMeta}>
        <Text style={[styles.cardMeta, { color: theme.subtext }]}>{formatCurrency(order.totalAmount)}</Text>
        {hasPrescription(order) ? <Text style={[styles.rxBadge, { color: theme.primary }]}>Rx</Text> : null}
        <Text style={[styles.cardMeta, { color: theme.subtext }]}>
          {order.deliveryMethod === 'HOME_DELIVERY' ? 'Home delivery' : 'Pickup'}
        </Text>
      </View>
    </InteractivePressable>
  );
}

export function KpiCard({
  mode,
  label,
  value,
  icon,
  tone,
  onPress,
}: {
  mode: ThemeMode;
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  tone: string;
  onPress?: () => void;
}) {
  const theme = themes[mode];

  return (
    <InteractivePressable
      onPress={onPress ?? (() => undefined)}
      style={[
        styles.kpiCard,
        { backgroundColor: theme.surface, borderColor: theme.hairline },
        glowShadow(theme.shadow, 0.45, 20, 10),
      ]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt, borderColor: tone }}
    >
      <View style={[styles.kpiAccent, { backgroundColor: tone }]} />
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}22` }]}>
        <Feather name={icon} size={18} color={tone} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.subtext }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function Chip({
  mode,
  label,
  active,
  onPress,
}: {
  mode: ThemeMode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = themes[mode];

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primarySoft : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
    >
      <Text style={[styles.chipText, { color: active ? theme.primaryStrong : theme.text }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function BillRow({ mode, label, value, strong = false }: { mode: ThemeMode; label: string; value: string; strong?: boolean }) {
  const theme = themes[mode];

  return (
    <View style={styles.billRow}>
      <Text style={[strong ? styles.billStrong : styles.billText, { color: strong ? theme.text : theme.subtext }]}>{label}</Text>
      <Text style={[strong ? styles.billStrong : styles.billText, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '900',
  },
  storeMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 116,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flexGrow: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  kpiAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  inlineMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  rxBadge: {
    fontSize: 12,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 82,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  table: {
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tableName: {
    flex: 1,
    minWidth: 0,
  },
  billBox: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(77, 168, 255, 0.08)',
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  billText: {
    fontSize: 13,
  },
  billStrong: {
    fontSize: 15,
    fontWeight: '900',
  },
  rxBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 5,
  },
  reviewNote: {
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  stockNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  stockTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    borderRadius: 999,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});
