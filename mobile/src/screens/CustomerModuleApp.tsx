import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable } from '../components/InteractivePressable';
import { SectionHeader } from '../components/SectionHeader';
import {
  banners,
  categories,
  initialOrders,
  medicines,
  Order,
  quickServices,
  recentSearches,
  retailers,
  shortcutChips,
} from '../data/mockData';
import { ThemeMode, statusBarStyle, themes } from '../theme/theme';
import { formatCurrency, orderStepIndex } from '../utils/format';

// App-level flow states: splash -> signup -> customer app.
type AppStage = 'splash' | 'signup' | 'app';
type Screen =
  | 'home'
  | 'search'
  | 'detail'
  | 'pharmacies'
  | 'cart'
  | 'prescription'
  | 'payment'
  | 'delivery'
  | 'tracking'
  | 'invoice'
  | 'orders'
  | 'account';
type PharmacySort = 'closest' | 'cheapest' | 'rating';
type PaymentMethod = 'upi' | 'card' | 'cod' | 'bank' | null;
type DeliveryMethod = 'home' | 'pickup' | null;

type CartState = {
  medicineId: string;
  retailerId: string;
  quantity: number;
};

type InvoiceState = {
  invoiceNo: string;
  orderId: string;
  medicineId: string;
  retailerId: string;
  quantity: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: Exclude<PaymentMethod, null>;
  deliveryMethod: Exclude<DeliveryMethod, null>;
};

// Maps the quick service chips on the home screen to their icons.
const serviceIcons: Record<string, keyof typeof Feather.glyphMap> = {
  'Rx Upload': 'file-plus',
  Refill: 'rotate-cw',
  Deals: 'tag',
  Doctor: 'activity',
  'Care+': 'heart',
};

// Maps the top medicine category tiles to their icons.
const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  Fever: 'thermometer',
  Diabetes: 'droplet',
  Vitamins: 'sun',
  Heart: 'heart',
  Skin: 'smile',
  'Baby Care': 'shield',
  'Pain Relief': 'zap',
  Digestive: 'coffee',
};

// Renders a small circular icon button in the header for actions like theme, alerts, and cart.
function HeaderIcon({
  mode,
  icon,
  onPress,
}: {
  mode: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  const theme = themes[mode];

  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: theme.surface }]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
      pressedStyle={{ backgroundColor: theme.elevated }}
      scaleHover={1.08}
      scalePress={0.94}
    >
      <Feather name={icon} size={18} color={theme.primary} />
    </InteractivePressable>
  );
}

// Renders a reusable CTA button used across cards, forms, and checkout steps.
function ActionButton({
  mode,
  label,
  icon,
  onPress,
  variant = 'primary',
  fullWidth = false,
}: {
  mode: ThemeMode;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'soft';
  fullWidth?: boolean;
}) {
  const theme = themes[mode];
  const palette =
    variant === 'primary'
      ? {
          backgroundColor: theme.primary,
          hoveredColor: theme.primaryStrong,
          pressedColor: theme.primaryStrong,
          borderColor: theme.primary,
          color: theme.buttonText,
        }
      : variant === 'soft'
        ? {
            backgroundColor: theme.surfaceAlt,
            hoveredColor: theme.elevated,
            pressedColor: theme.elevated,
            borderColor: theme.border,
            color: theme.text,
          }
        : {
            backgroundColor: theme.surface,
            hoveredColor: theme.surfaceAlt,
            pressedColor: theme.elevated,
            borderColor: theme.border,
            color: theme.text,
          };

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        fullWidth && styles.fullWidth,
      ]}
      hoveredStyle={{ backgroundColor: palette.hoveredColor }}
      pressedStyle={{ backgroundColor: palette.pressedColor }}
      scaleHover={1.035}
      scalePress={0.975}
    >
      {icon ? <Feather name={icon} size={16} color={palette.color} /> : null}
      <Text style={[styles.actionButtonLabel, { color: palette.color }]}>{label}</Text>
    </InteractivePressable>
  );
}

