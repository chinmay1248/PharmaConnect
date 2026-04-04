import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, SafeAreaView, useWindowDimensions } from 'react-native';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import {
  banners,
  categories,
  initialOrders,
  medicines,
  quickServices,
  recentSearches,
  retailers,
  shortcutChips,
} from '../data/mockData';
import { ThemeMode, statusBarStyle, themes } from '../theme/theme';
import { AccountScreen } from './customer/AccountScreen';
import { CartScreen } from './customer/CartScreen';
import { CustomerHeader } from './customer/CustomerHeader';
import { DeliveryScreen } from './customer/DeliveryScreen';
import { HomeScreen } from './customer/HomeScreen';
import { InvoiceScreen } from './customer/InvoiceScreen';
import { MedicineDetailScreen } from './customer/MedicineDetailScreen';
import { OrdersScreen } from './customer/OrdersScreen';
import { PaymentScreen } from './customer/PaymentScreen';
import { PharmacyListScreen } from './customer/PharmacyListScreen';
import { PrescriptionScreen } from './customer/PrescriptionScreen';
import { SearchScreen } from './customer/SearchScreen';
import { SignupScreen } from './customer/SignupScreen';
import { SplashScreen } from './customer/SplashScreen';
import { TrackingScreen } from './customer/TrackingScreen';
import {
  AppStage,
  CartState,
  DeliveryMethod,
  InvoiceState,
  PaymentMethod,
  PharmacySort,
  Screen,
  SignupState,
  SortedPharmacy,
} from './customer/customerTypes';
import { customerStyles } from './customer/customerStyles';

