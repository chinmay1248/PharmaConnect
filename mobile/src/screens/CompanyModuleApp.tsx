import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
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
import { CompanyAnalyticsTab } from './company/CompanyAnalyticsTab';
import { CompanyCatalogueTab, type MedicineDraft } from './company/CompanyCatalogueTab';
import { CompanyDashboardTab } from './company/CompanyDashboardTab';
import { CompanyOffersTab } from './company/CompanyOffersTab';
import { CompanyOrdersTab } from './company/CompanyOrdersTab';
import { matchesFilter, styles, Tab } from './company/companyShared';
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
  const [medDrafts, setMedDrafts] = useState<Record<string, MedicineDraft>>({});
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
    const status = order.status === 'APPROVED' || order.status === 'PAID' ? 'DISPATCHED' : order.status === 'DISPATCHED' ? 'DELIVERED' : null;
    if (!status) return;
    try {
      const payload = await updateCompanyWholesellerOrderStatus(profile.id, order.id, status);
      upsertOrder(payload.order);
    } catch (error) {
      Alert.alert('Status update failed', error instanceof Error ? error.message : 'Order status could not be updated.');
    }
  }

  function medDraftFor(medicine: B2BMedicine): MedicineDraft {
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

  function renderBody() {
    switch (tab) {
      case 'dashboard':
        return (
          <CompanyDashboardTab
            mode={mode}
            summary={summary}
            orders={orders}
            onViewAllOrders={() => setTab('orders')}
            expandedOrderId={expandedOrderId}
            setExpandedOrderId={setExpandedOrderId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onApprove={(order) => void approveOrder(order)}
            onReject={(order) => void rejectOrder(order)}
            onAdvance={(order) => void advanceOrder(order)}
          />
        );
      case 'orders':
        return (
          <CompanyOrdersTab
            mode={mode}
            orderFilter={orderFilter}
            setOrderFilter={setOrderFilter}
            filteredOrders={filteredOrders}
            expandedOrderId={expandedOrderId}
            setExpandedOrderId={setExpandedOrderId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onApprove={(order) => void approveOrder(order)}
            onReject={(order) => void rejectOrder(order)}
            onAdvance={(order) => void advanceOrder(order)}
          />
        );
      case 'catalogue':
        return (
          <CompanyCatalogueTab
            mode={mode}
            catalogue={catalogue}
            showAddMed={showAddMed}
            setShowAddMed={setShowAddMed}
            newBrand={newBrand}
            setNewBrand={setNewBrand}
            newGeneric={newGeneric}
            setNewGeneric={setNewGeneric}
            newDosage={newDosage}
            setNewDosage={setNewDosage}
            newPack={newPack}
            setNewPack={setNewPack}
            newMrp={newMrp}
            setNewMrp={setNewMrp}
            newType={newType}
            setNewType={setNewType}
            submitNewMedicine={() => void submitNewMedicine()}
            medDraftFor={medDraftFor}
            medIsDirty={medIsDirty}
            setMedDrafts={setMedDrafts}
            saveMedicine={(medicine) => void saveMedicine(medicine)}
          />
        );
      case 'offers':
        return (
          <CompanyOffersTab
            mode={mode}
            wholesellers={wholesellers}
            offers={offers}
            offerWholesellerId={offerWholesellerId}
            setOfferWholesellerId={setOfferWholesellerId}
            offerTitle={offerTitle}
            setOfferTitle={setOfferTitle}
            offerDesc={offerDesc}
            setOfferDesc={setOfferDesc}
            offerType={offerType}
            setOfferType={setOfferType}
            offerValue={offerValue}
            setOfferValue={setOfferValue}
            offerDays={offerDays}
            setOfferDays={setOfferDays}
            submitOffer={() => void submitOffer()}
          />
        );
      case 'analytics':
        return <CompanyAnalyticsTab mode={mode} summary={summary} orders={orders} catalogue={catalogue} />;
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
