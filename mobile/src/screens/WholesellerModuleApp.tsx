import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';

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
import { WholesellerAnalyticsTab } from './wholeseller/WholesellerAnalyticsTab';
import { WholesellerCompanyBuyTab } from './wholeseller/WholesellerCompanyBuyTab';
import { WholesellerDashboardTab } from './wholeseller/WholesellerDashboardTab';
import { WholesellerInventoryTab } from './wholeseller/WholesellerInventoryTab';
import { WholesellerRetailerOrdersTab } from './wholeseller/WholesellerRetailerOrdersTab';
import { WholesellerSchemesTab } from './wholeseller/WholesellerSchemesTab';
import {
  daysFromNow,
  matchesFilter,
  nextB2BStatus,
  styles,
  Tab,
  type InventoryDraft,
  type StockAlert,
} from './wholeseller/wholesellerShared';


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


  const orderProps = {
    mode,
    expandedOrderId,
    setExpandedOrderId,
    rejectReason,
    setRejectReason,
    onApprove: (order: B2BOrder) => void approveOrder(order),
    onReject: (order: B2BOrder) => void rejectOrder(order),
    onAdvance: (order: B2BOrder) => void advanceOrder(order),
  };

  function renderBody() {
    switch (tab) {
      case 'dashboard':
        return (
          <WholesellerDashboardTab
            {...orderProps}
            summary={summary}
            stockAlerts={stockAlerts}
            retailerOrders={retailerOrders}
            onViewAll={() => setTab('retailerOrders')}
          />
        );
      case 'retailerOrders':
        return (
          <WholesellerRetailerOrdersTab
            {...orderProps}
            orderFilter={orderFilter}
            setOrderFilter={setOrderFilter}
            filteredOrders={filteredOrders}
          />
        );
      case 'inventory':
        return (
          <WholesellerInventoryTab
            mode={mode}
            medSearch={medSearch}
            setMedSearch={setMedSearch}
            medResults={medResults}
            addPick={addPick}
            setAddPick={setAddPick}
            addPrice={addPrice}
            setAddPrice={setAddPrice}
            addQty={addQty}
            setAddQty={setAddQty}
            inventoryFilter={inventoryFilter}
            setInventoryFilter={setInventoryFilter}
            visibleInventory={visibleInventory}
            draftFor={draftFor}
            setDraft={setDraft}
            isDirty={isDirty}
            batchFor={batchFor}
            setBatchFor={setBatchFor}
            batchNo={batchNo}
            setBatchNo={setBatchNo}
            batchQty={batchQty}
            setBatchQty={setBatchQty}
            batchExpiry={batchExpiry}
            setBatchExpiry={setBatchExpiry}
            onAddInventoryItem={() => void addInventoryItem()}
            onSaveRow={(item) => void saveInventoryRow(item)}
            onSubmitBatch={(item) => void submitBatch(item)}
          />
        );
      case 'companyBuy':
        return (
          <WholesellerCompanyBuyTab
            {...orderProps}
            companies={companies}
            selectedCompany={selectedCompany}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            medicines={medicines}
            cart={cart}
            setCart={setCart}
            cartLines={cartLines}
            cartTotal={cartTotal}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            companyOrders={companyOrders}
            onAddToCart={addToCart}
            onSetCartQty={setCartQty}
            onPlaceOrder={() => void placeCompanyOrder()}
          />
        );
      case 'schemes':
        return (
          <WholesellerSchemesTab
            mode={mode}
            schemeTitle={schemeTitle}
            setSchemeTitle={setSchemeTitle}
            schemeDesc={schemeDesc}
            setSchemeDesc={setSchemeDesc}
            schemeType={schemeType}
            setSchemeType={setSchemeType}
            schemeValue={schemeValue}
            setSchemeValue={setSchemeValue}
            schemeDays={schemeDays}
            setSchemeDays={setSchemeDays}
            schemeRetailerId={schemeRetailerId}
            setSchemeRetailerId={setSchemeRetailerId}
            retailers={retailers}
            schemes={schemes}
            onSubmitScheme={() => void submitScheme()}
          />
        );
      case 'analytics':
        return (
          <WholesellerAnalyticsTab
            mode={mode}
            summary={summary}
            retailerOrders={retailerOrders}
            stockAlerts={stockAlerts}
          />
        );
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