// Main customer module component that controls the full frontend flow and screen switching.
export function CustomerModuleApp() {
  // Layout values used to keep the UI neat across mobile and web widths.
  const { width: viewportWidth } = useWindowDimensions();

  // Core app state for theme, navigation, checkout progress, and user details.
  const [stage, setStage] = useState<AppStage>('splash');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [screen, setScreen] = useState<Screen>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState(medicines[0].id);
  const [sortBy, setSortBy] = useState<PharmacySort>('closest');
  const [cart, setCart] = useState<CartState | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(null);
  const [prescriptionUploaded, setPrescriptionUploaded] = useState(false);
  const [orders, setOrders] = useState(initialOrders);
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [signup, setSignup] = useState<SignupState>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;
  const theme = themes[themeMode];
  const sectionWidth = Math.min(Math.max(viewportWidth - 28, 300), 460);
  const categoryCardWidth = Math.floor((sectionWidth - 30) / 4);
  const dealCardWidth = Math.floor((sectionWidth - 10) / 2);
  const optionCardWidth = Math.floor((sectionWidth - 10) / 2);
  const mobileProductCardWidth = Math.min(Math.max(sectionWidth * 0.52, 168), 212);
  const isHomeScreen = screen === 'home';

  // Splash animation: logo fades/scales in, then hands off to signup.
  useEffect(() => {
    if (stage !== 'splash') {
      return;
    }

    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(620),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1.05,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setStage('signup');
      }
    });

    return () => animation.stop();
  }, [stage, splashOpacity, splashScale]);

  // Filters the medicine catalogue for the search screen and header search behavior.
  const filteredMedicines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return medicines.filter((medicine) => {
      if (!query) {
        return true;
      }

      return (
        medicine.brandName.toLowerCase().includes(query) ||
        medicine.genericName.toLowerCase().includes(query) ||
        medicine.company.toLowerCase().includes(query) ||
        medicine.diseases.some((disease) => disease.toLowerCase().includes(query))
      );
    });
  }, [searchQuery]);

  // Resolves the medicine currently being viewed in detail, pharmacy, and cart flows.
  const selectedMedicine = useMemo(
    () => medicines.find((medicine) => medicine.id === selectedMedicineId) ?? medicines[0],
    [selectedMedicineId],
  );

  // Sorts nearby pharmacies by closest, cheapest, or highest rating.
  const sortedPharmacies = useMemo(() => {
    const list = retailers
      .map((retailer) => {
        const stock = retailer.stocks.find((item) => item.medicineId === selectedMedicine.id);
        return stock ? { retailer, stock } : null;
      })
      .filter((item): item is SortedPharmacy => item !== null);

    return list.sort((a, b) => {
      if (!a || !b) {
        return 0;
      }
      if (sortBy === 'cheapest') {
        return a.stock.price - b.stock.price;
      }
      if (sortBy === 'rating') {
        return b.retailer.rating - a.retailer.rating;
      }
      return a.retailer.distanceKm - b.retailer.distanceKm;
    });
  }, [selectedMedicine.id, sortBy]);

  // Pulls the selected medicine and retailer details into the cart summary.
  const cartMedicine = cart
    ? medicines.find((medicine) => medicine.id === cart.medicineId) ?? medicines[0]
    : null;
  const cartRetailer = cart
    ? retailers.find((retailer) => retailer.id === cart.retailerId) ?? retailers[0]
    : null;
  const cartUnitPrice =
    cart && cartRetailer
      ? cartRetailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ??
        cartMedicine?.salePrice ??
        0
      : 0;
  const cartSubtotal = cart ? cart.quantity * cartUnitPrice : 0;
  const activeOrder = orders[0] ?? initialOrders[0];

  // Changes the currently visible top-level customer screen.
  function navigateTo(screenId: Screen) {
    setScreen(screenId);
  }

  // Opens the selected medicine's detail page.
  function goToMedicine(medicineId: string) {
    setSelectedMedicineId(medicineId);
    setScreen('detail');
  }

  // Opens the search screen and optionally pre-fills a term.
  function openSearchFor(term?: string) {
    if (term) {
      setSearchQuery(term);
    }
    setScreen('search');
  }

  // Opens the pharmacy comparison screen for one medicine.
  function openPharmacies(medicineId: string) {
    setSelectedMedicineId(medicineId);
    setScreen('pharmacies');
  }

  // Stores the chosen pharmacy and prepares the cart for checkout.
  function selectRetailer(retailerId: string) {
    setCart({
      medicineId: selectedMedicine.id,
      retailerId,
      quantity: cart?.medicineId === selectedMedicine.id && cart.retailerId === retailerId ? cart.quantity : 1,
    });
    setScreen('cart');
  }

  // Increases or decreases the selected cart quantity while keeping it at 1 or more.
  function updateQuantity(change: number) {
    setCart((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        quantity: Math.max(1, current.quantity + change),
      };
    });
  }

  // Sends the user to prescription or payment depending on the selected medicine rules.
  function continueCheckout() {
    if (!cart) {
      return;
    }

    if (selectedMedicine.prescriptionRequired && !prescriptionUploaded) {
      setScreen('prescription');
      return;
    }

    setScreen('payment');
  }

  // Marks prescription submission as complete and advances checkout.
  function submitPrescription() {
    setPrescriptionUploaded(true);
    setScreen('payment');
  }

  // Creates a mock order and invoice after payment and delivery are selected.
  function placeOrder() {
    if (!cart || !paymentMethod || !deliveryMethod) {
      Alert.alert('Complete checkout', 'Please choose payment and delivery to place the order.');
      return;
    }

    const retailer = retailers.find((item) => item.id === cart.retailerId) ?? retailers[0];
    const unitPrice =
      retailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ?? selectedMedicine.salePrice;
    const subtotal = unitPrice * cart.quantity;
    const deliveryFee = deliveryMethod === 'home' ? 20 : 0;
    const total = subtotal + deliveryFee;
    const orderId = `ORD-${2200 + orders.length * 13}`;

    setOrders((current) => [
      {
        id: orderId,
        retailerId: retailer.id,
        dateLabel: 'Just now',
        status: 'Confirmed',
        total,
        items: [{ medicineId: cart.medicineId, quantity: cart.quantity, unitPrice }],
      },
      ...current,
    ]);

    setInvoice({
      invoiceNo: `INV-${3300 + orders.length * 11}`,
      orderId,
      medicineId: cart.medicineId,
      retailerId: retailer.id,
      quantity: cart.quantity,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      deliveryMethod,
    });
    setScreen('tracking');
  }

  // Updates one signup field while keeping the rest of the form intact.
  function updateSignupField(field: keyof SignupState, value: string) {
    setSignup((current) => ({ ...current, [field]: value }));
  }

  // Toggles between the supported light and dark UI themes.
  function toggleTheme() {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  // Maps nested checkout/detail screens back to the correct bottom tab highlight.
  function currentTab(): TabId {
    if (screen === 'detail' || screen === 'pharmacies') {
      return 'search';
    }
    if (
      screen === 'cart' ||
      screen === 'prescription' ||
      screen === 'payment' ||
      screen === 'delivery' ||
      screen === 'tracking' ||
      screen === 'invoice'
    ) {
      return 'cart';
    }
    if (screen === 'orders') {
      return 'orders';
    }
    if (screen === 'account') {
      return 'account';
    }
    return 'home';
  }

  const contentContainerStyle = [customerStyles.scrollContent, { paddingBottom: 110 }];

  // Shows the initial animated splash screen before signup.
  if (stage === 'splash') {
    return <SplashScreen splashOpacity={splashOpacity} splashScale={splashScale} />;
  }

  // Shows the signup form before the user enters the main app flow.
  if (stage === 'signup') {
    return (
      <SignupScreen
        mode={themeMode}
        theme={theme}
        signup={signup}
        contentContainerStyle={contentContainerStyle}
        onChangeField={updateSignupField}
        onToggleTheme={toggleTheme}
        onContinue={() => setStage('app')}
      />
    );
  }

  // Chooses which main screen body should be visible right now.
  function renderScreen() {
    if (screen === 'search') {
      return (
        <SearchScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          recentSearches={recentSearches}
          filteredMedicines={filteredMedicines}
          onOpenSearchFor={openSearchFor}
          onGoToMedicine={goToMedicine}
          onOpenPharmacies={openPharmacies}
        />
      );
    }

    if (screen === 'detail') {
      return (
        <MedicineDetailScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          selectedMedicine={selectedMedicine}
          onOpenSearchFor={openSearchFor}
          onOpenPharmacies={openPharmacies}
          onOpenSearch={() => setScreen('search')}
        />
      );
    }

    if (screen === 'pharmacies') {
      return (
        <PharmacyListScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          sortBy={sortBy}
          sortedPharmacies={sortedPharmacies}
          onChangeSort={setSortBy}
          onSelectRetailer={selectRetailer}
        />
      );
    }

    if (screen === 'cart') {
      return (
        <CartScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          cart={cart}
          cartMedicine={cartMedicine}
          cartRetailer={cartRetailer}
          cartUnitPrice={cartUnitPrice}
          cartSubtotal={cartSubtotal}
          prescriptionUploaded={prescriptionUploaded}
          onUpdateQuantity={updateQuantity}
          onContinueCheckout={continueCheckout}
        />
      );
    }

    if (screen === 'prescription') {
      return (
        <PrescriptionScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          prescriptionUploaded={prescriptionUploaded}
          onSubmitPrescription={submitPrescription}
          onBackToCart={() => setScreen('cart')}
        />
      );
    }

    if (screen === 'payment') {
      return (
        <PaymentScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          paymentMethod={paymentMethod}
          optionCardWidth={optionCardWidth}
          onSelectPaymentMethod={setPaymentMethod}
          onContinue={() => setScreen('delivery')}
        />
      );
    }

    if (screen === 'delivery') {
      return (
        <DeliveryScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          deliveryMethod={deliveryMethod}
          optionCardWidth={optionCardWidth}
          onSelectDeliveryMethod={setDeliveryMethod}
          onPlaceOrder={placeOrder}
        />
      );
    }

    if (screen === 'tracking') {
      return (
        <TrackingScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          activeOrder={activeOrder}
          onOpenInvoice={() => setScreen('invoice')}
          onOpenOrders={() => setScreen('orders')}
        />
      );
    }

    if (screen === 'invoice') {
      return (
        <InvoiceScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          invoice={invoice}
          medicines={medicines}
          retailers={retailers}
        />
      );
    }

    if (screen === 'orders') {
      return (
        <OrdersScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          orders={orders}
          retailers={retailers}
          onOpenTracking={() => setScreen('tracking')}
        />
      );
    }

    if (screen === 'account') {
      return (
        <AccountScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          signup={signup}
        />
      );
    }

    return (
      <HomeScreen
        mode={themeMode}
        theme={theme}
        contentContainerStyle={contentContainerStyle}
        quickServices={quickServices}
        shortcutChips={shortcutChips}
        categories={categories}
        banners={banners}
        medicines={medicines}
        retailers={retailers}
        cartMedicine={cartMedicine}
        categoryCardWidth={categoryCardWidth}
        mobileProductCardWidth={mobileProductCardWidth}
        dealCardWidth={dealCardWidth}
        onOpenPrescription={() => setScreen('prescription')}
        onOpenOrders={() => setScreen('orders')}
        onOpenAccount={() => setScreen('account')}
        onOpenSearchFor={openSearchFor}
        onGoToMedicine={goToMedicine}
        onOpenPharmacies={openPharmacies}
      />
    );
  }

  return (
    <SafeAreaView style={[customerStyles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(themeMode)} />

      {/* Shared customer header with compact logo, search, location, theme, notification, and cart actions. */}
      <CustomerHeader
        mode={themeMode}
        theme={theme}
        isHomeScreen={isHomeScreen}
        searchQuery={searchQuery}
        address={signup.address}
        onChangeSearchText={setSearchQuery}
        onSubmitSearch={() => setScreen('search')}
        onPressAccount={() => setScreen('account')}
        onToggleTheme={toggleTheme}
        onPressCart={() => setScreen('cart')}
      />

      {/* Visible page body based on the current screen state. */}
      {renderScreen()}

      {/* Sticky bottom navigation. */}
      <BottomTabBar
        mode={themeMode}
        activeTab={currentTab()}
        onChange={(tab) => navigateTo(tab === 'account' ? 'account' : tab)}
      />
    </SafeAreaView>
  );
}
