import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import {
  B2BOrder,
  CompanyProfile,
  CompanySummary,
  Offer,
  WholesellerListItem,
  createCompanyOffer,
  decideCompanyWholesellerOrder,
  fetchCompanyOffers,
  fetchCompanySummary,
  fetchCompanyWholesellerOrders,
  fetchWholesellers,
  loginDemoCompany,
  updateCompanyWholesellerOrderStatus,
} from '../services/b2b';
import { statusBarStyle, themes, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/format';

type CompanyTab = 'dashboard' | 'orders' | 'offers';

const fallbackProfile: CompanyProfile = {
  id: 'co-demo',
  legalName: 'Cipla Wellness Manufacturing',
  contactEmail: 'company@pharmaconnect.app',
  contactPhone: '9000000004',
};

const fallbackSummary: CompanySummary = {
  company: {
    id: fallbackProfile.id,
    legalName: fallbackProfile.legalName,
  },
  metrics: {
    medicineCount: 0,
    activeOffers: 0,
    pendingWholesellerOrders: 0,
    deliveredWholesellerOrders: 0,
    revenue: 0,
  },
};

function normalizeStatus(status: string) {
  return status.replace('PENDING_APPROVAL', 'Pending').replace(/_/g, ' ');
}

function nextOrderStatus(order: B2BOrder): 'DISPATCHED' | 'DELIVERED' | null {
  if (order.status === 'APPROVED' || order.status === 'PAID') {
    return 'DISPATCHED';
  }

  if (order.status === 'DISPATCHED') {
    return 'DELIVERED';
  }

  return null;
}

function ActionButton({
  mode,
  label,
  icon,
  onPress,
  danger = false,
}: {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Feather.glyphMap;
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

export function CompanyModuleApp() {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [tab, setTab] = useState<CompanyTab>('dashboard');
  const [profile, setProfile] = useState<CompanyProfile>(fallbackProfile);
  const [summary, setSummary] = useState<CompanySummary>(fallbackSummary);
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [wholesellers, setWholesellers] = useState<WholesellerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [helper, setHelper] = useState('Signing in as the seeded demo company.');
  const theme = themes[mode];

  async function loadWorkspace() {
    setLoading(true);

    try {
      const session = await loginDemoCompany();
      const liveProfile = session.user.companyProfile;
      if (!liveProfile) {
        throw new Error('Demo company profile is missing.');
      }
      setProfile(liveProfile);

      const [summaryPayload, ordersPayload, offersPayload, wholesellersPayload] = await Promise.all([
        fetchCompanySummary(liveProfile.id),
        fetchCompanyWholesellerOrders(liveProfile.id),
        fetchCompanyOffers(liveProfile.id),
        fetchWholesellers(),
      ]);

      setSummary(summaryPayload);
      setOrders(ordersPayload.orders);
      setOffers(offersPayload.offers);
      setWholesellers(wholesellersPayload.wholesellers);
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

  async function approveOrder(order: B2BOrder) {
    try {
      const payload = await decideCompanyWholesellerOrder(profile.id, order.id, 'APPROVE');
      setOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Approval failed', error instanceof Error ? error.message : 'Order could not be approved.');
    }
  }

  async function rejectOrder(order: B2BOrder) {
    try {
      const payload = await decideCompanyWholesellerOrder(profile.id, order.id, 'REJECT');
      setOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Rejection failed', error instanceof Error ? error.message : 'Order could not be rejected.');
    }
  }

  async function moveOrder(order: B2BOrder) {
    const nextStatus = nextOrderStatus(order);

    if (!nextStatus) {
      return;
    }

    try {
      const payload = await updateCompanyWholesellerOrderStatus(profile.id, order.id, nextStatus);
      setOrders((current) => [payload.order, ...current.filter((item) => item.id !== order.id)]);
    } catch (error) {
      Alert.alert('Status failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    }
  }

  async function addOffer() {
    const wholesellerId = wholesellers[0]?.id;

    if (!wholesellerId) {
      Alert.alert('No wholeseller found', 'Seed or create a wholeseller before creating an offer.');
      return;
    }

    try {
      const payload = await createCompanyOffer(profile.id, wholesellerId);
      setOffers((current) => [payload.offer, ...current.filter((offer) => offer.id !== payload.offer.id)]);
      Alert.alert('Offer created', `${payload.offer.title} is now available.`);
    } catch (error) {
      Alert.alert('Offer failed', error instanceof Error ? error.message : 'Offer could not be created.');
    }
  }

  function renderOrder(order: B2BOrder) {
    const canDecide = order.status === 'PENDING_APPROVAL';
    const nextStatus = nextOrderStatus(order);

    return (
      <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{order.id.slice(-10).toUpperCase()}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>
          {order.wholeseller?.businessName ?? 'Wholeseller'} - {normalizeStatus(order.status)}
        </Text>
        {order.items.map((item) => (
          <Text key={`${order.id}-${item.medicineId}`} style={[styles.meta, { color: theme.subtext }]}>
            {item.brandName} x{item.quantity} - {formatCurrency(item.lineTotal)}
          </Text>
        ))}
        <Text style={[styles.total, { color: theme.text }]}>{formatCurrency(order.totalAmount)}</Text>
        {canDecide ? (
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label="Approve" icon="check" onPress={() => void approveOrder(order)} />
            <ActionButton mode={mode} label="Reject" icon="x" danger onPress={() => void rejectOrder(order)} />
          </View>
        ) : null}
        {nextStatus ? (
          <ActionButton mode={mode} label={`Mark ${normalizeStatus(nextStatus)}`} icon="truck" onPress={() => void moveOrder(order)} />
        ) : null}
      </View>
    );
  }

  function renderDashboard() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Company dashboard" description="Catalogue reach, wholesaler orders, and offer activity." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Medicines" value={summary.metrics.medicineCount} icon="archive" />
          <Kpi mode={mode} label="Pending orders" value={summary.metrics.pendingWholesellerOrders} icon="clock" />
          <Kpi mode={mode} label="Active offers" value={summary.metrics.activeOffers} icon="tag" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(summary.metrics.revenue)} icon="trending-up" />
        </View>
        <SectionHeader mode={mode} title="Newest wholeseller orders" description="Bulk orders waiting on company fulfilment." />
        {orders.slice(0, 4).map(renderOrder)}
      </ScrollView>
    );
  }

  function renderOffers() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Offers" description="Targeted company offers sent to wholesalers." />
        <ActionButton mode={mode} label="Create demo offer" icon="plus" onPress={() => void addOffer()} />
        {offers.map((offer) => (
          <View key={offer.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{offer.title}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {offer.wholesellerName} - {offer.status} - {offer.discountValue ?? 0} {offer.discountType ?? 'DISCOUNT'}
            </Text>
            {offer.description ? <Text style={[styles.meta, { color: theme.subtext }]}>{offer.description}</Text> : null}
          </View>
        ))}
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
        <Text style={[styles.title, { color: theme.text }]}>{profile.legalName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>{profile.contactEmail ?? 'Company supply desk'}</Text>
        {helper || loading ? <Text style={[styles.meta, { color: theme.subtext }]}>{loading ? 'Syncing company workspace.' : helper}</Text> : null}
      </View>
      {tab === 'dashboard' ? renderDashboard() : tab === 'orders' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <SectionHeader mode={mode} title="Wholeseller orders" description="Approve, reject, dispatch, and close upstream orders." />
          {orders.map(renderOrder)}
        </ScrollView>
      ) : renderOffers()}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceAlt, borderTopColor: theme.border }]}>
        <Tab mode={mode} active={tab === 'dashboard'} label="Dashboard" icon="grid" onPress={() => setTab('dashboard')} />
        <Tab mode={mode} active={tab === 'orders'} label="Orders" icon="package" onPress={() => setTab('orders')} />
        <Tab mode={mode} active={tab === 'offers'} label="Offers" icon="tag" onPress={() => setTab('offers')} />
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
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 4, padding: 8, borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
});