// Renders the main search bar with text input, camera action, and voice action.
function SearchBar({
  mode,
  value,
  onChangeText,
  onSubmit,
}: {
  mode: ThemeMode;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}) {
  const theme = themes[mode];

  return (
    <View
      style={[
        styles.searchWrap,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <Feather name="search" size={18} color={theme.subtext} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Search medicines, salts or ask a question"
        placeholderTextColor={theme.subtext}
        style={[styles.searchInput, { color: theme.text }]}
      />
      <InteractivePressable
        onPress={() => Alert.alert('Camera', 'Image search can be connected in the next integration step.')}
        style={styles.searchIconWrap}
        hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="camera" size={16} color={theme.primary} />
      </InteractivePressable>
      <InteractivePressable
        onPress={() => Alert.alert('Voice search', 'Voice search can be connected in the next integration step.')}
        style={styles.searchIconWrap}
        hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="mic" size={16} color={theme.primary} />
      </InteractivePressable>
    </View>
  );
}

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
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [signup, setSignup] = useState({
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

  // Filters the medicine catalogue for the search screen and search header.
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

  const selectedMedicine =
    medicines.find((medicine) => medicine.id === selectedMedicineId) ?? medicines[0];

  // Sorts nearby pharmacies by closest, cheapest, or highest rating.
  const sortedPharmacies = useMemo(() => {
    const list = retailers
      .map((retailer) => {
        const stock = retailer.stocks.find((item) => item.medicineId === selectedMedicine.id);
        return stock ? { retailer, stock } : null;
      })
      .filter(Boolean) as {
      retailer: (typeof retailers)[number];
      stock: (typeof retailers)[number]['stocks'][number];
    }[];

    return list.sort((a, b) => {
      if (sortBy === 'cheapest') {
        return a.stock.price - b.stock.price;
      }
      if (sortBy === 'rating') {
        return b.retailer.rating - a.retailer.rating;
      }
      return a.retailer.distanceKm - b.retailer.distanceKm;
    });
  }, [selectedMedicine.id, sortBy]);

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
  const activeOrder = orders[0];

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
      retailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ??
      selectedMedicine.salePrice;
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

  const contentContainerStyle = [styles.scrollContent, { paddingBottom: 110 }];

  // First impression screen before account entry.
  if (stage === 'splash') {
    return (
      <SafeAreaView style={[styles.page, styles.splashPage]}>
        <StatusBar style="dark" />
        <Animated.View
          style={[
            styles.splashWrap,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}
        >
          <BrandLogo mode="light" size="hero" />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Customer signup / entry form shown before the main app.
  if (stage === 'signup') {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
        <StatusBar style={statusBarStyle(themeMode)} />
        <ScrollView contentContainerStyle={contentContainerStyle}>
          <View style={styles.signupHeader}>
            <BrandLogo mode={themeMode} size="hero" />
            <HeaderIcon
              mode={themeMode}
              icon={themeMode === 'dark' ? 'sun' : 'moon'}
              onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            />
          </View>
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.authTitle, { color: theme.text }]}>Create your customer account</Text>
            <Text style={[styles.authSub, { color: theme.subtext }]}>
              Enter your address and details first, then search medicines, compare pharmacies, upload prescription when needed, choose payment, and get your invoice.
            </Text>

            {[
              { key: 'fullName', placeholder: 'Full name', secure: false, multiline: false },
              { key: 'email', placeholder: 'Email address', secure: false, multiline: false },
              { key: 'password', placeholder: 'Password', secure: true, multiline: false },
              { key: 'phone', placeholder: 'Phone number', secure: false, multiline: false },
              { key: 'address', placeholder: 'Full delivery address', secure: false, multiline: true },
            ].map((field) => (
              <TextInput
                key={field.key}
                value={signup[field.key as keyof typeof signup]}
                onChangeText={(value) => setSignup((current) => ({ ...current, [field.key]: value }))}
                placeholder={field.placeholder}
                placeholderTextColor={theme.subtext}
                secureTextEntry={field.secure}
                multiline={field.multiline}
                keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
                style={[
                  styles.input,
                  field.multiline && styles.inputMultiline,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
            ))}

            <ActionButton
              mode={themeMode}
              label="Continue to customer app"
              icon="arrow-right"
              onPress={() => setStage('app')}
              fullWidth
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Home screen with quick actions, shortcuts, banners, categories, and deals.
  function renderHome() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <View style={styles.rowWrap}>
          {quickServices.map((service) => (
            <InteractivePressable
              key={service.id}
              onPress={() => {
                if (service.title === 'Rx Upload') {
                  setScreen('prescription');
                  return;
                }
                if (service.title === 'Deals') {
                  openSearchFor('deal');
                  return;
                }
                if (service.title === 'Refill') {
                  openSearchFor('daily');
                  return;
                }
                Alert.alert(service.title, `${service.title} can be wired to a dedicated flow in the next pass.`);
              }}
              style={[
                styles.utilityChip,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <Feather name={serviceIcons[service.title]} size={15} color={theme.primary} />
              <Text style={[styles.utilityChipText, { color: theme.text }]}>{service.title}</Text>
            </InteractivePressable>
          ))}
        </View>

        <View style={[styles.rowWrap, styles.shortcutRow]}>
          {shortcutChips.map((chip) => (
            <InteractivePressable
              key={chip.id}
              onPress={() => {
                if (chip.title === 'Orders') {
                  setScreen('orders');
                  return;
                }
                if (chip.title === 'Buy Again') {
                  openSearchFor(cartMedicine?.genericName ?? medicines[0].genericName);
                  return;
                }
                if (chip.title === 'Account') {
                  setScreen('account');
                  return;
                }
                Alert.alert('Lists', 'List management can be connected in the next step.');
              }}
              style={[
                styles.shortcutChip,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <Text style={[styles.shortcutChipText, { color: theme.text }]}>{chip.title}</Text>
            </InteractivePressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {banners.map((banner) => (
            <InteractivePressable
              key={banner.id}
              onPress={() => openSearchFor(banner.title.includes('Nearby') ? 'nearby' : 'daily')}
              style={[
                styles.bannerCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={[styles.bannerAccent, { backgroundColor: banner.accent }]} />
              <Text style={[styles.bannerTitle, { color: '#0a1624' }]}>{banner.title}</Text>
              <Text style={[styles.bannerText, { color: theme.subtext }]}>{banner.subtitle}</Text>
              <ActionButton
                mode={themeMode}
                label="Explore"
                icon="arrow-right"
                variant="secondary"
                onPress={() => openSearchFor(banner.title)}
              />
            </InteractivePressable>
          ))}
        </ScrollView>

        <SectionHeader
          mode={themeMode}
          title="Top categories for you"
          description="Jump straight to the medicines people usually search first."
        />
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <InteractivePressable
              key={category.id}
              onPress={() => openSearchFor(category.title)}
              style={[
                styles.categoryCard,
                { width: categoryCardWidth },
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: category.tint }]}>
                <Feather
                  name={categoryIcons[category.title] ?? 'box'}
                  size={18}
                  color={theme.primaryStrong}
                />
              </View>
              <Text numberOfLines={2} style={[styles.categoryLabel, { color: theme.text }]}>
                {category.title}
              </Text>
            </InteractivePressable>
          ))}
        </View>

        <SectionHeader
          mode={themeMode}
          title="Reorder previous medicines"
          action="See all"
          onAction={() => setScreen('orders')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {medicines.map((medicine) => (
            <InteractivePressable
              key={medicine.id}
              onPress={() => goToMedicine(medicine.id)}
              style={[
                styles.productCard,
                { width: mobileProductCardWidth },
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={[styles.productThumb, { backgroundColor: medicine.imageColor }]}>
                <Text style={styles.productThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={[styles.productTitle, { color: theme.text }]} numberOfLines={2}>
                {medicine.brandName}
              </Text>
              <Text style={[styles.productMeta, { color: theme.subtext }]}>{medicine.monthlyOrders}</Text>
              <Text style={[styles.productPrice, { color: theme.text }]}>{formatCurrency(medicine.salePrice)}</Text>
            </InteractivePressable>
          ))}
        </ScrollView>

        <SectionHeader
          mode={themeMode}
          title="Nearby pharmacy deals"
          action="See all"
          onAction={() => setScreen('search')}
        />
        <View style={styles.dealGrid}>
          {medicines.map((medicine) => (
            <InteractivePressable
              key={medicine.id}
              onPress={() => openPharmacies(medicine.id)}
              style={[
                styles.dealCard,
                { width: dealCardWidth },
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={[styles.dealThumb, { backgroundColor: medicine.imageColor }]}>
                <Text style={styles.dealThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={[styles.dealTitle, { color: theme.text }]} numberOfLines={2}>
                {medicine.brandName}
              </Text>
              <Text style={[styles.dealMeta, { color: theme.subtext }]}>
                Compare closest, cheapest, and top rated pharmacies
              </Text>
              <Text style={[styles.dealPrice, { color: theme.text }]}>
                From {formatCurrency(Math.min(...retailers.flatMap((retailer) => retailer.stocks.filter((stock) => stock.medicineId === medicine.id).map((stock) => stock.price))))}
              </Text>
            </InteractivePressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Search results screen for medicines and related quick actions.
  function renderSearch() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Search medicines"
          description="See medicine details first, then compare nearby pharmacies."
        />
        {recentSearches.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {recentSearches.map((term) => (
              <InteractivePressable
                key={term}
                onPress={() => openSearchFor(term)}
                style={[
                  styles.searchPill,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Feather name="clock" size={14} color={theme.primary} />
                <Text style={[styles.searchPillText, { color: theme.text }]}>{term}</Text>
              </InteractivePressable>
            ))}
          </ScrollView>
        ) : null}
        {filteredMedicines.map((medicine) => (
          <InteractivePressable
            key={medicine.id}
            onPress={() => goToMedicine(medicine.id)}
            style={[
              styles.searchCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={[styles.searchCardThumb, { backgroundColor: medicine.imageColor }]}>
              <Text style={styles.searchCardThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.searchCardBody}>
              <Text style={[styles.searchCardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
              <Text style={[styles.searchCardMeta, { color: theme.subtext }]}>
                {medicine.genericName} · {medicine.company} · {medicine.packSize}
              </Text>
              <Text style={[styles.searchCardMeta, { color: theme.subtext }]}>
                {medicine.rating} stars · {medicine.reviewCount} reviews
              </Text>
              <Text style={[styles.searchCardPrice, { color: theme.text }]}>{formatCurrency(medicine.salePrice)}</Text>
              <Text style={[styles.searchCardMeta, { color: theme.primary }]}>
                {medicine.couponPrice ? `Buy for ${formatCurrency(medicine.couponPrice)} with coupon` : 'Trusted nearby pricing'}
              </Text>
              <View style={styles.inlineRow}>
                <ActionButton mode={themeMode} label="Details" icon="info" variant="secondary" onPress={() => goToMedicine(medicine.id)} />
                <ActionButton mode={themeMode} label="Compare pharmacies" icon="map-pin" onPress={() => openPharmacies(medicine.id)} />
              </View>
            </View>
          </InteractivePressable>
        ))}
      </ScrollView>
    );
  }

  // Product detail screen for one medicine, including substitutes and diseases.
  function renderDetail() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Medicine details"
          description="Everything the customer should see before ordering."
        />
        <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.detailThumb, { backgroundColor: selectedMedicine.imageColor }]}>
            <Text style={styles.detailThumbText}>{selectedMedicine.genericName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedMedicine.brandName}</Text>
          <Text style={[styles.detailSubTitle, { color: theme.subtext }]}>
            {selectedMedicine.genericName} - {selectedMedicine.dosage} - {selectedMedicine.packSize}
          </Text>
          <Text style={[styles.detailPrice, { color: theme.text }]}>
            {formatCurrency(selectedMedicine.salePrice)}
          </Text>
          <Text style={[styles.detailSubTitle, { color: theme.primary }]}>
            {selectedMedicine.prescriptionRequired ? 'Prescription required before dispatch' : 'No prescription needed'}
          </Text>
          <Text style={[styles.detailDescription, { color: theme.subtext }]}>{selectedMedicine.description}</Text>

          <View style={styles.tagRow}>
            {selectedMedicine.diseases.map((disease) => (
              <View key={disease} style={[styles.infoTag, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.infoTagText, { color: theme.text }]}>{disease}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.subSectionTitle, { color: theme.text }]}>Substitutes</Text>
          <View style={styles.tagRow}>
            {selectedMedicine.substitutes.map((substitute) => (
              <InteractivePressable
                key={substitute}
                onPress={() => openSearchFor(substitute)}
                style={[styles.infoTag, { backgroundColor: theme.surface, borderColor: theme.border }]}
                hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Text style={[styles.infoTagText, { color: theme.text }]}>{substitute}</Text>
              </InteractivePressable>
            ))}
          </View>

          <View style={styles.inlineRow}>
            <ActionButton mode={themeMode} label="Compare pharmacies" icon="map-pin" onPress={() => openPharmacies(selectedMedicine.id)} />
            <ActionButton mode={themeMode} label="Back to search" icon="search" variant="secondary" onPress={() => setScreen('search')} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Nearby pharmacy comparison screen with sorting options.
  function renderPharmacies() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Choose pharmacy"
          description="Sort by what matters first before you place the order."
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {[
            { id: 'closest', label: 'Closest pharmacy' },
            { id: 'cheapest', label: 'Cheapest first' },
            { id: 'rating', label: 'Highest rating' },
          ].map((option) => {
            const active = sortBy === option.id;
            return (
              <InteractivePressable
                key={option.id}
                onPress={() => setSortBy(option.id as PharmacySort)}
                style={[
                  styles.sortPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Text style={[styles.sortPillText, { color: active ? theme.primaryStrong : theme.text }]}>
                  {option.label}
                </Text>
              </InteractivePressable>
            );
          })}
        </ScrollView>

        {sortedPharmacies.map(({ retailer, stock }) => (
          <InteractivePressable
            key={retailer.id}
            onPress={() => selectRetailer(retailer.id)}
            style={[
              styles.pharmacyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={styles.pharmacyHeader}>
              <View style={styles.pharmacyHeaderCopy}>
                <Text style={[styles.pharmacyName, { color: theme.text }]}>{retailer.name}</Text>
                <Text style={[styles.pharmacyMeta, { color: theme.subtext }]}>
                  {retailer.area} - {retailer.distanceKm} km - {retailer.deliveryTime}
                </Text>
              </View>
              <Text style={[styles.pharmacyPrice, { color: theme.text }]}>{formatCurrency(stock.price)}</Text>
            </View>
            <View style={styles.pharmacyStats}>
              <Text style={[styles.pharmacyMeta, { color: theme.primary }]}>Rating {retailer.rating}</Text>
              <Text style={[styles.pharmacyMeta, { color: theme.subtext }]}>Stock {stock.stockQty}</Text>
              <Text style={[styles.pharmacyMeta, { color: theme.subtext }]}>
                {retailer.deliveryAvailable ? 'Home delivery available' : 'Pickup only'}
              </Text>
            </View>
            <ActionButton mode={themeMode} label="Select pharmacy" icon="shopping-bag" onPress={() => selectRetailer(retailer.id)} />
          </InteractivePressable>
        ))}
      </ScrollView>
    );
  }

  // Order review screen before prescription/payment steps.
  function renderCart() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Review order"
          description="Product details, pharmacy details, quantity, and next step all in one place."
        />
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {cartMedicine && cartRetailer ? (
            <>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{cartMedicine.brandName}</Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                {cartMedicine.genericName} - {cartMedicine.packSize}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Pharmacy: {cartRetailer.name} - {cartRetailer.area}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Prescription: {cartMedicine.prescriptionRequired ? 'Required' : 'Not required'}
              </Text>
              <Text style={[styles.infoLine, { color: theme.text }]}>Price per pack: {formatCurrency(cartUnitPrice)}</Text>

              <View style={styles.quantityRow}>
                <ActionButton mode={themeMode} label="-" variant="secondary" onPress={() => updateQuantity(-1)} />
                <Text style={[styles.quantityValue, { color: theme.text }]}>{cart?.quantity ?? 1}</Text>
                <ActionButton mode={themeMode} label="+" variant="secondary" onPress={() => updateQuantity(1)} />
              </View>

              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={[styles.billText, { color: theme.subtext }]}>Subtotal</Text>
                  <Text style={[styles.billText, { color: theme.text }]}>{formatCurrency(cartSubtotal)}</Text>
                </View>
              </View>

              <ActionButton
                mode={themeMode}
                label={cartMedicine.prescriptionRequired && !prescriptionUploaded ? 'Continue to prescription' : 'Continue to payment'}
                icon="arrow-right"
                onPress={continueCheckout}
                fullWidth
              />
            </>
          ) : (
            <Text style={[styles.infoLine, { color: theme.subtext }]}>No medicine selected yet.</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  // Prescription upload placeholder for Rx-required medicines.
  function renderPrescription() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Upload prescription"
          description="This step appears only when the selected medicine needs retailer approval."
        />
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoLine, { color: theme.subtext }]}>
            Upload prescription, then the retailer can approve or reject the order according to the PharmaConnect customer flow.
          </Text>
          <View style={styles.inlineRow}>
            <ActionButton
              mode={themeMode}
              label={prescriptionUploaded ? 'Prescription uploaded' : 'Upload now'}
              icon="upload"
              onPress={submitPrescription}
            />
            <ActionButton mode={themeMode} label="Back to cart" icon="arrow-left" variant="secondary" onPress={() => setScreen('cart')} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Payment method selection screen.
  function renderPayment() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Select payment option"
          description="Choose the exact payment step before delivery choice."
        />
        <View style={styles.optionGrid}>
          {[
            { id: 'upi', label: 'UPI', icon: 'smartphone' },
            { id: 'card', label: 'Card', icon: 'credit-card' },
            { id: 'bank', label: 'Bank details', icon: 'briefcase' },
            { id: 'cod', label: 'Cash on delivery', icon: 'dollar-sign' },
          ].map((option) => {
            const active = paymentMethod === option.id;
            return (
              <InteractivePressable
                key={option.id}
                onPress={() => setPaymentMethod(option.id as PaymentMethod)}
                style={[
                  styles.optionCard,
                  { width: optionCardWidth },
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Feather name={option.icon as keyof typeof Feather.glyphMap} size={20} color={theme.primary} />
                <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
              </InteractivePressable>
            );
          })}
        </View>
        <ActionButton
          mode={themeMode}
          label="Continue to delivery"
          icon="arrow-right"
          onPress={() => setScreen('delivery')}
          fullWidth
        />
      </ScrollView>
    );
  }

  // Delivery choice screen for home delivery vs pickup.
  function renderDelivery() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Choose delivery option"
          description="Pick home delivery or pickup from pharmacy before placing the order."
        />
        <View style={styles.optionGrid}>
          {[
            { id: 'home', label: 'Home delivery', icon: 'truck' },
            { id: 'pickup', label: 'Pickup from pharmacy', icon: 'map-pin' },
          ].map((option) => {
            const active = deliveryMethod === option.id;
            return (
              <InteractivePressable
                key={option.id}
                onPress={() => setDeliveryMethod(option.id as DeliveryMethod)}
                style={[
                  styles.optionCard,
                  { width: optionCardWidth },
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Feather name={option.icon as keyof typeof Feather.glyphMap} size={20} color={theme.primary} />
                <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
              </InteractivePressable>
            );
          })}
        </View>
        <ActionButton mode={themeMode} label="Place order" icon="check" onPress={placeOrder} fullWidth />
      </ScrollView>
    );
  }

  // Tracking timeline shown after order placement.
  function renderTracking() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title={`Track ${activeOrder.id}`}
          description="Order progress is visible step by step after retailer confirmation."
        />
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {['Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'].map((step, index) => {
            const active = index <= orderStepIndex(activeOrder.status);
            return (
              <View key={step} style={styles.trackRow}>
                <View style={[styles.trackDot, { backgroundColor: active ? theme.primary : theme.border }]} />
                <View style={styles.trackCopy}>
                  <Text style={[styles.trackTitle, { color: active ? theme.text : theme.subtext }]}>{step}</Text>
                  <Text style={[styles.trackMeta, { color: theme.subtext }]}>
                    {active ? 'Visible in the customer timeline' : 'Waiting for the next update'}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={styles.inlineRow}>
            <ActionButton mode={themeMode} label="View invoice" icon="file-text" onPress={() => setScreen('invoice')} />
            <ActionButton mode={themeMode} label="Go to orders" icon="package" variant="secondary" onPress={() => setScreen('orders')} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Invoice and bill summary screen.
  function renderInvoice() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Invoice and bill"
          description="The customer can review and download the bill from here."
        />
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {invoice ? (
            <>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{invoice.invoiceNo}</Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>Order: {invoice.orderId}</Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Medicine: {medicines.find((medicine) => medicine.id === invoice.medicineId)?.brandName}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Pharmacy: {retailers.find((retailer) => retailer.id === invoice.retailerId)?.name}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>Quantity: {invoice.quantity}</Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>Payment: {invoice.paymentMethod.toUpperCase()}</Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Delivery: {invoice.deliveryMethod === 'home' ? 'Home delivery' : 'Pickup from pharmacy'}
              </Text>

              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={[styles.billText, { color: theme.subtext }]}>Subtotal</Text>
                  <Text style={[styles.billText, { color: theme.text }]}>{formatCurrency(invoice.subtotal)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billText, { color: theme.subtext }]}>Delivery fee</Text>
                  <Text style={[styles.billText, { color: theme.text }]}>{formatCurrency(invoice.deliveryFee)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billTotal, { color: theme.text }]}>Total bill</Text>
                  <Text style={[styles.billTotal, { color: theme.text }]}>{formatCurrency(invoice.total)}</Text>
                </View>
              </View>

              <ActionButton
                mode={themeMode}
                label="Download invoice"
                icon="download"
                onPress={() => Alert.alert('Download invoice', 'PDF download can be connected when the backend invoice service is added.')}
                fullWidth
              />
            </>
          ) : (
            <Text style={[styles.infoLine, { color: theme.subtext }]}>No invoice generated yet.</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  // Orders history list.
  function renderOrders() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Your orders"
          description="Past and active medicine orders stay visible here."
        />
        {orders.map((order) => {
          const retailer = retailers.find((item) => item.id === order.retailerId) ?? retailers[0];
          return (
            <InteractivePressable
              key={order.id}
              onPress={() => setScreen('tracking')}
              style={[
                styles.infoCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={styles.infoHeader}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>{order.id}</Text>
                <Text style={[styles.orderStatus, { color: theme.primary }]}>{order.status}</Text>
              </View>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                {retailer.name} - {order.dateLabel}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>Total: {formatCurrency(order.total)}</Text>
            </InteractivePressable>
          );
        })}
      </ScrollView>
    );
  }

  // Customer profile / account summary screen.
  function renderAccount() {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle}>
        <SectionHeader
          mode={themeMode}
          title="Account"
          description="Saved customer details from the first page stay visible here."
        />
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>{signup.fullName || 'Customer'}</Text>
          <Text style={[styles.infoLine, { color: theme.subtext }]}>Email: {signup.email || 'Not added'}</Text>
          <Text style={[styles.infoLine, { color: theme.subtext }]}>Phone: {signup.phone || 'Not added'}</Text>
          <Text style={[styles.infoLine, { color: theme.subtext }]}>Address: {signup.address || 'Not added'}</Text>
        </View>
      </ScrollView>
    );
  }

  // Chooses which main screen body should be visible right now.
  function renderScreen() {
    if (screen === 'search') return renderSearch();
    if (screen === 'detail') return renderDetail();
    if (screen === 'pharmacies') return renderPharmacies();
    if (screen === 'cart') return renderCart();
    if (screen === 'prescription') return renderPrescription();
    if (screen === 'payment') return renderPayment();
    if (screen === 'delivery') return renderDelivery();
    if (screen === 'tracking') return renderTracking();
    if (screen === 'invoice') return renderInvoice();
    if (screen === 'orders') return renderOrders();
    if (screen === 'account') return renderAccount();
    return renderHome();
  }

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(themeMode)} />

      {/* Main customer app header: compact logo, theme toggle, notifications, cart, search, location */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surfaceAlt,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {isHomeScreen ? (
          <>
            <View style={styles.homeHeaderRow}>
              <View style={styles.homeLogoWrap}>
                <BrandLogo mode={themeMode} size="nav" align="start" />
              </View>
              <View style={styles.headerSearchFlex}>
                <SearchBar
                  mode={themeMode}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmit={() => setScreen('search')}
                />
              </View>
            </View>

            <View style={styles.homeUtilityRow}>
              <InteractivePressable
                onPress={() => setScreen('account')}
                style={[styles.locationBar, styles.locationBarInline]}
                hoveredStyle={{ backgroundColor: theme.surface }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <View style={styles.locationCopy}>
                  <Feather name="map-pin" size={15} color={theme.primary} />
                  <Text style={[styles.locationText, { color: theme.text }]}>
                    Deliver to {signup.address || 'your saved address'}
                  </Text>
                </View>
                <Text style={[styles.locationAction, { color: theme.primary }]}>Change</Text>
              </InteractivePressable>

              <View style={styles.headerActions}>
                <HeaderIcon
                  mode={themeMode}
                  icon={themeMode === 'dark' ? 'sun' : 'moon'}
                  onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                />
                <HeaderIcon mode={themeMode} icon="bell" onPress={() => Alert.alert('Notifications', 'Notifications panel can be added next.')} />
                <HeaderIcon mode={themeMode} icon="shopping-cart" onPress={() => setScreen('cart')} />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerTop}>
              <BrandLogo mode={themeMode} size="compact" align="start" />
              <View style={styles.headerActions}>
                <HeaderIcon
                  mode={themeMode}
                  icon={themeMode === 'dark' ? 'sun' : 'moon'}
                  onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                />
                <HeaderIcon mode={themeMode} icon="bell" onPress={() => Alert.alert('Notifications', 'Notifications panel can be added next.')} />
                <HeaderIcon mode={themeMode} icon="shopping-cart" onPress={() => setScreen('cart')} />
              </View>
            </View>

            <SearchBar
              mode={themeMode}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmit={() => setScreen('search')}
            />

            <InteractivePressable
              onPress={() => setScreen('account')}
              style={styles.locationBar}
              hoveredStyle={{ backgroundColor: theme.surface }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={styles.locationCopy}>
                <Feather name="map-pin" size={15} color={theme.primary} />
                <Text style={[styles.locationText, { color: theme.text }]}>
                  Deliver to {signup.address || 'your saved address'}
                </Text>
              </View>
              <Text style={[styles.locationAction, { color: theme.primary }]}>Change</Text>
            </InteractivePressable>
          </>
        )}
      </View>

      {/* Visible page body based on the current screen state */}
      {renderScreen()}

      {/* Sticky bottom navigation */}
      <BottomTabBar
        mode={themeMode}
        activeTab={currentTab()}
        onChange={(tab) => navigateTo(tab === 'account' ? 'account' : tab)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  splashPage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  splashWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 12,
  },
  signupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  authSub: {
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  homeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeLogoWrap: {
    width: 86,
    alignItems: 'flex-start',
  },
  headerSearchFlex: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  homeUtilityRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBar: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationBarInline: {
    marginTop: 0,
    flex: 1,
  },
  locationCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  utilityChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shortcutRow: {
    marginTop: 2,
  },
  shortcutChip: {
    minWidth: 116,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shortcutChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  horizontalRow: {
    gap: 12,
    paddingVertical: 4,
  },
  bannerCard: {
    width: 300,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 14,
    gap: 8,
  },
  bannerAccent: {
    height: 92,
    borderRadius: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 20,
    minHeight: 40,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 106,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 15,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  productThumb: {
    height: 120,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0a1624',
  },
  productTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  productMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  productPrice: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
  },
  dealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dealCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  dealThumb: {
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealThumbText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0a1624',
  },
  dealTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  dealMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  dealPrice: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
  },
  searchPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  searchCardThumb: {
    width: 112,
    height: 144,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCardThumbText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0a1624',
  },
  searchCardBody: {
    flex: 1,
  },
  searchCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  searchCardMeta: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
  },
  searchCardPrice: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '900',
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  detailThumb: {
    height: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailThumbText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0a1624',
  },
  detailTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '900',
  },
  detailSubTitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  detailPrice: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '900',
  },
  detailDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  subSectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  infoTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pharmacyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pharmacyHeaderCopy: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '800',
  },
  pharmacyPrice: {
    fontSize: 22,
    fontWeight: '900',
  },
  pharmacyMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  pharmacyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  infoLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  orderStatus: {
    fontSize: 13,
    fontWeight: '800',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  quantityValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
  },
  billBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(77, 168, 255, 0.08)',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  billText: {
    fontSize: 13,
  },
  billTotal: {
    fontSize: 16,
    fontWeight: '900',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  sortPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  trackRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  trackDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  trackCopy: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  trackMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
