import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RevenueTrendChart, TopItemsChart } from '../components/AnalyticsCharts';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import {
  addCompanyMedicine,
  createCompanyOffer,
  decideCompanyWholesellerOrder,
  fetchCompanyMedicines,
  fetchCompanyOffers,
  fetchCompanySummary,
  fetchCompanyWholesellerOrders,
  fetchWholesellers,
  updateCompanyMedicine,
  updateCompanyWholesellerOrderStatus,
} from '../services/b2b';
import type { AuthSession } from '../services/session';
import { statusBarStyle, themes, type ThemeMode } from '../theme/theme';
import { formatCurrency } from '../utils/format';
import type {
  B2BMedicine,
  B2BOrder,
  CompanyOrderFilter,
  CompanyProfile,
  CompanySummary,
  CompanyTab,
  Offer,
  WholesellerListItem,
} from './company/companyTypes';

const fallbackProfile: CompanyProfile = {
  id: 'co-demo',
  legalName: 'Cipla Wellness Manufacturing',
  contactEmail: 'company@pharmaconnect.app',
  contactPhone: '9000000004',
};

const fallbackSummary: CompanySummary = {
  company: { id: fallbackProfile.id, legalName: fallbackProfile.legalName },
  metrics: {
    medicineCount: 0,
    activeOffers: 0,
    pendingWholesellerOrders: 0,
    deliveredWholesellerOrders: 0,
    revenue: 0,
  },
  revenueTrend: [],
  topItems: [],
};

