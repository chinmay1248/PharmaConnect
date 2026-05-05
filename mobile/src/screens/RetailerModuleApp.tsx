import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import { formatCurrency } from '../utils/format';
import {
  addRetailerInventoryBatch,
  confirmRetailerPurchaseReceipt,
  createRetailerPurchaseOrder,
  decideRetailerOrder,
  fetchRetailerOrders,
  fetchRetailerPurchaseOrders,
  fetchRetailerProfile,
  fetchRetailerSummary,
  fetchWholesellerInventory,
  fetchWholesellers,
  loginDemoRetailer,
  updateRetailerInventory,
  updateRetailerOrderStatus,
} from '../services/retailer';
import { ThemeMode, statusBarStyle, themes } from '../theme/theme';
import type {
  RetailerInventoryItem,
  RetailerOrder,
  RetailerPurchaseOrder,
  RetailerProfile,
  RetailerSummary,
  RetailerTab,
  WholesellerInventoryItem,
  WholesellerSummary,
} from './retailer/retailerTypes';

type OrderFilter = 'ALL' | 'PENDING_ACTION' | 'APPROVED_BY_RETAILER' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'REJECTED_BY_RETAILER';
type InventoryFilter = 'all' | 'low' | 'out';

const mockRetailer: RetailerProfile = {
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

const mockInventory: RetailerInventoryItem[] = [
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

const mockOrders: RetailerOrder[] = [
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

const mockWholesellers: WholesellerSummary[] = [
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

const mockWholesellerInventory: WholesellerInventoryItem[] = [
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

const mockPurchaseOrders: RetailerPurchaseOrder[] = [];

const orderFilters: Array<{ id: OrderFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING_ACTION', label: 'Pending' },
  { id: 'APPROVED_BY_RETAILER', label: 'Approved' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'OUT_FOR_DELIVERY', label: 'Dispatched' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'REJECTED_BY_RETAILER', label: 'Denied' },
];

function statusColor(status: string) {
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

function formatShortDate(value?: string | null) {
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

function formatAddress(order: RetailerOrder) {
  const address = order.deliveryAddress;

  if (!address) {
    return 'Pickup from pharmacy';
  }

  return [address.line1, address.line2, address.area, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
}

function countByStatus(orders: RetailerOrder[], filter: OrderFilter) {
  if (filter === 'ALL') {
    return orders.length;
  }

  if (filter === 'PENDING_ACTION') {
    return orders.filter((order) => order.status === 'PENDING_RETAILER_APPROVAL').length;
  }

  return orders.filter((order) => order.status === filter).length;
}

function normalizeStatusLabel(status: string) {
  return status
    .replace('PENDING_RETAILER_APPROVAL', 'Pending')
    .replace('APPROVED_BY_RETAILER', 'Approved')
    .replace('REJECTED_BY_RETAILER', 'Denied')
    .replace('OUT_FOR_DELIVERY', 'Dispatched')
    .replace('READY_FOR_PICKUP', 'Pickup Ready')
    .replace(/_/g, ' ');
}

function hasPrescription(order: RetailerOrder) {
  return Boolean(order.prescription);
}

function buildMockSummary(orders: RetailerOrder[], inventory: RetailerInventoryItem[]): RetailerSummary {
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
        .filter((order) => ['PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED'].includes(order.status))
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
  };
}

function ActionButton({
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

export function RetailerModuleApp() {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [activeTab, setActiveTab] = useState<RetailerTab>('dashboard');
  const [retailer, setRetailer] = useState<RetailerProfile>(mockRetailer);
  const [summary, setSummary] = useState<RetailerSummary>(() => buildMockSummary(mockOrders, mockInventory));
  const [orders, setOrders] = useState<RetailerOrder[]>(mockOrders);
  const [inventory, setInventory] = useState<RetailerInventoryItem[]>(mockInventory);
  const [wholesellers, setWholesellers] = useState<WholesellerSummary[]>(mockWholesellers);
  const [wholesellerInventory, setWholesellerInventory] = useState<WholesellerInventoryItem[]>(mockWholesellerInventory);
  const [purchaseOrders, setPurchaseOrders] = useState<RetailerPurchaseOrder[]>(mockPurchaseOrders);
  const [selectedWholesellerId, setSelectedWholesellerId] = useState(mockWholesellers[0].id);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(mockOrders[0]?.id ?? null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [buySearchText, setBuySearchText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Prescription or stock could not be verified.');
  const [loading, setLoading] = useState(false);
  const [helperText, setHelperText] = useState<string | null>('Signing in as the seeded demo retailer.');
  const theme = themes[mode];
  const retailerId = retailer.id;

  async function loadRetailerData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    setHelperText(null);

    try {
      const session = await loginDemoRetailer();
      const liveRetailer = session.user.retailerProfile ?? mockRetailer;

      setRetailer(liveRetailer);

      const [profilePayload, summaryPayload, ordersPayload, wholesalersPayload, purchaseOrdersPayload] = await Promise.all([
        fetchRetailerProfile(liveRetailer.id),
        fetchRetailerSummary(liveRetailer.id),
        fetchRetailerOrders(liveRetailer.id, orderFilter),
        fetchWholesellers(),
        fetchRetailerPurchaseOrders(liveRetailer.id),
      ]);

      setRetailer(profilePayload.retailer);
      setInventory(profilePayload.retailer.inventory.length ? profilePayload.retailer.inventory : mockInventory);
      setSummary(summaryPayload);
      setOrders(ordersPayload.orders.length ? ordersPayload.orders : []);
      setWholesellers(wholesalersPayload.wholesellers.length ? wholesalersPayload.wholesellers : mockWholesellers);
      setPurchaseOrders(purchaseOrdersPayload.orders);

      const firstWholesellerId = wholesalersPayload.wholesellers[0]?.id ?? selectedWholesellerId;
      setSelectedWholesellerId(firstWholesellerId);

      if (firstWholesellerId) {
        const wholesellerInventoryPayload = await fetchWholesellerInventory(firstWholesellerId);
        setWholesellerInventory(
          wholesellerInventoryPayload.inventory.length ? wholesellerInventoryPayload.inventory : mockWholesellerInventory,
        );
      }
    } catch (error) {
      setHelperText(
        error instanceof Error
          ? `Showing retailer prototype data until the backend is reachable: ${error.message}`
          : 'Showing retailer prototype data until the backend is reachable.',
      );
      setRetailer(mockRetailer);
      setInventory(mockInventory);
      setOrders(mockOrders);
      setWholesellers(mockWholesellers);
      setWholesellerInventory(mockWholesellerInventory);
      setPurchaseOrders(mockPurchaseOrders);
      setSummary(buildMockSummary(mockOrders, mockInventory));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadRetailerData();
  }, []);

  useEffect(() => {
    const ordersTimer = setInterval(() => {
      if (retailerId) {
        void fetchRetailerOrders(retailerId, orderFilter)
          .then((payload) => setOrders(payload.orders))
          .catch(() => undefined);
      }
    }, 30000);

    const summaryTimer = setInterval(() => {
      if (retailerId) {
        void fetchRetailerSummary(retailerId)
          .then(setSummary)
          .catch(() => undefined);
      }
    }, 60000);

    return () => {
      clearInterval(ordersTimer);
      clearInterval(summaryTimer);
    };
  }, [orderFilter, retailerId]);

  useEffect(() => {
    if (!selectedWholesellerId || selectedWholesellerId === 'wh-demo') {
      return;
    }

    void fetchWholesellerInventory(selectedWholesellerId)
      .then((payload) => setWholesellerInventory(payload.inventory))
      .catch(() => setWholesellerInventory(mockWholesellerInventory));
  }, [selectedWholesellerId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === 'ALL' ||
        (orderFilter === 'PENDING_ACTION' && order.status === 'PENDING_RETAILER_APPROVAL') ||
        order.status === orderFilter;
      const matchesSearch =
        !normalizedSearch ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        order.customer.fullName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [orderFilter, orders, searchText]);

  const filteredInventory = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return inventory.filter((item) => {
      const isLow = item.availableQuantity <= (item.reorderLevel ?? 0);
      const isOut = item.availableQuantity <= 0;
      const matchesFilter =
        inventoryFilter === 'all' ||
        (inventoryFilter === 'low' && isLow && !isOut) ||
        (inventoryFilter === 'out' && isOut);
      const matchesSearch =
        !normalizedSearch ||
        item.brandName.toLowerCase().includes(normalizedSearch) ||
        item.genericName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [inventory, inventoryFilter, searchText]);

  const buyResults = useMemo(() => {
    const normalizedSearch = buySearchText.trim().toLowerCase();

    return wholesellerInventory.filter(
      (item) =>
        !normalizedSearch ||
        item.brandName.toLowerCase().includes(normalizedSearch) ||
        item.genericName.toLowerCase().includes(normalizedSearch),
    );
  }, [buySearchText, wholesellerInventory]);

  async function refreshAll() {
    await loadRetailerData();
  }

  function upsertOrder(order: RetailerOrder) {
    setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
    setSelectedOrderId(order.id);
  }

  async function approveOrder(order: RetailerOrder) {
    setLoading(true);

    try {
      const payload = await decideRetailerOrder(retailer.id, order.id, 'APPROVE', 'Retailer approved the order.');
      upsertOrder(payload.order);
      Alert.alert('Order approved', 'The customer has been notified.');
    } catch (error) {
      Alert.alert('Approval failed', error instanceof Error ? error.message : 'Order could not be approved right now.');
    } finally {
      setLoading(false);
    }
  }

  async function rejectOrder(order: RetailerOrder) {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason required', 'Enter a denial reason before rejecting this order.');
      return;
    }

    setLoading(true);

    try {
      const payload = await decideRetailerOrder(retailer.id, order.id, 'REJECT', rejectionReason.trim());
      upsertOrder(payload.order);
      Alert.alert('Order denied', 'The customer has been notified with the reason.');
    } catch (error) {
      Alert.alert('Denial failed', error instanceof Error ? error.message : 'Order could not be denied right now.');
    } finally {
      setLoading(false);
    }
  }

  async function moveOrder(order: RetailerOrder) {
    const nextStatus =
      order.status === 'APPROVED_BY_RETAILER' || order.status === 'PAYMENT_PENDING' || order.status === 'PAID'
        ? 'PACKED'
        : order.status === 'PACKED'
          ? order.deliveryMethod === 'PICKUP'
            ? 'READY_FOR_PICKUP'
            : 'OUT_FOR_DELIVERY'
          : order.status === 'OUT_FOR_DELIVERY' || order.status === 'READY_FOR_PICKUP'
            ? 'DELIVERED'
            : null;

    if (!nextStatus) {
      return;
    }

    setLoading(true);

    try {
      const payload = await updateRetailerOrderStatus(retailer.id, order.id, nextStatus, `Retailer marked order as ${nextStatus}.`);
      upsertOrder(payload.order);
      Alert.alert('Order updated', `Order moved to ${normalizeStatusLabel(nextStatus)}.`);
    } catch (error) {
      Alert.alert('Status update failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  async function addDemoBatch(item: RetailerInventoryItem) {
    setLoading(true);

    try {
      await addRetailerInventoryBatch(retailer.id, item.inventoryId, {
        batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
        quantity: 12,
        purchasePrice: Math.max(1, item.salePrice * 0.82),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const profilePayload = await fetchRetailerProfile(retailer.id);
      setInventory(profilePayload.retailer.inventory.length ? profilePayload.retailer.inventory : mockInventory);
      Alert.alert('Batch added', 'A demo batch was added to this inventory item.');
    } catch (error) {
      Alert.alert('Batch failed', error instanceof Error ? error.message : 'Inventory batch could not be added.');
    } finally {
      setLoading(false);
    }
  }

  async function increaseInventoryStock(item: RetailerInventoryItem) {
    setLoading(true);

    try {
      const payload = await updateRetailerInventory(retailer.id, item.inventoryId, {
        stockQuantity: item.stockQuantity + 10,
        salePrice: item.salePrice,
        reorderLevel: item.reorderLevel ?? 10,
      });

      setInventory((current) =>
        current.map((inventoryItem) =>
          inventoryItem.inventoryId === payload.inventory.inventoryId ? payload.inventory : inventoryItem,
        ),
      );
      Alert.alert('Inventory updated', `${item.brandName} stock increased by 10 units.`);
    } catch (error) {
      Alert.alert('Inventory failed', error instanceof Error ? error.message : 'Inventory could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  async function placePurchaseOrder(item: WholesellerInventoryItem) {
    setLoading(true);

    try {
      const payload = await createRetailerPurchaseOrder(retailer.id, {
        wholesellerId: selectedWholesellerId,
        paymentMethod: 'BANK_TRANSFER',
        items: [
          {
            medicineId: item.medicineId,
            quantity: 20,
          },
        ],
      });

      setPurchaseOrders((current) => [payload.order, ...current.filter((order) => order.id !== payload.order.id)]);
      Alert.alert('Purchase order placed', `${item.brandName} was sent to the wholeseller for approval.`);
    } catch (error) {
      Alert.alert('Purchase order failed', error instanceof Error ? error.message : 'Purchase order could not be placed.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmPurchaseReceipt(order: RetailerPurchaseOrder) {
    setLoading(true);

    try {
      const payload = await confirmRetailerPurchaseReceipt(retailer.id, order.id);
      setPurchaseOrders((current) => [payload.order, ...current.filter((item) => item.id !== payload.order.id)]);

      const profilePayload = await fetchRetailerProfile(retailer.id);
      setInventory(profilePayload.retailer.inventory.length ? profilePayload.retailer.inventory : mockInventory);
      Alert.alert('Receipt confirmed', 'Retailer inventory was updated from the purchase order.');
    } catch (error) {
      Alert.alert('Receipt failed', error instanceof Error ? error.message : 'Purchase receipt could not be confirmed.');
    } finally {
      setLoading(false);
    }
  }

  function renderHeader() {
    return (
      <View style={[styles.header, { backgroundColor: theme.surfaceAlt, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <BrandLogo mode={mode} size="compact" align="start" />
          <View style={styles.headerActions}>
            <InteractivePressable
              onPress={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
            >
              <Feather name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={theme.primary} />
            </InteractivePressable>
            <InteractivePressable
              onPress={refreshAll}
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
            >
              <Feather name="refresh-cw" size={18} color={theme.primary} />
            </InteractivePressable>
          </View>
        </View>
        <Text style={[styles.storeName, { color: theme.text }]}>{retailer.businessName}</Text>
        <Text style={[styles.storeMeta, { color: theme.subtext }]}>
          {retailer.area}, {retailer.city} - Rating {retailer.rating}
        </Text>
        {helperText || loading ? (
          <Text style={[styles.helper, { color: theme.subtext }]}>
            {loading ? 'Syncing retailer workspace with backend.' : helperText}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderDashboard() {
    const recentOrders = orders.slice(0, 5);

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Retailer dashboard" description="Live order workload, sales, and stock risk." />
        <View style={styles.kpiGrid}>
          <KpiCard mode={mode} label="Pending Orders" value={summary.metrics.pendingOrders} icon="clock" tone="#f59e0b" onPress={() => { setOrderFilter('PENDING_ACTION'); setActiveTab('orders'); }} />
          <KpiCard mode={mode} label="Revenue" value={formatCurrency(summary.metrics.revenue)} icon="trending-up" tone="#16a34a" />
          <KpiCard mode={mode} label="Delivered" value={summary.metrics.deliveredOrders} icon="check-circle" tone="#1d8cf8" />
          <KpiCard mode={mode} label="Low Stock" value={summary.metrics.lowStockCount} icon="alert-triangle" tone="#ef4444" onPress={() => { setInventoryFilter('low'); setActiveTab('inventory'); }} />
        </View>

        <SectionHeader mode={mode} title="Recent orders" description="Newest customer orders for this pharmacy." />
        {recentOrders.map(renderOrderCard)}

        <SectionHeader mode={mode} title="Alerts" description="Inventory items at or below reorder level." />
        {summary.stockAlerts.length ? summary.stockAlerts.map((item) => (
          <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Available {item.availableQuantity}, reorder at {item.reorderLevel ?? 0}
            </Text>
          </View>
        )) : (
          <Text style={[styles.emptyText, { color: theme.subtext }]}>No stock alerts right now.</Text>
        )}
      </ScrollView>
    );
  }

  function renderOrderCard(order: RetailerOrder) {
    const active = selectedOrder?.id === order.id;

    return (
      <InteractivePressable
        key={order.id}
        onPress={() => {
          setSelectedOrderId(order.id);
          setActiveTab('orders');
        }}
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

  function renderOrders() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Customer orders" description="Approve prescriptions, pack orders, and update delivery." />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search order number or customer"
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {orderFilters.map((filter) => (
            <Chip
              key={filter.id}
              mode={mode}
              label={`${filter.label} ${countByStatus(orders, filter.id)}`}
              active={orderFilter === filter.id}
              onPress={() => setOrderFilter(filter.id)}
            />
          ))}
        </ScrollView>
        {filteredOrders.map(renderOrderCard)}
        {selectedOrder ? renderOrderDetail(selectedOrder) : null}
      </ScrollView>
    );
  }

  function renderOrderDetail(order: RetailerOrder) {
    const canDecide = order.status === 'PENDING_RETAILER_APPROVAL';
    const canMove = ['APPROVED_BY_RETAILER', 'PAYMENT_PENDING', 'PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(order.status);

    return (
      <View style={[styles.detailPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <SectionHeader mode={mode} title="Order detail" description="Customer, prescription, payment, and fulfilment actions." />
        <Text style={[styles.cardTitle, { color: theme.text }]}>{order.customer.fullName}</Text>
        <Text style={[styles.cardMeta, { color: theme.subtext }]}>Phone: {order.customer.phone}</Text>
        <Text style={[styles.cardMeta, { color: theme.subtext }]}>Address: {formatAddress(order)}</Text>
        <Text style={[styles.cardMeta, { color: theme.subtext }]}>
          Payment: {order.latestPayment?.method ?? 'Not selected'} - {order.latestPayment?.status ?? 'Pending'}
        </Text>

        <View style={styles.table}>
          {order.items.map((item) => (
            <View key={`${order.id}-${item.medicineId}`} style={styles.tableRow}>
              <View style={styles.tableName}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                <Text style={[styles.cardMeta, { color: theme.subtext }]}>{item.genericName}</Text>
              </View>
              <Text style={[styles.cardMeta, { color: theme.subtext }]}>x{item.quantity}</Text>
              <Text style={[styles.cardMeta, { color: theme.text }]}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.billBox}>
          <BillRow mode={mode} label="Subtotal" value={formatCurrency(order.subtotalAmount)} />
          <BillRow mode={mode} label="Delivery" value={formatCurrency(order.deliveryFee)} />
          <BillRow mode={mode} label="Total" value={formatCurrency(order.totalAmount)} strong />
        </View>

        {order.prescription ? (
          <View style={[styles.rxBox, { borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Prescription</Text>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              {order.prescription.originalFileName ?? 'Uploaded prescription'} - {order.prescription.status}
            </Text>
            <Text style={[styles.cardMeta, { color: theme.primary }]}>{order.prescription.fileUrl}</Text>
          </View>
        ) : null}

        {canDecide ? (
          <>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Denial reason"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            />
            <View style={styles.actionRow}>
              <ActionButton mode={mode} label="Approve" icon="check" onPress={() => { void approveOrder(order); }} />
              <ActionButton mode={mode} label="Deny" icon="x" variant="danger" onPress={() => { void rejectOrder(order); }} />
            </View>
          </>
        ) : null}

        {canMove ? (
          <ActionButton mode={mode} label="Move to next status" icon="arrow-right" onPress={() => { void moveOrder(order); }} />
        ) : null}
      </View>
    );
  }

  function renderInventory() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Inventory" description="Stock, selling price, and reorder risk by medicine." />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search medicines in inventory"
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <View style={styles.chipRow}>
          <Chip mode={mode} label="All" active={inventoryFilter === 'all'} onPress={() => setInventoryFilter('all')} />
          <Chip mode={mode} label="Low Stock" active={inventoryFilter === 'low'} onPress={() => setInventoryFilter('low')} />
          <Chip mode={mode} label="Out" active={inventoryFilter === 'out'} onPress={() => setInventoryFilter('out')} />
        </View>
        {filteredInventory.map((item) => {
          const isLow = item.availableQuantity <= (item.reorderLevel ?? 0);
          const fill = Math.min(100, Math.max(0, (item.availableQuantity / Math.max(item.reorderLevel ?? 20, 1)) * 100));

          return (
            <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                  <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                    {item.genericName} - {item.dosage ?? 'Dose'} - {item.packSize ?? 'Pack'}
                  </Text>
                </View>
                <Text style={[styles.stockNumber, { color: isLow ? '#ef4444' : theme.text }]}>{item.availableQuantity}</Text>
              </View>
              <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                Selling {formatCurrency(item.salePrice)} - Reorder at {item.reorderLevel ?? 0}
              </Text>
              <View style={[styles.stockTrack, { backgroundColor: theme.elevated }]}>
                <View style={[styles.stockFill, { width: `${fill}%`, backgroundColor: isLow ? '#f59e0b' : '#16a34a' }]} />
              </View>
              <View style={styles.actionRow}>
                <ActionButton
                  mode={mode}
                  label="+10 stock"
                  icon="plus"
                  variant="secondary"
                  onPress={() => {
                    void increaseInventoryStock(item);
                  }}
                />
                <ActionButton
                  mode={mode}
                  label="Add batch"
                  icon="layers"
                  variant="secondary"
                  onPress={() => {
                    void addDemoBatch(item);
                  }}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  function renderBuy() {
    const lowStock = inventory.filter((item) => item.availableQuantity <= (item.reorderLevel ?? 0));
    const selectedWholeseller = wholesellers.find((item) => item.id === selectedWholesellerId) ?? wholesellers[0];

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Buy stock" description="Find wholesalers and restock low inventory items." />
        <TextInput
          value={buySearchText}
          onChangeText={setBuySearchText}
          placeholder="Search medicines to restock"
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />

        <SectionHeader mode={mode} title="Low stock" description="Tap a medicine to search wholesaler stock." />
        {lowStock.length ? lowStock.map((item) => (
          <InteractivePressable
            key={item.inventoryId}
            onPress={() => setBuySearchText(item.brandName)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Available {item.availableQuantity}, reorder at {item.reorderLevel ?? 0}
            </Text>
          </InteractivePressable>
        )) : (
          <Text style={[styles.emptyText, { color: theme.subtext }]}>No low-stock items to restock.</Text>
        )}

        <SectionHeader mode={mode} title="Wholesalers" description={selectedWholeseller?.businessName ?? 'Select a wholesaler'} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {wholesellers.map((wholeseller) => (
            <Chip
              key={wholeseller.id}
              mode={mode}
              label={wholeseller.businessName}
              active={selectedWholesellerId === wholeseller.id}
              onPress={() => setSelectedWholesellerId(wholeseller.id)}
            />
          ))}
        </ScrollView>

        {buyResults.map((item) => {
          const subtotal = item.salePrice * 20;
          const gst = subtotal * 0.05;

          return (
            <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                  <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                    {item.genericName} - {item.availableQuantity} units available
                  </Text>
                </View>
                <Text style={[styles.stockNumber, { color: theme.text }]}>{formatCurrency(item.salePrice)}</Text>
              </View>
              <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                Demo order 20 units: subtotal {formatCurrency(subtotal)}, GST {formatCurrency(gst)}, total {formatCurrency(subtotal + gst)}
              </Text>
              <ActionButton
                mode={mode}
                label="Place purchase order"
                icon="shopping-bag"
                onPress={() => {
                  void placePurchaseOrder(item);
                }}
              />
            </View>
          );
        })}

        <SectionHeader mode={mode} title="Purchase orders" description="Restock requests sent to wholesalers." />
        {purchaseOrders.length ? purchaseOrders.map((order) => (
          <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{order.id}</Text>
                <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                  {order.wholeseller.businessName} - {formatShortDate(order.placedAt)} - {order.items.length} item{order.items.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={[styles.statusPill, { borderColor: statusColor(order.status), backgroundColor: `${statusColor(order.status)}22` }]}>
                <Text style={[styles.statusText, { color: statusColor(order.status) }]}>{normalizeStatusLabel(order.status)}</Text>
              </View>
            </View>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Total {formatCurrency(order.totalAmount)} - Payment {order.latestPayment?.status ?? 'PENDING'}
            </Text>
            {['DISPATCHED', 'PAID', 'APPROVED'].includes(order.status) ? (
              <ActionButton
                mode={mode}
                label="Confirm receipt"
                icon="check-circle"
                variant="secondary"
                onPress={() => {
                  void confirmPurchaseReceipt(order);
                }}
              />
            ) : null}
          </View>
        )) : (
          <Text style={[styles.emptyText, { color: theme.subtext }]}>Purchase orders placed from this screen will appear here.</Text>
        )}
      </ScrollView>
    );
  }

  function renderAnalytics() {
    const revenue = summary.metrics.revenue;
    const topMedicines = inventory
      .map((item) => ({
        ...item,
        estimatedUnitsSold: Math.max(0, item.stockQuantity - item.availableQuantity + item.reservedQuantity!),
      }))
      .sort((a, b) => b.estimatedUnitsSold - a.estimatedUnitsSold)
      .slice(0, 5);

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Analytics" description="Prototype sales and operational summary for the retailer." />
        <View style={styles.kpiGrid}>
          <KpiCard mode={mode} label="Revenue" value={formatCurrency(revenue)} icon="bar-chart-2" tone="#16a34a" />
          <KpiCard mode={mode} label="Total Orders" value={summary.metrics.totalOrders} icon="package" tone="#1d8cf8" />
          <KpiCard mode={mode} label="Active" value={summary.metrics.activeOrders} icon="activity" tone="#8b5cf6" />
          <KpiCard mode={mode} label="Low Stock" value={summary.metrics.lowStockCount} icon="alert-circle" tone="#ef4444" />
        </View>
        <SectionHeader mode={mode} title="Top selling medicines" description="Estimated from current seeded stock movement." />
        {topMedicines.map((item, index) => (
          <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>#{index + 1} {item.brandName}</Text>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Estimated sold {item.estimatedUnitsSold} - Current available {item.availableQuantity}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  function renderBody() {
    if (activeTab === 'orders') {
      return renderOrders();
    }

    if (activeTab === 'inventory') {
      return renderInventory();
    }

    if (activeTab === 'buy') {
      return renderBuy();
    }

    if (activeTab === 'analytics') {
      return renderAnalytics();
    }

    return renderDashboard();
  }

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(mode)} />
      {renderHeader()}
      {renderBody()}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {([
          ['dashboard', 'grid', 'Dashboard'],
          ['orders', 'package', 'Orders'],
          ['inventory', 'archive', 'Inventory'],
          ['buy', 'shopping-bag', 'Buy'],
          ['analytics', 'bar-chart-2', 'Analytics'],
        ] as Array<[RetailerTab, keyof typeof Feather.glyphMap, string]>).map(([tab, icon, label]) => {
          const active = activeTab === tab;

          return (
            <InteractivePressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, { backgroundColor: active ? theme.primarySoft : 'transparent' }]}
              hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
            >
              <Feather name={icon} size={18} color={active ? theme.primaryStrong : theme.subtext} />
              <Text style={[styles.tabLabel, { color: active ? theme.primaryStrong : theme.subtext }]}>{label}</Text>
            </InteractivePressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function KpiCard({
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
      style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
    >
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}22` }]}>
        <Feather name={icon} size={18} color={tone} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.subtext }]}>{label}</Text>
    </InteractivePressable>
  );
}

function Chip({
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

function BillRow({ mode, label, value, strong = false }: { mode: ThemeMode; label: string; value: string; strong?: boolean }) {
  const theme = themes[mode];

  return (
    <View style={styles.billRow}>
      <Text style={[strong ? styles.billStrong : styles.billText, { color: strong ? theme.text : theme.subtext }]}>{label}</Text>
      <Text style={[strong ? styles.billStrong : styles.billText, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 8,
    padding: 14,
    gap: 8,
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
