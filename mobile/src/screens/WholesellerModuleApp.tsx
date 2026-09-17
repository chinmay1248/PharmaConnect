import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RevenueTrendChart, TopItemsChart } from '../components/AnalyticsCharts';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import {
  addWholesellerInventory,
  addWholesellerInventoryBatch,
  createWholesellerCompanyOrder,
  createWholesellerScheme,
  decideWholesellerRetailerOrder,
  fetchCompanies,
  fetchCompanyMedicines,
  fetchRetailers,
  fetchWholesellerCompanyOrders,
  fetchWholesellerInventory,
  fetchWholesellerRetailerOrders,
  fetchWholesellerSchemes,
  fetchWholesellerSummary,
  updateWholesellerInventory,
  updateWholesellerRetailerOrderStatus,
} from '../services/b2b';
import { searchMedicines } from '../services/medicineDiscovery';
import type { AuthSession } from '../services/session';
import { statusBarStyle, themes, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/format';
import type {
  B2BInventoryItem,
  B2BMedicine,
  B2BOrder,
  B2BPaymentMethod,
  CompanyCartLine,
  CompanyListItem,
  InventoryFilter,
  RetailerListItem,
  Scheme,
  WholesellerOrderFilter,
  WholesellerProfile,
  WholesellerSummary,
  WholesellerTab,
} from './wholeseller/wholesellerTypes';

const fallbackProfile: WholesellerProfile = {
  id: 'wh-demo',
  businessName: 'HealthGrid Distribution',
  serviceArea: 'Pune Region',
};

const fallbackSummary: WholesellerSummary = {
  wholeseller: { id: fallbackProfile.id, businessName: fallbackProfile.businessName, serviceArea: fallbackProfile.serviceArea },
  metrics: {
    totalRetailerOrders: 0,
    pendingRetailerOrders: 0,
    deliveredRetailerOrders: 0,
    revenue: 0,
    activeSchemes: 0,
    lowStockCount: 0,
  },
  revenueTrend: [],
  topItems: [],
};

type StockAlert = {
  inventoryId: string;
  medicineId: string;
  brandName: string;
  availableQuantity: number;
  reorderLevel?: number | null;
};

const PAYMENT_METHODS: B2BPaymentMethod[] = ['BANK_TRANSFER', 'UPI', 'CARD', 'CASH_ON_DELIVERY'];

const ORDER_FILTERS: Array<{ key: WholesellerOrderFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'REJECTED', label: 'Rejected' },
];

