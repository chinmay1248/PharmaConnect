import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, SafeAreaView, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { resolveApiUrl } from '../services/api';
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
  updateRetailerInventory,
  updateRetailerOrderDelivery,
  updateRetailerOrderStatus,
} from '../services/retailer';
import { requestCurrentPosition } from '../services/courierLocation';
import type { AuthSession } from '../services/session';
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
import { RetailerAnalyticsTab } from './retailer/RetailerAnalyticsTab';
import { RetailerBuyTab } from './retailer/RetailerBuyTab';
import { RetailerDashboardTab } from './retailer/RetailerDashboardTab';
import { RetailerInventoryTab } from './retailer/RetailerInventoryTab';
import { RetailerOrdersTab } from './retailer/RetailerOrdersTab';
import {
  buildMockSummary,
  mockInventory,
  mockOrders,
  mockPurchaseOrders,
  mockRetailer,
  mockWholesellerInventory,
  mockWholesellers,
  normalizeStatusLabel,
  orderFilters,
  styles,
  type InventoryFilter,
  type OrderFilter,
} from './retailer/retailerShared';

type RetailerModuleAppProps = {
  session: AuthSession;
  onSignOut: () => void;
};

export function RetailerModuleApp({ session, onSignOut }: RetailerModuleAppProps) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<RetailerTab>('dashboard');
  const [retailer, setRetailer] = useState<RetailerProfile>(
    (session.user.retailerProfile as RetailerProfile | null) ?? mockRetailer,
  );
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
  const [courierName, setCourierName] = useState('Pharmacy delivery partner');
  const [courierPhone, setCourierPhone] = useState('');
  const [courierEtaMinutes, setCourierEtaMinutes] = useState('30');
  const [prescriptionApprovalNote, setPrescriptionApprovalNote] = useState('Prescription verified and order approved.');
  const [rejectionReason, setRejectionReason] = useState('Prescription or stock could not be verified.');
  const [loading, setLoading] = useState(false);
  const [helperText, setHelperText] = useState<string | null>('Loading your pharmacy workspace.');
  const theme = themes[mode];
  const retailerId = retailer.id;

  async function loadRetailerData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    setHelperText(null);

    try {
      const liveRetailer = (session.user.retailerProfile as RetailerProfile | null) ?? mockRetailer;

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
      const approvalNote = order.prescription
        ? prescriptionApprovalNote.trim() || 'Prescription verified and order approved.'
        : 'Retailer approved the order.';
      const payload = await decideRetailerOrder(retailer.id, order.id, 'APPROVE', approvalNote);
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
      // Dispatching a home delivery also opens the courier record the customer's tracking screen
      // follows, so the courier details entered on this screen travel with the status change.
      const payload = await updateRetailerOrderStatus(
        retailer.id,
        order.id,
        nextStatus,
        `Retailer marked order as ${nextStatus}.`,
        nextStatus === 'OUT_FOR_DELIVERY'
          ? {
              courierName: courierName.trim() || undefined,
              courierPhone: courierPhone.trim() || undefined,
              etaMinutes: Number(courierEtaMinutes) || undefined,
            }
          : undefined,
      );
      upsertOrder(payload.order);
      Alert.alert('Order updated', `Order moved to ${normalizeStatusLabel(nextStatus)}.`);
    } catch (error) {
      Alert.alert('Status update failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  // Shares the delivery device's current position with the customer's tracking screen. Location
  // permission is requested only when the retailer actually taps to share.
  async function shareCourierLocation(order: RetailerOrder) {
    if (order.status !== 'OUT_FOR_DELIVERY') {
      Alert.alert('Not dispatched yet', 'Courier location can only be shared once the order is out for delivery.');
      return;
    }

    setLoading(true);

    try {
      const position = await requestCurrentPosition();

      await updateRetailerOrderDelivery(retailer.id, order.id, {
        ...(position ? { latitude: position.latitude, longitude: position.longitude } : {}),
        ...(Number(courierEtaMinutes) ? { etaMinutes: Number(courierEtaMinutes) } : {}),
        ...(courierName.trim() ? { courierName: courierName.trim() } : {}),
        ...(courierPhone.trim() ? { courierPhone: courierPhone.trim() } : {}),
      });

      Alert.alert(
        'Delivery updated',
        position
          ? 'The customer can now see the courier position and updated ETA.'
          : 'ETA and courier details were shared. Location was not available on this device.',
      );
    } catch (error) {
      Alert.alert(
        'Delivery update failed',
        error instanceof Error ? error.message : 'The delivery update could not be sent.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function openPrescription(order: RetailerOrder) {
    const fileUrl = order.prescription?.fileUrl?.trim();

    if (!fileUrl) {
      Alert.alert('Prescription unavailable', 'This order does not have a prescription file attached.');
      return;
    }

    const resolvedUrl = resolveApiUrl(fileUrl);

    try {
      const supported = await Linking.canOpenURL(resolvedUrl);

      if (!supported) {
        throw new Error('This device cannot open the prescription link right now.');
      }

      await Linking.openURL(resolvedUrl);
    } catch (error) {
      Alert.alert(
        'Could not open prescription',
        error instanceof Error ? error.message : 'The prescription link could not be opened right now.',
      );
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
            <InteractivePressable
              onPress={onSignOut}
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
            >
              <Feather name="log-out" size={18} color={theme.primary} />
            </InteractivePressable>
          </View>
        </View>
        <Text style={[styles.storeName, { color: theme.text }]}>{retailer.businessName}</Text>
        <Text style={[styles.storeMeta, { color: theme.subtext }]}>
          {retailer.area}, {retailer.city} - Rating {retailer.rating}
        </Text>
        <Text style={[styles.storeMeta, { color: theme.subtext }]}>Signed in as {session.user.fullName}</Text>
        {helperText || loading ? (
          <Text style={[styles.helper, { color: theme.subtext }]}>
            {loading ? 'Syncing retailer workspace with backend.' : helperText}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderBody() {
    if (activeTab === 'orders') {
      return (
        <RetailerOrdersTab
          mode={mode}
          orders={orders}
          filteredOrders={filteredOrders}
          selectedOrder={selectedOrder}
          onSelectOrder={selectOrder}
          searchText={searchText}
          setSearchText={setSearchText}
          orderFilter={orderFilter}
          setOrderFilter={setOrderFilter}
          prescriptionApprovalNote={prescriptionApprovalNote}
          setPrescriptionApprovalNote={setPrescriptionApprovalNote}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          courierName={courierName}
          setCourierName={setCourierName}
          courierPhone={courierPhone}
          setCourierPhone={setCourierPhone}
          courierEtaMinutes={courierEtaMinutes}
          setCourierEtaMinutes={setCourierEtaMinutes}
          approveOrder={approveOrder}
          rejectOrder={rejectOrder}
          moveOrder={moveOrder}
          shareCourierLocation={shareCourierLocation}
          openPrescription={openPrescription}
        />
      );
    }

    if (activeTab === 'inventory') {
      return (
        <RetailerInventoryTab
          mode={mode}
          filteredInventory={filteredInventory}
          searchText={searchText}
          setSearchText={setSearchText}
          inventoryFilter={inventoryFilter}
          setInventoryFilter={setInventoryFilter}
          increaseInventoryStock={increaseInventoryStock}
          addDemoBatch={addDemoBatch}
        />
      );
    }

    if (activeTab === 'buy') {
      return (
        <RetailerBuyTab
          mode={mode}
          inventory={inventory}
          wholesellers={wholesellers}
          selectedWholesellerId={selectedWholesellerId}
          setSelectedWholesellerId={setSelectedWholesellerId}
          buySearchText={buySearchText}
          setBuySearchText={setBuySearchText}
          buyResults={buyResults}
          purchaseOrders={purchaseOrders}
          placePurchaseOrder={placePurchaseOrder}
          confirmPurchaseReceipt={confirmPurchaseReceipt}
        />
      );
    }

    if (activeTab === 'analytics') {
      return <RetailerAnalyticsTab mode={mode} summary={summary} />;
    }

    return (
      <RetailerDashboardTab
        mode={mode}
        orders={orders}
        summary={summary}
        selectedOrder={selectedOrder}
        onSelectOrder={selectOrder}
        setOrderFilter={setOrderFilter}
        setInventoryFilter={setInventoryFilter}
        setActiveTab={setActiveTab}
      />
    );
  }

  function selectOrder(id: string) {
    setSelectedOrderId(id);
    setActiveTab('orders');
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
