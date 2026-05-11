import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import {
  B2BMedicine,
  B2BOrder,
  CompanyListItem,
  WholesellerProfile,
  WholesellerSummary,
  createWholesellerCompanyOrder,
  decideWholesellerRetailerOrder,
  fetchCompanies,
  fetchCompanyMedicines,
  fetchWholesellerCompanyOrders,
  fetchWholesellerRetailerOrders,
  fetchWholesellerSummary,
  loginDemoWholeseller,
  updateWholesellerRetailerOrderStatus,
} from '../services/b2b';
import { statusBarStyle, themes, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type WholesellerTab = 'dashboard' | 'retailerOrders' | 'companyBuy';

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
};

function normalizeStatus(status: string) {
  return status.replace('PENDING_APPROVAL', 'Pending').replace(/_/g, ' ');
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
  const backgroundColor = danger ? '#ef4444' : theme.primary;

  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor, borderColor: backgroundColor }]}
      pressedStyle={{ backgroundColor: theme.elevated }}
    >
      <Feather name={icon} size={15} color={theme.buttonText} />
      <Text style={[styles.actionLabel, { color: theme.buttonText }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function WholesellerModuleApp() {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [tab, setTab] = useState<WholesellerTab>('dashboard');
  const [profile, setProfile] = useState<WholesellerProfile>(fallbackProfile);
  const [summary, setSummary] = useState<WholesellerSummary>(fallbackSummary);
  const [retailerOrders, setRetailerOrders] = useState<B2BOrder[]>([]);
  const [companyOrders, setCompanyOrders] = useState<B2BOrder[]>([]);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [medicines, setMedicines] = useState<B2BMedicine[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [helper, setHelper] = useState('Signing in as the seeded demo wholeseller.');
  const theme = themes[mode];

  async function loadWorkspace() {
    setLoading(true);

    try {
      const session = await loginDemoWholeseller();
      const liveProfile = session.user.wholesellerProfile;
      if (!liveProfile) {
        throw new Error('Demo wholeseller profile is missing.');
      }
      setProfile(liveProfile);

      const [summaryPayload, retailerOrdersPayload, companyOrdersPayload, companiesPayload] = await Promise.all([
        fetchWholesellerSummary(liveProfile.id),
        fetchWholesellerRetailerOrders(liveProfile.id),
        fetchWholesellerCompanyOrders(liveProfile.id),
        fetchCompanies(),
      ]);

      setSummary(summaryPayload);
      setRetailerOrders(retailerOrdersPayload.orders);
      setCompanyOrders(companyOrdersPayload.orders);
      setCompanies(companiesPayload.companies);
      setSelectedCompanyId(companiesPayload.companies[0]?.id ?? null);
      setHelper('');
    } catch (error) {
      setHelper(error instanceof Error ? `Showing module shell until backend is reachable: ${error.message}` : 'Showing module shell.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
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

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null,
    [companies, selectedCompanyId],
  );

  async function approveRetailerOrder(order: B2BOrder) {
    try {
      const payload = await decideWholesellerRetailerOrder(profile.id, order.id, 'APPROVE');
      setRetailerOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Approval failed', error instanceof Error ? error.message : 'Order could not be approved.');
    }
  }

  async function rejectRetailerOrder(order: B2BOrder) {
    try {
      const payload = await decideWholesellerRetailerOrder(profile.id, order.id, 'REJECT');
      setRetailerOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Rejection failed', error instanceof Error ? error.message : 'Order could not be rejected.');
    }
  }

  async function moveRetailerOrder(order: B2BOrder) {
    const nextStatus = nextB2BStatus(order);

    if (!nextStatus) {
      return;
    }

    try {
      const payload = await updateWholesellerRetailerOrderStatus(profile.id, order.id, nextStatus);
      setRetailerOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Status failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    }
  }

  async function placeCompanyOrder(medicine: B2BMedicine) {
    if (!selectedCompany) {
      return;
    }

    try {
      const payload = await createWholesellerCompanyOrder(profile.id, selectedCompany.id, medicine.id);
      setCompanyOrders((current) => [payload.order, ...current.filter((item) => item.id !== payload.order.id)]);
      Alert.alert('Company order placed', `${medicine.brandName} was requested from ${selectedCompany.legalName}.`);
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Company order could not be placed.');
    }
  }

  function renderOrder(order: B2BOrder) {
    const canDecide = order.status === 'PENDING_APPROVAL';
    const nextStatus = nextB2BStatus(order);

    return (
      <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{order.id.slice(-10).toUpperCase()}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>
          {order.retailer?.businessName ?? order.company?.legalName ?? 'Partner'} - {normalizeStatus(order.status)}
        </Text>
        {order.items.map((item) => (
          <Text key={`${order.id}-${item.medicineId}`} style={[styles.meta, { color: theme.subtext }]}>
            {item.brandName} x{item.quantity} - {formatCurrency(item.lineTotal)}
          </Text>
        ))}
        <Text style={[styles.total, { color: theme.text }]}>{formatCurrency(order.totalAmount)}</Text>
        {canDecide ? (
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label="Approve" icon="check" onPress={() => void approveRetailerOrder(order)} />
            <ActionButton mode={mode} label="Reject" icon="x" danger onPress={() => void rejectRetailerOrder(order)} />
          </View>
        ) : null}
        {nextStatus ? (
          <ActionButton mode={mode} label={`Mark ${normalizeStatus(nextStatus)}`} icon="truck" onPress={() => void moveRetailerOrder(order)} />
        ) : null}
      </View>
    );
  }

  function renderDashboard() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Wholeseller dashboard" description="Retailer orders, stock risk, and company buying." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Pending retailer orders" value={summary.metrics.pendingRetailerOrders} icon="clock" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(summary.metrics.revenue)} icon="trending-up" />
          <Kpi mode={mode} label="Active schemes" value={summary.metrics.activeSchemes} icon="tag" />
          <Kpi mode={mode} label="Low stock" value={summary.metrics.lowStockCount} icon="alert-triangle" />
        </View>
        <SectionHeader mode={mode} title="Latest retailer orders" description="Newest pharmacy restock requests." />
        {retailerOrders.slice(0, 4).map(renderOrder)}
      </ScrollView>
    );
  }

  function renderCompanyBuy() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Company buying" description="Order bulk stock directly from company catalogues." />
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
        {medicines.map((medicine) => (
          <View key={medicine.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {medicine.genericName} - {medicine.dosage} - {medicine.packSize}
            </Text>
            <Text style={[styles.total, { color: theme.text }]}>{formatCurrency(medicine.mrp)}</Text>
            <ActionButton mode={mode} label="Order 50" icon="shopping-bag" onPress={() => void placeCompanyOrder(medicine)} />
          </View>
        ))}
        <SectionHeader mode={mode} title="Company purchase orders" description="Bulk orders sent upstream." />
        {companyOrders.map(renderOrder)}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(mode)} />
      <View style={[styles.header, { backgroundColor: theme.surfaceAlt, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <BrandLogo mode={mode} size="compact" align="start" />
          <InteractivePressable onPress={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
            <Feather name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={theme.primary} />
          </InteractivePressable>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{profile.businessName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>{profile.serviceArea}</Text>
        {helper || loading ? <Text style={[styles.meta, { color: theme.subtext }]}>{loading ? 'Syncing wholeseller workspace.' : helper}</Text> : null}
      </View>
      {tab === 'dashboard' ? renderDashboard() : tab === 'retailerOrders' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <SectionHeader mode={mode} title="Retailer orders" description="Approve, reject, dispatch, and track pharmacy restock requests." />
          {retailerOrders.map(renderOrder)}
        </ScrollView>
      ) : renderCompanyBuy()}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceAlt, borderTopColor: theme.border }]}>
        <Tab mode={mode} active={tab === 'dashboard'} label="Dashboard" icon="grid" onPress={() => setTab('dashboard')} />
        <Tab mode={mode} active={tab === 'retailerOrders'} label="Retailers" icon="package" onPress={() => setTab('retailerOrders')} />
        <Tab mode={mode} active={tab === 'companyBuy'} label="Companies" icon="shopping-cart" onPress={() => setTab('companyBuy')} />
      </View>
    </SafeAreaView>
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
    <InteractivePressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? theme.primarySoft : theme.surface, borderColor: active ? theme.primary : theme.border }]}>
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.text }]}>{label}</Text>
    </InteractivePressable>
  );
}

function Tab({ mode, active, label, icon, onPress }: { mode: ThemeMode; active: boolean; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const theme = themes[mode];
  return (
    <InteractivePressable onPress={onPress} style={[styles.tab, { backgroundColor: active ? theme.primarySoft : 'transparent' }]}>
      <Feather name={icon} size={18} color={active ? theme.primary : theme.subtext} />
      <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.subtext }]}>{label}</Text>
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { padding: 14, borderBottomWidth: 1, gap: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 14, paddingBottom: 112, gap: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { minWidth: 150, flex: 1, borderWidth: 1, borderRadius: 8, padding: 14, gap: 7 },
  kpiValue: { fontSize: 21, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18 },
  total: { fontSize: 15, fontWeight: '900' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionLabel: { fontSize: 12, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12, fontWeight: '800' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 4, padding: 8, borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
});