function normalizeStatus(status: string) {
  return status
    .replace('PENDING_APPROVAL', 'Pending approval')
    .replace('PAYMENT_PENDING', 'Payment pending')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function nextB2BStatus(order: B2BOrder): 'DISPATCHED' | 'DELIVERED' | null {
  if (order.status === 'APPROVED' || order.status === 'PAID') {
    return 'DISPATCHED';
  }
  if (order.status === 'DISPATCHED') {
    return 'DELIVERED';
  }
  return null;
}

function matchesFilter(order: B2BOrder, filter: WholesellerOrderFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'APPROVED') return ['APPROVED', 'PAID', 'PAYMENT_PENDING'].includes(order.status);
  if (filter === 'REJECTED') return order.status === 'REJECTED';
  return order.status === filter;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type WholesellerModuleAppProps = {
  session: AuthSession;
  onSignOut: () => void;
};

export function WholesellerModuleApp({ session, onSignOut }: WholesellerModuleAppProps) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [tab, setTab] = useState<WholesellerTab>('dashboard');
  const [profile, setProfile] = useState<WholesellerProfile>(
    session.user.wholesellerProfile ?? fallbackProfile,
  );
  const [summary, setSummary] = useState<WholesellerSummary>(fallbackSummary);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [retailerOrders, setRetailerOrders] = useState<B2BOrder[]>([]);
  const [companyOrders, setCompanyOrders] = useState<B2BOrder[]>([]);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [medicines, setMedicines] = useState<B2BMedicine[]>([]);
  const [inventory, setInventory] = useState<B2BInventoryItem[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [retailers, setRetailers] = useState<RetailerListItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [helper, setHelper] = useState('Loading your distribution workspace.');

  // Retailer-order screen state.
  const [orderFilter, setOrderFilter] = useState<WholesellerOrderFilter>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Inventory screen state.
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, { salePrice: string; stockQuantity: string; reorderLevel: string }>>({});
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<Array<{ id: string; brandName: string; genericName: string; mrp: number }>>([]);
  const [addPick, setAddPick] = useState<{ id: string; brandName: string; mrp: number } | null>(null);
  const [addPrice, setAddPrice] = useState('');
  const [addQty, setAddQty] = useState('');
  const [batchFor, setBatchFor] = useState<string | null>(null);
  const [batchNo, setBatchNo] = useState('');
  const [batchQty, setBatchQty] = useState('');
  const [batchExpiry, setBatchExpiry] = useState('');

  // Company-buy screen state.
  const [cart, setCart] = useState<Record<string, CompanyCartLine>>({});
  const [payMethod, setPayMethod] = useState<B2BPaymentMethod>('BANK_TRANSFER');

  // Scheme screen state.
  const [schemeTitle, setSchemeTitle] = useState('');
  const [schemeDesc, setSchemeDesc] = useState('');
  const [schemeType, setSchemeType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [schemeValue, setSchemeValue] = useState('');
  const [schemeDays, setSchemeDays] = useState('14');
  const [schemeRetailerId, setSchemeRetailerId] = useState<string | null>(null);

  const theme = themes[mode];

  async function loadWorkspace() {
    setLoading(true);
    const liveProfile = session.user.wholesellerProfile;

    if (!liveProfile) {
      setHelper('This account is not linked to a wholeseller business. Showing a module shell.');
      setLoading(false);
      return;
    }

    setProfile(liveProfile);
    const id = liveProfile.id;

    const [summaryRes, retailerOrdersRes, companyOrdersRes, companiesRes, inventoryRes, schemesRes, retailersRes] =
      await Promise.allSettled([
        fetchWholesellerSummary(id),
        fetchWholesellerRetailerOrders(id),
        fetchWholesellerCompanyOrders(id),
        fetchCompanies(),
        fetchWholesellerInventory(id),
        fetchWholesellerSchemes(id),
        fetchRetailers(),
      ]);

    let anyFailed = false;

    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value);
      setStockAlerts(((summaryRes.value as unknown as { stockAlerts?: StockAlert[] }).stockAlerts) ?? []);
    } else {
      anyFailed = true;
    }
    if (retailerOrdersRes.status === 'fulfilled') setRetailerOrders(retailerOrdersRes.value.orders);
    else anyFailed = true;
    if (companyOrdersRes.status === 'fulfilled') setCompanyOrders(companyOrdersRes.value.orders);
    else anyFailed = true;
    if (companiesRes.status === 'fulfilled') {
      setCompanies(companiesRes.value.companies);
      setSelectedCompanyId((current) => current ?? companiesRes.value.companies[0]?.id ?? null);
    } else {
      anyFailed = true;
    }
    if (inventoryRes.status === 'fulfilled') setInventory(inventoryRes.value.inventory);
    else anyFailed = true;
    if (schemesRes.status === 'fulfilled') setSchemes(schemesRes.value.schemes);
    else anyFailed = true;
    if (retailersRes.status === 'fulfilled') setRetailers(retailersRes.value.retailers);

    setHelper(anyFailed ? 'Some data could not be loaded. Showing the module shell where the backend was unreachable.' : '');
    setLoading(false);
  }

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setMedicines([]);
      return;
    }
    void fetchCompanyMedicines(selectedCompanyId)
      .then((payload) => setMedicines(payload.medicines))
      .catch(() => setMedicines([]));
  }, [selectedCompanyId]);

  useEffect(() => {
    const query = medSearch.trim();
    if (query.length < 2) {
      setMedResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchMedicines(query, 12)
        .then((rows) => {
          if (!cancelled) {
            setMedResults(rows.map((row) => ({ id: row.id, brandName: row.brandName, genericName: row.genericName, mrp: row.mrp })));
          }
        })
        .catch(() => {
          if (!cancelled) setMedResults([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [medSearch]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null,
    [companies, selectedCompanyId],
  );

  const filteredOrders = useMemo(
    () => retailerOrders.filter((order) => matchesFilter(order, orderFilter)),
    [retailerOrders, orderFilter],
  );

  const visibleInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (inventoryFilter === 'low') {
        return item.reorderLevel != null && item.availableQuantity <= item.reorderLevel;
      }
      if (inventoryFilter === 'out') return item.availableQuantity <= 0;
      return true;
    });
  }, [inventory, inventoryFilter]);

  const cartLines = Object.values(cart);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function upsertOrder(order: B2BOrder) {
    setRetailerOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
  }

  async function approveOrder(order: B2BOrder) {
    try {
      const payload = await decideWholesellerRetailerOrder(profile.id, order.id, 'APPROVE');
      upsertOrder(payload.order);
    } catch (error) {
      Alert.alert('Approval failed', error instanceof Error ? error.message : 'Order could not be approved.');
    }
  }

  async function rejectOrder(order: B2BOrder) {
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      Alert.alert('Add a reason', 'Enter at least 5 characters explaining the rejection.');
      return;
    }
    try {
      const payload = await decideWholesellerRetailerOrder(profile.id, order.id, 'REJECT', reason);
      upsertOrder(payload.order);
      setRejectReason('');
      setExpandedOrderId(null);
    } catch (error) {
      Alert.alert('Rejection failed', error instanceof Error ? error.message : 'Order could not be rejected.');
    }
  }

  async function advanceOrder(order: B2BOrder) {
    const status = nextB2BStatus(order);
    if (!status) return;
    try {
      const payload = await updateWholesellerRetailerOrderStatus(profile.id, order.id, status);
      upsertOrder(payload.order);
    } catch (error) {
      Alert.alert('Status update failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    }
  }

  function draftFor(item: B2BInventoryItem) {
    return (
      inventoryDrafts[item.inventoryId] ?? {
        salePrice: String(item.salePrice),
        stockQuantity: String(item.stockQuantity),
        reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : '',
      }
    );
  }

  function setDraft(id: string, patch: Partial<{ salePrice: string; stockQuantity: string; reorderLevel: string }>) {
    setInventoryDrafts((current) => {
      const base = current[id] ?? { salePrice: '', stockQuantity: '', reorderLevel: '' };
      return { ...current, [id]: { ...base, ...patch } };
    });
  }

  function isDirty(item: B2BInventoryItem) {
    const draft = inventoryDrafts[item.inventoryId];
    if (!draft) return false;
    return (
      draft.salePrice !== String(item.salePrice) ||
      draft.stockQuantity !== String(item.stockQuantity) ||
      draft.reorderLevel !== (item.reorderLevel != null ? String(item.reorderLevel) : '')
    );
  }

  async function saveInventoryRow(item: B2BInventoryItem) {
    const draft = draftFor(item);
    const salePrice = Number(draft.salePrice);
    const stockQuantity = Number(draft.stockQuantity);
    const reorderLevel = draft.reorderLevel.trim() === '' ? null : Number(draft.reorderLevel);
    if (!(salePrice > 0) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      Alert.alert('Check the values', 'Enter a positive price and a whole non-negative stock count.');
      return;
    }
    try {
      const payload = await updateWholesellerInventory(profile.id, item.inventoryId, {
        salePrice,
        stockQuantity,
        reorderLevel,
      });
      setInventory((current) => current.map((row) => (row.inventoryId === item.inventoryId ? payload.inventory : row)));
      setInventoryDrafts((current) => {
        const next = { ...current };
        delete next[item.inventoryId];
        return next;
      });
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Inventory row could not be saved.');
    }
  }

  async function addInventoryItem() {
    if (!addPick) return;
    const salePrice = Number(addPrice);
    const stockQuantity = Number(addQty);
    if (!(salePrice > 0) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      Alert.alert('Check the values', 'Enter a positive price and a whole non-negative opening stock.');
      return;
    }
    try {
      const payload = await addWholesellerInventory(profile.id, {
        medicineId: addPick.id,
        salePrice,
        stockQuantity,
      });
      setInventory((current) => [payload.inventory, ...current.filter((row) => row.inventoryId !== payload.inventory.inventoryId)]);
      setAddPick(null);
      setAddPrice('');
      setAddQty('');
      setMedSearch('');
      setMedResults([]);
    } catch (error) {
      Alert.alert('Could not add', error instanceof Error ? error.message : 'Medicine could not be added to inventory.');
    }
  }

  async function submitBatch(item: B2BInventoryItem) {
    const quantity = Number(batchQty);
    if (batchNo.trim().length < 1 || !Number.isInteger(quantity) || quantity <= 0 || !batchExpiry.trim()) {
      Alert.alert('Check the batch', 'Batch number, a positive quantity, and an expiry date (YYYY-MM-DD) are required.');
      return;
    }
    try {
      await addWholesellerInventoryBatch(profile.id, item.inventoryId, {
        batchNumber: batchNo.trim(),
        quantity,
        expiryDate: batchExpiry.trim(),
      });
      setBatchFor(null);
      setBatchNo('');
      setBatchQty('');
      setBatchExpiry('');
      Alert.alert('Batch added', `${quantity} units logged against ${item.brandName}.`);
    } catch (error) {
      Alert.alert('Batch failed', error instanceof Error ? error.message : 'Batch could not be added.');
    }
  }

  function addToCart(medicine: B2BMedicine) {
    setCart((current) => {
      const line = current[medicine.id];
      const unitPrice = Number((medicine.mrp * 0.74).toFixed(2));
      return {
        ...current,
        [medicine.id]: {
          medicineId: medicine.id,
          brandName: medicine.brandName,
          unitPrice,
          quantity: (line?.quantity ?? 0) + 10,
        },
      };
    });
  }

  function setCartQty(medicineId: string, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[medicineId];
        return next;
      }
      return { ...current, [medicineId]: { ...current[medicineId], quantity } };
    });
  }

  async function placeCompanyOrder() {
    if (!selectedCompany || cartLines.length === 0) return;
    try {
      const payload = await createWholesellerCompanyOrder(
        profile.id,
        selectedCompany.id,
        cartLines.map((line) => ({ medicineId: line.medicineId, quantity: line.quantity })),
        payMethod,
      );
      setCompanyOrders((current) => [payload.order, ...current.filter((item) => item.id !== payload.order.id)]);
      setCart({});
      Alert.alert('Purchase order placed', `${cartLines.length} line item${cartLines.length === 1 ? '' : 's'} sent to ${selectedCompany.legalName}.`);
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Company purchase order could not be placed.');
    }
  }

  async function submitScheme() {
    const value = Number(schemeValue);
    const days = Number(schemeDays);
    if (schemeTitle.trim().length < 3 || !(value >= 0) || !(days > 0)) {
      Alert.alert('Check the scheme', 'A title (3+ characters), a non-negative discount, and a positive duration are required.');
      return;
    }
    try {
      const payload = await createWholesellerScheme(profile.id, {
        title: schemeTitle.trim(),
        description: schemeDesc.trim() || undefined,
        status: 'ACTIVE',
        discountType: schemeType,
        discountValue: value,
        startsAt: new Date().toISOString(),
        endsAt: daysFromNow(days),
        retailerId: schemeRetailerId ?? undefined,
      });
      setSchemes((current) => [payload.scheme, ...current]);
      setSchemeTitle('');
      setSchemeDesc('');
      setSchemeValue('');
      setSchemeRetailerId(null);
      Alert.alert('Scheme published', `${payload.scheme.title} is now active.`);
    } catch (error) {
      Alert.alert('Scheme failed', error instanceof Error ? error.message : 'Scheme could not be created.');
    }
  }

  // ----- renderers ---------------------------------------------------------

  function renderOrderCard(order: B2BOrder, options: { expandable?: boolean } = {}) {
    const canDecide = order.status === 'PENDING_APPROVAL';
    const advanceTo = nextB2BStatus(order);
    const expanded = options.expandable && expandedOrderId === order.id;

    return (
      <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <InteractivePressable
          onPress={options.expandable ? () => setExpandedOrderId(expanded ? null : order.id) : undefined}
          style={styles.cardHead}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>#{order.id.slice(-10).toUpperCase()}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {order.retailer?.businessName ?? order.company?.legalName ?? 'Partner'} · {normalizeStatus(order.status)}
            </Text>
          </View>
          <Text style={[styles.total, { color: theme.text }]}>{formatCurrency(order.totalAmount)}</Text>
        </InteractivePressable>

        {(!options.expandable || expanded) && (
          <View style={styles.cardBody}>
            {order.items.map((item) => (
              <View key={`${order.id}-${item.medicineId}`} style={styles.lineRow}>
                <Text style={[styles.meta, { color: theme.subtext, flex: 1 }]} numberOfLines={1}>
                  {item.brandName} × {item.quantity}
                </Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(item.lineTotal)}</Text>
              </View>
            ))}

            {order.rejectionReason ? (
              <Text style={[styles.meta, { color: theme.danger }]}>Rejected: {order.rejectionReason}</Text>
            ) : null}

            {expanded && order.trackingEvents && order.trackingEvents.length > 0 ? (
              <View style={styles.timeline}>
                {order.trackingEvents.map((event, index) => (
                  <View key={event.id ?? index} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.meta, { color: theme.text, fontWeight: '700' }]}>{event.statusLabel}</Text>
                      {event.notes ? <Text style={[styles.meta, { color: theme.subtext }]}>{event.notes}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {canDecide ? (
              <View style={{ gap: 8 }}>
                <View style={styles.actionRow}>
                  <ActionButton mode={mode} label="Approve" icon="check" onPress={() => void approveOrder(order)} />
                </View>
                <TextInput
                  value={expandedOrderId === order.id ? rejectReason : ''}
                  onFocus={() => setExpandedOrderId(order.id)}
                  onChangeText={setRejectReason}
                  placeholder="Reason to reject (5+ characters)"
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                />
                <View style={styles.actionRow}>
                  <ActionButton mode={mode} label="Reject" icon="x" danger onPress={() => void rejectOrder(order)} />
                </View>
              </View>
            ) : null}

            {advanceTo ? (
              <ActionButton
                mode={mode}
                label={`Mark ${normalizeStatus(advanceTo)}`}
                icon="truck"
                onPress={() => void advanceOrder(order)}
              />
            ) : null}
          </View>
        )}
      </View>
    );
  }

  function renderDashboard() {
    const m = summary.metrics;
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Distribution dashboard" description="Retailer demand, stock risk, and upstream buying at a glance." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Pending retailer orders" value={m.pendingRetailerOrders} icon="clock" />
          <Kpi mode={mode} label="Delivered" value={m.deliveredRetailerOrders} icon="check-circle" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
          <Kpi mode={mode} label="Active schemes" value={m.activeSchemes} icon="tag" />
          <Kpi mode={mode} label="Low stock lines" value={m.lowStockCount} icon="alert-triangle" />
          <Kpi mode={mode} label="Total orders" value={m.totalRetailerOrders} icon="layers" />
        </View>

        <SectionHeader mode={mode} title="Stock alerts" description="Lines at or below their reorder level." />
        {stockAlerts.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No lines are below their reorder level.</Text>
        ) : (
          stockAlerts.slice(0, 6).map((alert) => (
            <View key={alert.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{alert.brandName}</Text>
              <Text style={[styles.meta, { color: theme.danger }]}>
                {alert.availableQuantity} available · reorder at {alert.reorderLevel ?? 0}
              </Text>
            </View>
          ))
        )}

        <SectionHeader mode={mode} title="Latest retailer orders" description="Newest pharmacy restock requests." action="View all" onAction={() => setTab('retailerOrders')} />
        {retailerOrders.slice(0, 4).map((order) => renderOrderCard(order))}
      </ScrollView>
    );
  }

  function renderRetailerOrders() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Retailer orders" description="Approve, reject with a reason, dispatch, and track pharmacy restock requests." />
        <View style={styles.chipRow}>
          {ORDER_FILTERS.map((filter) => (
            <Chip
              key={filter.key}
              mode={mode}
              label={filter.label}
              active={orderFilter === filter.key}
              onPress={() => setOrderFilter(filter.key)}
            />
          ))}
        </View>
        {filteredOrders.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No orders match this filter.</Text>
        ) : (
          filteredOrders.map((order) => renderOrderCard(order, { expandable: true }))
        )}
      </ScrollView>
    );
  }

  function renderInventory() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Inventory" description="Price, stock, reorder levels, and batch entries for your warehouse." />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Add a medicine</Text>
          <TextInput
            value={medSearch}
            onChangeText={setMedSearch}
            placeholder="Search the catalogue by brand or salt"
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          />
          {addPick ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.meta, { color: theme.text }]}>{addPick.brandName} · MRP {formatCurrency(addPick.mrp)}</Text>
              <View style={styles.fieldRow}>
                <Field mode={mode} label="Sale price" value={addPrice} onChangeText={setAddPrice} keyboardType="numeric" />
                <Field mode={mode} label="Opening stock" value={addQty} onChangeText={setAddQty} keyboardType="numeric" />
              </View>
              <View style={styles.actionRow}>
                <ActionButton mode={mode} label="Add to inventory" icon="plus" onPress={() => void addInventoryItem()} />
                <ActionButton mode={mode} label="Cancel" icon="x" danger onPress={() => setAddPick(null)} />
              </View>
            </View>
          ) : (
            medResults.map((result) => (
              <InteractivePressable
                key={result.id}
                onPress={() => {
                  setAddPick({ id: result.id, brandName: result.brandName, mrp: result.mrp });
                  setAddPrice(String(Number((result.mrp * 0.9).toFixed(2))));
                  setAddQty('100');
                }}
                style={[styles.resultRow, { borderColor: theme.border }]}
              >
                <Text style={[styles.meta, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {result.brandName} · {result.genericName}
                </Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(result.mrp)}</Text>
              </InteractivePressable>
            ))
          )}
        </View>

        <View style={styles.chipRow}>
          {(['all', 'low', 'out'] as InventoryFilter[]).map((key) => (
            <Chip key={key} mode={mode} label={key === 'all' ? 'All' : key === 'low' ? 'Low stock' : 'Out of stock'} active={inventoryFilter === key} onPress={() => setInventoryFilter(key)} />
          ))}
        </View>

        {visibleInventory.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No inventory lines match this filter.</Text>
        ) : (
          visibleInventory.map((item) => {
            const draft = draftFor(item);
            const dirty = isDirty(item);
            return (
              <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>
                  {item.genericName} · {item.dosage} · {item.packSize}
                  {item.medicineType ? ` · ${item.medicineType === 'PRESCRIPTION' ? 'Rx' : 'OTC'}` : ''}
                </Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>
                  {item.availableQuantity} available ({item.reservedQuantity} reserved)
                </Text>
                <View style={styles.fieldRow}>
                  <Field mode={mode} label="Price" value={draft.salePrice} onChangeText={(v) => setDraft(item.inventoryId, { salePrice: v })} keyboardType="numeric" />
                  <Field mode={mode} label="Stock" value={draft.stockQuantity} onChangeText={(v) => setDraft(item.inventoryId, { stockQuantity: v })} keyboardType="numeric" />
                  <Field mode={mode} label="Reorder" value={draft.reorderLevel} onChangeText={(v) => setDraft(item.inventoryId, { reorderLevel: v })} keyboardType="numeric" />
                </View>
                <View style={styles.actionRow}>
                  {dirty ? <ActionButton mode={mode} label="Save" icon="save" onPress={() => void saveInventoryRow(item)} /> : null}
                  <ActionButton
                    mode={mode}
                    label={batchFor === item.inventoryId ? 'Close batch' : 'Add batch'}
                    icon="box"
                    onPress={() => setBatchFor(batchFor === item.inventoryId ? null : item.inventoryId)}
                  />
                </View>
                {batchFor === item.inventoryId ? (
                  <View style={{ gap: 8 }}>
                    <View style={styles.fieldRow}>
                      <Field mode={mode} label="Batch no." value={batchNo} onChangeText={setBatchNo} />
                      <Field mode={mode} label="Quantity" value={batchQty} onChangeText={setBatchQty} keyboardType="numeric" />
                    </View>
                    <Field mode={mode} label="Expiry (YYYY-MM-DD)" value={batchExpiry} onChangeText={setBatchExpiry} />
                    <View style={styles.actionRow}>
                      <ActionButton mode={mode} label="Log batch" icon="plus" onPress={() => void submitBatch(item)} />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  }

  function renderCompanyBuy() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Company buying" description="Build a bulk purchase order against a company catalogue." />
        <View style={styles.chipRow}>
          {companies.map((company) => (
            <Chip
              key={company.id}
              mode={mode}
              label={company.legalName}
              active={selectedCompanyId === company.id}
              onPress={() => setSelectedCompanyId(company.id)}
            />
          ))}
        </View>

        {medicines.map((medicine) => {
          const line = cart[medicine.id];
          return (
            <View key={medicine.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {medicine.genericName} · {medicine.dosage} · {medicine.packSize}
              </Text>
              <Text style={[styles.meta, { color: theme.text }]}>Buy price ≈ {formatCurrency(medicine.mrp * 0.74)} · MRP {formatCurrency(medicine.mrp)}</Text>
              {line ? (
                <View style={styles.stepperRow}>
                  <ActionButton mode={mode} label="-10" icon="minus" onPress={() => setCartQty(medicine.id, line.quantity - 10)} />
                  <Text style={[styles.total, { color: theme.text }]}>{line.quantity}</Text>
                  <ActionButton mode={mode} label="+10" icon="plus" onPress={() => setCartQty(medicine.id, line.quantity + 10)} />
                </View>
              ) : (
                <ActionButton mode={mode} label="Add to PO" icon="shopping-bag" onPress={() => addToCart(medicine)} />
              )}
            </View>
          );
        })}

        {cartLines.length > 0 ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Purchase order draft</Text>
            {cartLines.map((line) => (
              <View key={line.medicineId} style={styles.lineRow}>
                <Text style={[styles.meta, { color: theme.subtext, flex: 1 }]} numberOfLines={1}>{line.brandName} × {line.quantity}</Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(line.unitPrice * line.quantity)}</Text>
              </View>
            ))}
            <Text style={[styles.total, { color: theme.text }]}>Total {formatCurrency(cartTotal)}</Text>
            <View style={styles.chipRow}>
              {PAYMENT_METHODS.map((method) => (
                <Chip key={method} mode={mode} label={method.replace(/_/g, ' ')} active={payMethod === method} onPress={() => setPayMethod(method)} />
              ))}
            </View>
            <View style={styles.actionRow}>
              <ActionButton mode={mode} label={`Place PO with ${selectedCompany?.legalName ?? 'company'}`} icon="send" onPress={() => void placeCompanyOrder()} />
              <ActionButton mode={mode} label="Clear" icon="trash-2" danger onPress={() => setCart({})} />
            </View>
          </View>
        ) : null}

        <SectionHeader mode={mode} title="Company purchase orders" description="Bulk orders sent upstream." />
        {companyOrders.map((order) => renderOrderCard(order))}
      </ScrollView>
    );
  }

  function renderSchemes() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Schemes" description="Discount schemes offered to all retailers or one targeted pharmacy." />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>New scheme</Text>
          <Field mode={mode} label="Title" value={schemeTitle} onChangeText={setSchemeTitle} />
          <Field mode={mode} label="Description" value={schemeDesc} onChangeText={setSchemeDesc} />
          <View style={styles.chipRow}>
            <Chip mode={mode} label="Percent" active={schemeType === 'PERCENT'} onPress={() => setSchemeType('PERCENT')} />
            <Chip mode={mode} label="Flat" active={schemeType === 'FLAT'} onPress={() => setSchemeType('FLAT')} />
          </View>
          <View style={styles.fieldRow}>
            <Field mode={mode} label={schemeType === 'PERCENT' ? 'Discount %' : 'Discount ₹'} value={schemeValue} onChangeText={setSchemeValue} keyboardType="numeric" />
            <Field mode={mode} label="Runs for (days)" value={schemeDays} onChangeText={setSchemeDays} keyboardType="numeric" />
          </View>
          <Text style={[styles.meta, { color: theme.subtext }]}>Target (optional)</Text>
          <View style={styles.chipRow}>
            <Chip mode={mode} label="All retailers" active={schemeRetailerId === null} onPress={() => setSchemeRetailerId(null)} />
            {retailers.slice(0, 8).map((retailer) => (
              <Chip
                key={retailer.id}
                mode={mode}
                label={retailer.businessName}
                active={schemeRetailerId === retailer.id}
                onPress={() => setSchemeRetailerId(retailer.id)}
              />
            ))}
          </View>
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label="Publish scheme" icon="tag" onPress={() => void submitScheme()} />
          </View>
        </View>

        {schemes.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No schemes yet.</Text>
        ) : (
          schemes.map((scheme) => (
            <View key={scheme.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{scheme.title}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {scheme.status} · {scheme.discountType ?? '—'} {scheme.discountValue ?? ''} · {scheme.retailerName ?? 'All retailers'}
              </Text>
              {scheme.description ? <Text style={[styles.meta, { color: theme.subtext }]}>{scheme.description}</Text> : null}
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {new Date(scheme.startsAt).toLocaleDateString()} – {new Date(scheme.endsAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderAnalytics() {
    const m = summary.metrics;
    const byStatus = retailerOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
    const maxCount = Math.max(1, ...Object.values(byStatus));

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Analytics" description="Order workload, revenue, and stock risk." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Total orders" value={m.totalRetailerOrders} icon="layers" />
          <Kpi mode={mode} label="Pending" value={m.pendingRetailerOrders} icon="clock" />
          <Kpi mode={mode} label="Delivered" value={m.deliveredRetailerOrders} icon="check-circle" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
        </View>

        <RevenueTrendChart mode={mode} theme={theme} data={summary.revenueTrend} currencyFormatter={formatCurrency} />
        <TopItemsChart
          mode={mode}
          theme={theme}
          data={summary.topItems}
          currencyFormatter={formatCurrency}
          title="Top selling medicines"
          emptyLabel="No paid retailer orders yet."
        />

        <SectionHeader mode={mode} title="Retailer orders by status" />
        {Object.keys(byStatus).length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No orders yet.</Text>
        ) : (
          Object.entries(byStatus).map(([status, count]) => (
            <View key={status} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: theme.subtext }]}>{normalizeStatus(status)}</Text>
              <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
                <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(count / maxCount) * 100}%` }]} />
              </View>
              <Text style={[styles.barValue, { color: theme.text }]}>{count}</Text>
            </View>
          ))
        )}

        <SectionHeader mode={mode} title="Stock alerts" />
        {stockAlerts.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No lines below reorder level.</Text>
        ) : (
          stockAlerts.map((alert) => (
            <View key={alert.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{alert.brandName}</Text>
              <Text style={[styles.meta, { color: theme.danger }]}>{alert.availableQuantity} available · reorder at {alert.reorderLevel ?? 0}</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderBody() {
    switch (tab) {
      case 'dashboard':
        return renderDashboard();
      case 'retailerOrders':
        return renderRetailerOrders();
      case 'inventory':
        return renderInventory();
      case 'companyBuy':
        return renderCompanyBuy();
      case 'schemes':
        return renderSchemes();
      case 'analytics':
        return renderAnalytics();
    }
  }

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(mode)} />
      <View style={[styles.header, { backgroundColor: theme.surfaceAlt, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <BrandLogo mode={mode} size="compact" align="start" />
          <View style={styles.headerActions}>
            <InteractivePressable onPress={() => void loadWorkspace()} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
              <Feather name="refresh-cw" size={18} color={theme.primary} />
            </InteractivePressable>
            <InteractivePressable
              onPress={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
            >
              <Feather name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={theme.primary} />
            </InteractivePressable>
            <InteractivePressable onPress={onSignOut} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
              <Feather name="log-out" size={18} color={theme.primary} />
            </InteractivePressable>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{profile.businessName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>Signed in as {session.user.fullName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>{profile.serviceArea}</Text>
        {helper || loading ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>{loading ? 'Syncing wholeseller workspace…' : helper}</Text>
        ) : null}
      </View>

      {renderBody()}

      <View style={[styles.tabBar, { backgroundColor: theme.surfaceAlt, borderTopColor: theme.border }]}>
        <Tab mode={mode} active={tab === 'dashboard'} label="Home" icon="grid" onPress={() => setTab('dashboard')} />
        <Tab mode={mode} active={tab === 'retailerOrders'} label="Orders" icon="package" onPress={() => setTab('retailerOrders')} />
        <Tab mode={mode} active={tab === 'inventory'} label="Stock" icon="database" onPress={() => setTab('inventory')} />
        <Tab mode={mode} active={tab === 'companyBuy'} label="Buy" icon="shopping-cart" onPress={() => setTab('companyBuy')} />
        <Tab mode={mode} active={tab === 'schemes'} label="Schemes" icon="tag" onPress={() => setTab('schemes')} />
        <Tab mode={mode} active={tab === 'analytics'} label="Stats" icon="bar-chart-2" onPress={() => setTab('analytics')} />
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  icon,
  mode,
  onPress,
  danger = false,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  mode: ThemeMode;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = themes[mode];
  const backgroundColor = danger ? theme.danger : theme.primary;
  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor, borderColor: backgroundColor }]}
      pressedStyle={{ opacity: 0.85 }}
    >
      <Feather name={icon} size={15} color={theme.buttonText} />
      <Text style={[styles.actionLabel, { color: theme.buttonText }]}>{label}</Text>
    </InteractivePressable>
  );
}

function Field({
  mode,
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  mode: ThemeMode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  const theme = themes[mode];
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.subtext }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        placeholderTextColor={theme.subtext}
      />
    </View>
  );
}

function Kpi({ mode, label, value, icon }: { mode: ThemeMode; label: string; value: string | number; icon: keyof typeof Feather.glyphMap }) {
  const theme = themes[mode];
  return (
    <View style={[styles.kpi, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Feather name={icon} size={18} color={theme.primary} />
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.meta, { color: theme.subtext }]}>{label}</Text>
    </View>
  );
}

function Chip({ mode, label, active, onPress }: { mode: ThemeMode; label: string; active: boolean; onPress: () => void }) {
  const theme = themes[mode];
  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.primarySoft : theme.surface, borderColor: active ? theme.primary : theme.border }]}
    >
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.text }]}>{label}</Text>
    </InteractivePressable>
  );
}

function Tab({ mode, active, label, icon, onPress }: { mode: ThemeMode; active: boolean; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const theme = themes[mode];
  return (
    <InteractivePressable onPress={onPress} style={[styles.tab, { backgroundColor: active ? theme.primarySoft : 'transparent' }]}>
      <Feather name={icon} size={17} color={active ? theme.primary : theme.subtext} />
      <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.subtext }]}>{label}</Text>
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { padding: 14, borderBottomWidth: 1, gap: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 14, paddingBottom: 120, gap: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { minWidth: 150, flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, gap: 7 },
  kpiValue: { fontSize: 21, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardBody: { gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18 },
  total: { fontSize: 15, fontWeight: '900' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13 },
  field: { flex: 1, minWidth: 96, gap: 4 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingVertical: 9 },
  timeline: { gap: 8, marginTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 11, width: 110 },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 999 },
  barValue: { fontSize: 12, fontWeight: '900', width: 32, textAlign: 'right' },
  actionButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionLabel: { fontSize: 12, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12, fontWeight: '800' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 2, padding: 8, borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
});