const ORDER_FILTERS: Array<{ key: CompanyOrderFilter; label: string }> = [
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

function nextOrderStatus(order: B2BOrder): 'DISPATCHED' | 'DELIVERED' | null {
  if (order.status === 'APPROVED' || order.status === 'PAID') return 'DISPATCHED';
  if (order.status === 'DISPATCHED') return 'DELIVERED';
  return null;
}

function matchesFilter(order: B2BOrder, filter: CompanyOrderFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'APPROVED') return ['APPROVED', 'PAID', 'PAYMENT_PENDING'].includes(order.status);
  if (filter === 'REJECTED') return order.status === 'REJECTED';
  return order.status === filter;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type CompanyModuleAppProps = {
  session: AuthSession;
  onSignOut: () => void;
};

export function CompanyModuleApp({ session, onSignOut }: CompanyModuleAppProps) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [tab, setTab] = useState<CompanyTab>('dashboard');
  const [profile, setProfile] = useState<CompanyProfile>(session.user.companyProfile ?? fallbackProfile);
  const [summary, setSummary] = useState<CompanySummary>(fallbackSummary);
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [wholesellers, setWholesellers] = useState<WholesellerListItem[]>([]);
  const [catalogue, setCatalogue] = useState<B2BMedicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [helper, setHelper] = useState('Loading your manufacturing workspace.');

  const [orderFilter, setOrderFilter] = useState<CompanyOrderFilter>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Catalogue screen state.
  const [medDrafts, setMedDrafts] = useState<Record<string, { mrp: string; medicineType: 'OTC' | 'PRESCRIPTION' }>>({});
  const [newBrand, setNewBrand] = useState('');
  const [newGeneric, setNewGeneric] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newPack, setNewPack] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [newType, setNewType] = useState<'OTC' | 'PRESCRIPTION'>('OTC');
  const [showAddMed, setShowAddMed] = useState(false);

  // Offer screen state.
  const [offerWholesellerId, setOfferWholesellerId] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerType, setOfferType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [offerValue, setOfferValue] = useState('');
  const [offerDays, setOfferDays] = useState('14');

  const theme = themes[mode];

  async function loadWorkspace() {
    setLoading(true);
    const liveProfile = session.user.companyProfile;

    if (!liveProfile) {
      setHelper('This account is not linked to a manufacturing company. Showing a module shell.');
      setLoading(false);
      return;
    }

    setProfile(liveProfile);
    const id = liveProfile.id;

    const [summaryRes, ordersRes, offersRes, wholesellersRes, catalogueRes] = await Promise.allSettled([
      fetchCompanySummary(id),
      fetchCompanyWholesellerOrders(id),
      fetchCompanyOffers(id),
      fetchWholesellers(),
      fetchCompanyMedicines(id),
    ]);

    let anyFailed = false;
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    else anyFailed = true;
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.orders);
    else anyFailed = true;
    if (offersRes.status === 'fulfilled') setOffers(offersRes.value.offers);
    else anyFailed = true;
    if (wholesellersRes.status === 'fulfilled') {
      setWholesellers(wholesellersRes.value.wholesellers);
      setOfferWholesellerId((current) => current ?? wholesellersRes.value.wholesellers[0]?.id ?? null);
    } else {
      anyFailed = true;
    }
    if (catalogueRes.status === 'fulfilled') setCatalogue(catalogueRes.value.medicines);
    else anyFailed = true;

    setHelper(anyFailed ? 'Some data could not be loaded. Showing the module shell where the backend was unreachable.' : '');
    setLoading(false);
  }

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, orderFilter)),
    [orders, orderFilter],
  );

  function upsertOrder(order: B2BOrder) {
    setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
  }

  async function approveOrder(order: B2BOrder) {
    try {
      const payload = await decideCompanyWholesellerOrder(profile.id, order.id, 'APPROVE');
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
      const payload = await decideCompanyWholesellerOrder(profile.id, order.id, 'REJECT', reason);
      upsertOrder(payload.order);
      setRejectReason('');
      setExpandedOrderId(null);
    } catch (error) {
      Alert.alert('Rejection failed', error instanceof Error ? error.message : 'Order could not be rejected.');
    }
  }

  async function advanceOrder(order: B2BOrder) {
    const status = nextOrderStatus(order);
    if (!status) return;
    try {
      const payload = await updateCompanyWholesellerOrderStatus(profile.id, order.id, status);
      upsertOrder(payload.order);
    } catch (error) {
      Alert.alert('Status update failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    }
  }

  function medDraftFor(medicine: B2BMedicine) {
    return (
      medDrafts[medicine.id] ?? {
        mrp: String(medicine.mrp),
        medicineType: (medicine.medicineType as 'OTC' | 'PRESCRIPTION') ?? 'OTC',
      }
    );
  }

  function medIsDirty(medicine: B2BMedicine) {
    const draft = medDrafts[medicine.id];
    if (!draft) return false;
    return draft.mrp !== String(medicine.mrp) || draft.medicineType !== medicine.medicineType;
  }

  async function saveMedicine(medicine: B2BMedicine) {
    const draft = medDraftFor(medicine);
    const mrp = Number(draft.mrp);
    if (!(mrp > 0)) {
      Alert.alert('Check the price', 'Enter a positive MRP.');
      return;
    }
    try {
      const payload = await updateCompanyMedicine(profile.id, medicine.id, {
        mrp,
        medicineType: draft.medicineType,
      });
      setCatalogue((current) => current.map((row) => (row.id === medicine.id ? { ...row, ...payload.medicine } : row)));
      setMedDrafts((current) => {
        const next = { ...current };
        delete next[medicine.id];
        return next;
      });
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Medicine could not be updated.');
    }
  }

  async function submitNewMedicine() {
    const mrp = Number(newMrp);
    if (newBrand.trim().length < 2 || newGeneric.trim().length < 2 || !newDosage.trim() || !newPack.trim() || !(mrp > 0)) {
      Alert.alert('Check the fields', 'Brand, composition, dosage, pack size, and a positive MRP are all required.');
      return;
    }
    try {
      const payload = await addCompanyMedicine(profile.id, {
        brandName: newBrand.trim(),
        genericName: newGeneric.trim(),
        dosage: newDosage.trim(),
        packSize: newPack.trim(),
        mrp,
        medicineType: newType,
      });
      setCatalogue((current) => [payload.medicine, ...current]);
      setSummary((current) => ({
        ...current,
        metrics: { ...current.metrics, medicineCount: current.metrics.medicineCount + 1 },
      }));
      setNewBrand('');
      setNewGeneric('');
      setNewDosage('');
      setNewPack('');
      setNewMrp('');
      setShowAddMed(false);
      Alert.alert('Medicine added', `${payload.medicine.brandName} is now in your catalogue.`);
    } catch (error) {
      Alert.alert('Could not add', error instanceof Error ? error.message : 'Medicine could not be added.');
    }
  }

  async function submitOffer() {
    const value = Number(offerValue);
    const days = Number(offerDays);
    if (!offerWholesellerId || offerTitle.trim().length < 3 || !(value >= 0) || !(days > 0)) {
      Alert.alert('Check the offer', 'Pick a wholesaler, add a title (3+ characters), a non-negative discount, and a positive duration.');
      return;
    }
    try {
      const payload = await createCompanyOffer(profile.id, {
        wholesellerId: offerWholesellerId,
        title: offerTitle.trim(),
        description: offerDesc.trim() || undefined,
        status: 'ACTIVE',
        discountType: offerType,
        discountValue: value,
        startsAt: new Date().toISOString(),
        endsAt: daysFromNow(days),
      });
      setOffers((current) => [payload.offer, ...current.filter((offer) => offer.id !== payload.offer.id)]);
      setOfferTitle('');
      setOfferDesc('');
      setOfferValue('');
      Alert.alert('Offer published', `${payload.offer.title} is now active.`);
    } catch (error) {
      Alert.alert('Offer failed', error instanceof Error ? error.message : 'Offer could not be created.');
    }
  }

  // ----- renderers -------------------------------------------------------

  function renderOrderCard(order: B2BOrder, options: { expandable?: boolean } = {}) {
    const canDecide = order.status === 'PENDING_APPROVAL';
    const advanceTo = nextOrderStatus(order);
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
              {order.wholeseller?.businessName ?? 'Wholeseller'} · {normalizeStatus(order.status)}
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
              <ActionButton mode={mode} label={`Mark ${normalizeStatus(advanceTo)}`} icon="truck" onPress={() => void advanceOrder(order)} />
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
        <SectionHeader mode={mode} title="Company dashboard" description="Catalogue reach, wholesaler orders, and offer activity." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Medicines" value={m.medicineCount} icon="archive" />
          <Kpi mode={mode} label="Pending orders" value={m.pendingWholesellerOrders} icon="clock" />
          <Kpi mode={mode} label="Delivered" value={m.deliveredWholesellerOrders} icon="check-circle" />
          <Kpi mode={mode} label="Active offers" value={m.activeOffers} icon="tag" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
        </View>
        <SectionHeader mode={mode} title="Newest wholeseller orders" description="Bulk orders waiting on company fulfilment." action="View all" onAction={() => setTab('orders')} />
        {orders.slice(0, 4).map((order) => renderOrderCard(order))}
      </ScrollView>
    );
  }

  function renderOrders() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Wholeseller orders" description="Approve, reject with a reason, dispatch, and close upstream orders." />
        <View style={styles.chipRow}>
          {ORDER_FILTERS.map((filter) => (
            <Chip key={filter.key} mode={mode} label={filter.label} active={orderFilter === filter.key} onPress={() => setOrderFilter(filter.key)} />
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

  function renderCatalogue() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader
          mode={mode}
          title="Catalogue"
          description="Medicines your company manufactures and supplies to wholesalers."
          action={showAddMed ? 'Close' : 'Add medicine'}
          onAction={() => setShowAddMed((current) => !current)}
        />

        {showAddMed ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>New medicine</Text>
            <Field mode={mode} label="Brand name" value={newBrand} onChangeText={setNewBrand} />
            <Field mode={mode} label="Composition / generic" value={newGeneric} onChangeText={setNewGeneric} />
            <View style={styles.fieldRow}>
              <Field mode={mode} label="Dosage" value={newDosage} onChangeText={setNewDosage} />
              <Field mode={mode} label="Pack size" value={newPack} onChangeText={setNewPack} />
              <Field mode={mode} label="MRP" value={newMrp} onChangeText={setNewMrp} keyboardType="numeric" />
            </View>
            <View style={styles.chipRow}>
              <Chip mode={mode} label="OTC" active={newType === 'OTC'} onPress={() => setNewType('OTC')} />
              <Chip mode={mode} label="Prescription" active={newType === 'PRESCRIPTION'} onPress={() => setNewType('PRESCRIPTION')} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton mode={mode} label="Add to catalogue" icon="plus" onPress={() => void submitNewMedicine()} />
            </View>
          </View>
        ) : null}

        {catalogue.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No medicines in the catalogue yet.</Text>
        ) : (
          catalogue.map((medicine) => {
            const draft = medDraftFor(medicine);
            const dirty = medIsDirty(medicine);
            return (
              <View key={medicine.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>
                  {medicine.genericName} · {medicine.dosage} · {medicine.packSize}
                </Text>
                <View style={styles.fieldRow}>
                  <Field mode={mode} label="MRP" value={draft.mrp} onChangeText={(v) => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), mrp: v } }))} keyboardType="numeric" />
                </View>
                <View style={styles.chipRow}>
                  <Chip mode={mode} label="OTC" active={draft.medicineType === 'OTC'} onPress={() => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), medicineType: 'OTC' } }))} />
                  <Chip mode={mode} label="Prescription" active={draft.medicineType === 'PRESCRIPTION'} onPress={() => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), medicineType: 'PRESCRIPTION' } }))} />
                </View>
                {dirty ? (
                  <View style={styles.actionRow}>
                    <ActionButton mode={mode} label="Save" icon="save" onPress={() => void saveMedicine(medicine)} />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  }

  function renderOffers() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Offers" description="Targeted discount offers sent to a wholesaler." />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>New offer</Text>
          <Text style={[styles.meta, { color: theme.subtext }]}>Wholesaler</Text>
          <View style={styles.chipRow}>
            {wholesellers.slice(0, 10).map((wholeseller) => (
              <Chip
                key={wholeseller.id}
                mode={mode}
                label={wholeseller.businessName}
                active={offerWholesellerId === wholeseller.id}
                onPress={() => setOfferWholesellerId(wholeseller.id)}
              />
            ))}
          </View>
          <Field mode={mode} label="Title" value={offerTitle} onChangeText={setOfferTitle} />
          <Field mode={mode} label="Description" value={offerDesc} onChangeText={setOfferDesc} />
          <View style={styles.chipRow}>
            <Chip mode={mode} label="Percent" active={offerType === 'PERCENT'} onPress={() => setOfferType('PERCENT')} />
            <Chip mode={mode} label="Flat" active={offerType === 'FLAT'} onPress={() => setOfferType('FLAT')} />
          </View>
          <View style={styles.fieldRow}>
            <Field mode={mode} label={offerType === 'PERCENT' ? 'Discount %' : 'Discount ₹'} value={offerValue} onChangeText={setOfferValue} keyboardType="numeric" />
            <Field mode={mode} label="Runs for (days)" value={offerDays} onChangeText={setOfferDays} keyboardType="numeric" />
          </View>
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label="Publish offer" icon="tag" onPress={() => void submitOffer()} />
          </View>
        </View>

        {offers.length === 0 ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>No offers yet.</Text>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{offer.title}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {offer.wholesellerName} · {offer.status} · {offer.discountType ?? '—'} {offer.discountValue ?? ''}
              </Text>
              {offer.description ? <Text style={[styles.meta, { color: theme.subtext }]}>{offer.description}</Text> : null}
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {new Date(offer.startsAt).toLocaleDateString()} – {new Date(offer.endsAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderAnalytics() {
    const m = summary.metrics;
    const byStatus = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
    const maxCount = Math.max(1, ...Object.values(byStatus));
    const otc = catalogue.filter((medicine) => medicine.medicineType === 'OTC').length;
    const rx = catalogue.length - otc;

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionHeader mode={mode} title="Analytics" description="Order workload, revenue, and catalogue mix." />
        <View style={styles.kpiGrid}>
          <Kpi mode={mode} label="Medicines" value={m.medicineCount} icon="archive" />
          <Kpi mode={mode} label="Pending" value={m.pendingWholesellerOrders} icon="clock" />
          <Kpi mode={mode} label="Delivered" value={m.deliveredWholesellerOrders} icon="check-circle" />
          <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
        </View>

        <RevenueTrendChart mode={mode} theme={theme} data={summary.revenueTrend} currencyFormatter={formatCurrency} />
        <TopItemsChart
          mode={mode}
          theme={theme}
          data={summary.topItems}
          currencyFormatter={formatCurrency}
          title="Top selling medicines"
          emptyLabel="No paid wholesaler orders yet."
        />

        <SectionHeader mode={mode} title="Wholeseller orders by status" />
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

        <SectionHeader mode={mode} title="Catalogue mix" />
        <View style={styles.barRow}>
          <Text style={[styles.barLabel, { color: theme.subtext }]}>OTC</Text>
          <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(otc / Math.max(1, catalogue.length)) * 100}%` }]} />
          </View>
          <Text style={[styles.barValue, { color: theme.text }]}>{otc}</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={[styles.barLabel, { color: theme.subtext }]}>Prescription</Text>
          <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.barFill, { backgroundColor: theme.warning, width: `${(rx / Math.max(1, catalogue.length)) * 100}%` }]} />
          </View>
          <Text style={[styles.barValue, { color: theme.text }]}>{rx}</Text>
        </View>
      </ScrollView>
    );
  }

  function renderBody() {
    switch (tab) {
      case 'dashboard':
        return renderDashboard();
      case 'orders':
        return renderOrders();
      case 'catalogue':
        return renderCatalogue();
      case 'offers':
        return renderOffers();
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
        <Text style={[styles.title, { color: theme.text }]}>{profile.legalName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>Signed in as {session.user.fullName}</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>{profile.contactEmail ?? 'Company supply desk'}</Text>
        {helper || loading ? (
          <Text style={[styles.meta, { color: theme.subtext }]}>{loading ? 'Syncing company workspace…' : helper}</Text>
        ) : null}
      </View>

      {renderBody()}

      <View style={[styles.tabBar, { backgroundColor: theme.surfaceAlt, borderTopColor: theme.border }]}>
        <Tab mode={mode} active={tab === 'dashboard'} label="Home" icon="grid" onPress={() => setTab('dashboard')} />
        <Tab mode={mode} active={tab === 'orders'} label="Orders" icon="package" onPress={() => setTab('orders')} />
        <Tab mode={mode} active={tab === 'catalogue'} label="Catalogue" icon="archive" onPress={() => setTab('catalogue')} />
        <Tab mode={mode} active={tab === 'offers'} label="Offers" icon="tag" onPress={() => setTab('offers')} />
        <Tab mode={mode} active={tab === 'analytics'} label="Stats" icon="bar-chart-2" onPress={() => setTab('analytics')} />
      </View>
    </SafeAreaView>
  );
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
  input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13 },
  field: { flex: 1, minWidth: 96, gap: 4 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700' },
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
