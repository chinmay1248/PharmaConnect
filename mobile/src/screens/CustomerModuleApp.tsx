import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { formatCurrency, orderStepIndex } from '../utils/format';

type AppStage = 'splash' | 'signup' | 'app';
type ThemeMode = 'light' | 'dark';
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

const themes = {
  light: {
    bg: '#f4f8fc',
    surface: '#ffffff',
    surfaceMuted: '#eaf2fb',
    text: '#0b1622',
    subtext: '#4a6078',
    border: '#c7d8eb',
    primary: '#0f5ea8',
    primaryDark: '#0a3f73',
    accent: '#1c7ed6',
    buttonText: '#ffffff',
  },
  dark: {
    bg: '#08111b',
    surface: '#0f1b2a',
    surfaceMuted: '#12253a',
    text: '#e9f3ff',
    subtext: '#a9c0db',
    border: '#25415d',
    primary: '#4aa3ff',
    primaryDark: '#d8ecff',
    accent: '#63b3ff',
    buttonText: '#08111b',
  },
} as const;

function BrandLogo({ mode }: { mode: ThemeMode }) {
  const dark = mode === 'dark';
  const navy = dark ? '#d8ecff' : '#071f33';
  const teal = '#19d3bd';
  const line = dark ? '#7ec8ff' : '#0b1622';

  return (
    <View style={styles.brandBlock}>
      <View style={styles.brandPill}>
        <View style={[styles.brandHalf, { backgroundColor: dark ? '#10243a' : '#0a2134' }]}>
          <View style={[styles.chainLoop, { borderColor: teal }]} />
          <View style={[styles.chainLoop, styles.chainLoopOffset, { borderColor: teal }]} />
          <View style={[styles.chainBridge, { backgroundColor: teal }]} />
        </View>
        <View style={[styles.brandHalf, { backgroundColor: teal }]}>
          <View style={[styles.plusBar, { backgroundColor: dark ? '#10243a' : '#0a2134' }]} />
          <View style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: dark ? '#10243a' : '#0a2134' }]} />
        </View>
      </View>
      <View style={styles.brandWordmark}>
        <Text style={styles.brandWordText}>
          <Text style={{ color: navy }}>Pharma</Text>
          <Text style={{ color: teal }}>Connect</Text>
        </Text>
        <View style={styles.heartbeat}>
          <View style={[styles.heartbeatLine, { backgroundColor: line, width: 26 }]} />
          <View style={[styles.heartbeatPeak, { borderColor: line }]} />
          <View style={[styles.heartbeatPeakTall, { borderColor: line }]} />
          <View style={[styles.heartbeatPeak, styles.heartbeatPeakDown, { borderColor: line }]} />
          <View style={[styles.heartbeatLine, { backgroundColor: line, width: 28 }]} />
        </View>
      </View>
    </View>
  );
}

function HoverButton({
  themeMode,
  label,
  onPress,
  icon,
  variant = 'primary',
  style,
}: {
  themeMode: ThemeMode;
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'soft';
  style?: object;
}) {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const theme = themes[themeMode];
  const palette =
    variant === 'primary'
      ? {
          bg: theme.primary,
          borderColor: theme.primary,
          color: theme.buttonText,
        }
      : variant === 'soft'
        ? {
            bg: theme.surfaceMuted,
            borderColor: theme.border,
            color: theme.primaryDark,
          }
        : {
            bg: theme.surface,
            borderColor: theme.border,
            color: theme.primaryDark,
          };

  function animateTo(value: number) {
    Animated.timing(scale, {
      toValue: value,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          animateTo(1.035);
        }}
        onHoverOut={() => {
          setHovered(false);
          animateTo(1);
        }}
        onPressIn={() => animateTo(0.985)}
        onPressOut={() => animateTo(hovered ? 1.035 : 1)}
        style={[
          styles.buttonBase,
          {
            backgroundColor: palette.bg,
            borderColor: palette.borderColor,
          },
          style,
        ]}
      >
        {icon}
        <Text style={[styles.buttonLabel, { color: palette.color }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({
  themeMode,
  title,
  action,
}: {
  themeMode: ThemeMode;
  title: string;
  action?: string;
}) {
  const theme = themes[themeMode];

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action ? <Text style={[styles.sectionAction, { color: theme.primary }]}>{action}</Text> : null}
    </View>
  );
}

function SearchBar({
  themeMode,
  value,
  onChangeText,
  placeholder,
  onPress,
}: {
  themeMode: ThemeMode;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder: string;
  onPress?: () => void;
}) {
  const theme = themes[themeMode];

  const body = (
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
        placeholder={placeholder}
        placeholderTextColor={theme.subtext}
        style={[styles.searchInput, { color: theme.text }]}
      />
      <Feather name="camera" size={18} color={theme.primary} />
      <Feather name="mic" size={18} color={theme.primary} />
    </View>
  );

  if (!onPress) {
    return body;
  }

  return <Pressable onPress={onPress}>{body}</Pressable>;
}

function BottomNav({
  mode,
  active,
  onChange,
}: {
  mode: ThemeMode;
  active: Screen;
  onChange: (screen: Screen) => void;
}) {
  const theme = themes[mode];
  const items: { id: Screen; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'orders', label: 'Orders', icon: 'package' },
    { id: 'cart', label: 'Cart', icon: 'shopping-cart' },
    { id: 'account', label: 'You', icon: 'user' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {items.map((item) => {
        const selected = active === item.id;

        return (
          <Pressable key={item.id} style={styles.bottomNavItem} onPress={() => onChange(item.id)}>
            <Feather name={item.icon} size={18} color={selected ? theme.primary : theme.subtext} />
            <Text style={[styles.bottomNavText, { color: selected ? theme.primary : theme.subtext }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CustomerModuleApp() {
  const [stage, setStage] = useState<AppStage>('splash');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
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
  const [signup, setSignup] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (stage !== 'splash') {
      return;
    }

    const animation = Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(650),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1.04,
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
  }, [stage]);

  const theme = themes[themeMode];
  const selectedMedicine =
    medicines.find((item) => item.id === selectedMedicineId) ?? medicines[0];

  const filteredMedicineIds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return medicines
      .filter((medicine) => {
        if (!query) {
          return true;
        }

        return (
          medicine.brandName.toLowerCase().includes(query) ||
          medicine.genericName.toLowerCase().includes(query) ||
          medicine.company.toLowerCase().includes(query)
        );
      })
      .map((medicine) => medicine.id);
  }, [searchQuery]);

  const sortedPharmacies = useMemo(() => {
    const list = retailers
      .map((retailer) => {
        const stock = retailer.stocks.find((item) => item.medicineId === selectedMedicine.id);
        if (!stock) {
          return null;
        }

        return { retailer, stock };
      })
      .filter(Boolean) as { retailer: (typeof retailers)[number]; stock: { medicineId: string; price: number; stockQty: number } }[];

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

  function goToMedicine(medicineId: string) {
    setSelectedMedicineId(medicineId);
    setScreen('detail');
  }

  function openPharmacies(medicineId: string) {
    setSelectedMedicineId(medicineId);
    setScreen('pharmacies');
  }

  function selectPharmacy(retailerId: string) {
    setCart({
      medicineId: selectedMedicine.id,
      retailerId,
      quantity: 1,
    });
    setScreen('cart');
  }

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

  function placeOrder() {
    if (!cart || !paymentMethod || !deliveryMethod) {
      return;
    }

    const retailer = retailers.find((item) => item.id === cart.retailerId) ?? retailers[0];
    const price = retailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ?? selectedMedicine.salePrice;
    const deliveryFee = deliveryMethod === 'home' ? 20 : 0;
    const subtotal = price * cart.quantity;
    const total = subtotal + deliveryFee;
    const orderId = `ORD-${2200 + orders.length * 13}`;

    setOrders([
      {
        id: orderId,
        retailerId: retailer.id,
        dateLabel: 'Just now',
        status: 'Confirmed',
        total,
        items: [{ medicineId: cart.medicineId, quantity: cart.quantity, unitPrice: price }],
      },
      ...orders,
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

  if (stage === 'splash') {
    return (
      <SafeAreaView style={[styles.page, styles.splashScreenWhite]}>
        <StatusBar style="dark" />
        <Animated.View
          style={[
            styles.splashAnimatedWrap,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}
        >
          <BrandLogo mode="light" />
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (stage === 'signup') {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authTopRow}>
            <BrandLogo mode={themeMode} />
            <Pressable onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
              {themeMode === 'light' ? (
                <Feather name="moon" size={20} color={theme.primary} />
              ) : (
                <Feather name="sun" size={20} color={theme.primary} />
              )}
            </Pressable>
          </View>
          <View style={[styles.authCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.authTitle, { color: theme.text }]}>Create your customer account</Text>
            <Text style={[styles.authSub, { color: theme.subtext }]}>
              Start with your personal details, then search medicines, compare pharmacies, and order.
            </Text>
            <TextInput
              value={signup.fullName}
              onChangeText={(value) => setSignup({ ...signup, fullName: value })}
              placeholder="Full name"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={signup.email}
              onChangeText={(value) => setSignup({ ...signup, email: value })}
              placeholder="Email address"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={signup.password}
              onChangeText={(value) => setSignup({ ...signup, password: value })}
              placeholder="Password"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={signup.phone}
              onChangeText={(value) => setSignup({ ...signup, phone: value })}
              placeholder="Phone number"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={signup.address}
              onChangeText={(value) => setSignup({ ...signup, address: value })}
              placeholder="Address"
              placeholderTextColor={theme.subtext}
              multiline
              style={[
                styles.input,
                styles.inputMultiline,
                { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border },
              ]}
            />
            <HoverButton
              themeMode={themeMode}
              label="Continue to app"
              onPress={() => setStage('app')}
              icon={<Feather name="arrow-right" size={16} color={theme.buttonText} />}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cartMedicine = cart
    ? medicines.find((item) => item.id === cart.medicineId) ?? medicines[0]
    : null;
  const cartRetailer = cart
    ? retailers.find((item) => item.id === cart.retailerId) ?? retailers[0]
    : null;
  const cartUnitPrice =
    cart && cartRetailer
      ? cartRetailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ??
        cartMedicine?.salePrice ??
        0
      : 0;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.headerBand, { backgroundColor: theme.surfaceMuted, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <BrandLogo mode={themeMode} />
          <View style={styles.headerActions}>
            <Pressable onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
              {themeMode === 'light' ? (
                <Feather name="moon" size={20} color={theme.primary} />
              ) : (
                <Feather name="sun" size={20} color={theme.primary} />
              )}
            </Pressable>
            <Feather name="bell" size={20} color={theme.primary} />
            <Feather name="shopping-cart" size={20} color={theme.primary} />
          </View>
        </View>
        <SearchBar
          themeMode={themeMode}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search medicines, salts or ask a question"
          onPress={screen === 'home' ? () => setScreen('search') : undefined}
        />
        <View style={styles.locationRow}>
          <View style={styles.locationLabelWrap}>
            <Feather name="map-pin" size={16} color={theme.primary} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              Deliver to {signup.address || 'your saved address'}
            </Text>
          </View>
          <Text style={[styles.locationLink, { color: theme.primary }]}>Change</Text>
        </View>
      </View>

      {screen === 'home' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.utilityRow}>
            {quickServices.map((service) => (
              <View
                key={service.id}
                style={[
                  styles.utilityService,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.utilityServiceDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.utilityServiceText, { color: theme.text }]}>{service.title}</Text>
              </View>
            ))}
          </View>

          <View style={styles.shortcutRow}>
            {shortcutChips.map((chip) => (
              <HoverButton
                key={chip.id}
                themeMode={themeMode}
                label={chip.title}
                variant="secondary"
                onPress={() => {
                  if (chip.title === 'Orders') setScreen('orders');
                  if (chip.title === 'Account') setScreen('account');
                }}
                style={styles.shortcutButton}
              />
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRow}>
            {banners.map((banner) => (
              <View
                key={banner.id}
                style={[
                  styles.bannerCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.bannerAccent, { backgroundColor: banner.accent }]} />
                <Text style={[styles.bannerTitle, { color: theme.text }]}>{banner.title}</Text>
                <Text style={[styles.bannerText, { color: theme.subtext }]}>{banner.subtitle}</Text>
                <HoverButton themeMode={themeMode} label="Explore" variant="soft" onPress={() => setScreen('search')} />
              </View>
            ))}
          </ScrollView>

          <SectionHeader themeMode={themeMode} title="Top categories for you" />
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <View
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.tint }]} />
                <Text style={[styles.categoryLabel, { color: theme.text }]}>{category.title}</Text>
              </View>
            ))}
          </View>

          <SectionHeader themeMode={themeMode} title="Reorder previous medicines" action="See all" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
            {medicines.slice(0, 3).map((medicine) => (
              <Pressable
                key={medicine.id}
                onPress={() => goToMedicine(medicine.id)}
                style={[
                  styles.productTile,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.productThumb, { backgroundColor: medicine.imageColor }]}>
                  <Text style={[styles.productThumbText, { color: theme.primaryDark }]}>
                    {medicine.genericName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={2} style={[styles.productTitle, { color: theme.text }]}>
                  {medicine.brandName}
                </Text>
                <Text style={[styles.productMeta, { color: theme.subtext }]}>
                  {medicine.monthlyOrders}
                </Text>
                <Text style={[styles.productPrice, { color: theme.text }]}>
                  {formatCurrency(medicine.salePrice)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionHeader themeMode={themeMode} title="Nearby pharmacy deals" action="See all" />
          <View style={styles.dealGrid}>
            {medicines.map((medicine) => (
              <Pressable
                key={medicine.id}
                onPress={() => goToMedicine(medicine.id)}
                style={[
                  styles.dealCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.dealThumb, { backgroundColor: medicine.imageColor }]}>
                  <Text style={[styles.dealThumbText, { color: theme.primaryDark }]}>
                    {medicine.genericName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={2} style={[styles.dealTitle, { color: theme.text }]}>
                  {medicine.brandName}
                </Text>
                <Text style={[styles.dealPrice, { color: theme.text }]}>{formatCurrency(medicine.salePrice)}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {screen === 'search' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Search medicines" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            {['Closest pharmacy', 'Cheapest', 'Best rating', 'Generic', 'Rx required'].map((label) => (
              <View
                key={label}
                style={[
                  styles.pill,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.pillText, { color: theme.text }]}>{label}</Text>
              </View>
            ))}
          </ScrollView>
          {!searchQuery ? (
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Recent searches</Text>
              {recentSearches.map((item) => (
                <Text key={item} style={[styles.infoLine, { color: theme.subtext }]}>
                  {item}
                </Text>
              ))}
            </View>
          ) : null}
          {filteredMedicineIds.map((medicineId) => {
            const medicine = medicines.find((item) => item.id === medicineId) ?? medicines[0];
            const discount = Math.round(((medicine.mrp - medicine.salePrice) / medicine.mrp) * 100);

            return (
              <Pressable
                key={medicineId}
                onPress={() => goToMedicine(medicineId)}
                style={[
                  styles.searchCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.searchCardThumb, { backgroundColor: medicine.imageColor }]}>
                  <Text style={[styles.searchCardThumbText, { color: theme.primaryDark }]}>
                    {medicine.genericName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.searchCardBody}>
                  <Text numberOfLines={3} style={[styles.searchCardTitle, { color: theme.text }]}>
                    {medicine.brandName} {medicine.packSize} {medicine.dosage}
                  </Text>
                  <Text style={[styles.searchCardMeta, { color: theme.subtext }]}>
                    {medicine.rating} stars ({medicine.reviewCount}) • {medicine.monthlyOrders}
                  </Text>
                  <Text style={[styles.searchCardPrice, { color: theme.text }]}>
                    {formatCurrency(medicine.salePrice)}
                  </Text>
                  <Text style={[styles.searchCardStrike, { color: theme.subtext }]}>
                    MRP {formatCurrency(medicine.mrp)} • {discount}% off
                  </Text>
                  <View style={styles.inlineButtons}>
                    <HoverButton
                      themeMode={themeMode}
                      label="View"
                      variant="secondary"
                      onPress={() => goToMedicine(medicine.id)}
                      icon={<Feather name="eye" size={15} color={theme.primaryDark} />}
                    />
                    <HoverButton
                      themeMode={themeMode}
                      label="Add"
                      onPress={() => openPharmacies(medicine.id)}
                      icon={<Feather name="shopping-cart" size={15} color={theme.buttonText} />}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {screen === 'detail' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.detailThumb, { backgroundColor: selectedMedicine.imageColor }]}>
              <Text style={[styles.detailThumbText, { color: theme.primaryDark }]}>
                {selectedMedicine.genericName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedMedicine.brandName}</Text>
            <Text style={[styles.detailSubTitle, { color: theme.subtext }]}>
              {selectedMedicine.genericName} • {selectedMedicine.dosage} • {selectedMedicine.packSize}
            </Text>
            <Text style={[styles.detailSubTitle, { color: theme.subtext }]}>
              {selectedMedicine.diseases.join(', ')}
            </Text>
            <Text style={[styles.detailPrice, { color: theme.text }]}>
              {formatCurrency(selectedMedicine.salePrice)}
            </Text>
            <Text style={[styles.detailSubTitle, { color: theme.subtext }]}>
              MRP {formatCurrency(selectedMedicine.mrp)} • {selectedMedicine.monthlyOrders}
            </Text>
            <Text style={[styles.detailDescription, { color: theme.subtext }]}>
              {selectedMedicine.description}
            </Text>
            <View style={styles.inlineButtons}>
              <HoverButton
                themeMode={themeMode}
                label="See pharmacies"
                onPress={() => openPharmacies(selectedMedicine.id)}
                icon={<Feather name="map-pin" size={15} color={theme.buttonText} />}
              />
              <HoverButton
                themeMode={themeMode}
                label="Back"
                variant="secondary"
                onPress={() => setScreen('home')}
                icon={<Feather name="arrow-left" size={15} color={theme.primaryDark} />}
              />
            </View>
          </View>
        </ScrollView>
      ) : null}

      {screen === 'pharmacies' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Choose pharmacy" action="Sort" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            {[
              { id: 'closest', label: 'Closest pharmacy' },
              { id: 'cheapest', label: 'Cheapest' },
              { id: 'rating', label: 'Highest rating' },
            ].map((item) => {
              const active = sortBy === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSortBy(item.id as PharmacySort)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? theme.buttonText : theme.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {sortedPharmacies.map((entry) => (
            <View
              key={entry.retailer.id}
              style={[
                styles.infoCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.infoCardTop}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>{entry.retailer.name}</Text>
                <Text style={[styles.infoLineStrong, { color: theme.primary }]}>
                  {formatCurrency(entry.stock.price)}
                </Text>
              </View>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                {entry.retailer.area} • {entry.retailer.distanceKm} km • Rating {entry.retailer.rating}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Stock {entry.stock.stockQty} • {entry.retailer.deliveryAvailable ? entry.retailer.deliveryTime : 'Pickup only'}
              </Text>
              <HoverButton
                themeMode={themeMode}
                label="Select pharmacy"
                onPress={() => selectPharmacy(entry.retailer.id)}
                icon={<Feather name="check-circle" size={15} color={theme.buttonText} />}
                style={styles.fullWidthButton}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {screen === 'cart' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Review order" />
          {cart && cartMedicine && cartRetailer ? (
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.infoCardTop}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>{cartMedicine.brandName}</Text>
                <Text style={[styles.infoLineStrong, { color: theme.primary }]}>
                  {formatCurrency(cartUnitPrice * cart.quantity)}
                </Text>
              </View>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                {cartMedicine.genericName} • {cartMedicine.packSize} • {cartMedicine.dosage}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Pharmacy: {cartRetailer.name} • {cartRetailer.area}
              </Text>
              <Text style={[styles.infoLine, { color: theme.subtext }]}>
                Prescription: {cartMedicine.prescriptionRequired ? 'Required' : 'Not required'}
              </Text>
              <View style={styles.quantityRow}>
                <HoverButton
                  themeMode={themeMode}
                  label="-"
                  variant="secondary"
                  onPress={() => setCart({ ...cart, quantity: Math.max(1, cart.quantity - 1) })}
                />
                <Text style={[styles.quantityText, { color: theme.text }]}>{cart.quantity}</Text>
                <HoverButton
                  themeMode={themeMode}
                  label="+"
                  variant="secondary"
                  onPress={() => setCart({ ...cart, quantity: cart.quantity + 1 })}
                />
              </View>
              <HoverButton
                themeMode={themeMode}
                label={cartMedicine.prescriptionRequired ? 'Continue to prescription' : 'Continue to payment'}
                onPress={continueCheckout}
                icon={<Feather name="arrow-right-circle" size={15} color={theme.buttonText} />}
                style={styles.fullWidthButton}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {screen === 'prescription' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Upload prescription" />
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>Prescription required</Text>
            <Text style={[styles.infoLine, { color: theme.subtext }]}>
              This medicine needs prescription approval before payment, exactly like your Obsidian flow.
            </Text>
            <View style={styles.inlineButtons}>
              <HoverButton
                themeMode={themeMode}
                label={prescriptionUploaded ? 'Prescription uploaded' : 'Upload prescription'}
                onPress={() => setPrescriptionUploaded(true)}
                icon={<Feather name="upload" size={15} color={theme.buttonText} />}
              />
              <HoverButton
                themeMode={themeMode}
                label="Continue"
                variant="secondary"
                onPress={() => setScreen('payment')}
                icon={<Feather name="arrow-right" size={15} color={theme.primaryDark} />}
              />
            </View>
          </View>
        </ScrollView>
      ) : null}

      {screen === 'payment' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Select payment option" />
          <View style={styles.optionGrid}>
            {[
              { id: 'upi', label: 'UPI', icon: 'smartphone' },
              { id: 'card', label: 'Card', icon: 'credit-card' },
              { id: 'bank', label: 'Bank', icon: 'briefcase' },
              { id: 'cod', label: 'Cash', icon: 'dollar-sign' },
            ].map((item) => {
              const active = paymentMethod === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setPaymentMethod(item.id as PaymentMethod)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: active ? theme.surfaceMuted : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather name={item.icon as keyof typeof Feather.glyphMap} size={20} color={theme.primary} />
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <HoverButton
            themeMode={themeMode}
            label="Continue to delivery"
            onPress={() => setScreen('delivery')}
            icon={<Feather name="truck" size={15} color={theme.buttonText} />}
            style={styles.fullWidthButton}
          />
        </ScrollView>
      ) : null}

      {screen === 'delivery' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Choose delivery option" />
          <View style={styles.optionGrid}>
            {[
              { id: 'home', label: 'Home delivery', icon: 'truck' },
              { id: 'pickup', label: 'Pickup from pharmacy', icon: 'map-pin' },
            ].map((item) => {
              const active = deliveryMethod === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setDeliveryMethod(item.id as DeliveryMethod)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: active ? theme.surfaceMuted : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather name={item.icon as keyof typeof Feather.glyphMap} size={20} color={theme.primary} />
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <HoverButton
            themeMode={themeMode}
            label="Place order"
            onPress={placeOrder}
            icon={<Feather name="check" size={15} color={theme.buttonText} />}
            style={styles.fullWidthButton}
          />
        </ScrollView>
      ) : null}

      {screen === 'tracking' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title={`Track ${orders[0].id}`} />
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {['Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'].map((step, index) => {
              const active = index <= orderStepIndex(orders[0].status);
              return (
                <View key={step} style={styles.trackRow}>
                  <View
                    style={[
                      styles.trackDot,
                      { backgroundColor: active ? theme.primary : theme.border },
                    ]}
                  />
                  <View style={styles.trackContent}>
                    <Text style={[styles.trackTitle, { color: active ? theme.text : theme.subtext }]}>
                      {step}
                    </Text>
                    <Text style={[styles.trackMeta, { color: theme.subtext }]}>
                      {active ? 'Visible in your customer app' : 'Waiting for next step'}
                    </Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.inlineButtons}>
              <HoverButton
                themeMode={themeMode}
                label="View invoice"
                onPress={() => setScreen('invoice')}
                icon={<Feather name="file-text" size={15} color={theme.buttonText} />}
              />
              <HoverButton
                themeMode={themeMode}
                label="Orders"
                variant="secondary"
                onPress={() => setScreen('orders')}
                icon={<Feather name="package" size={15} color={theme.primaryDark} />}
              />
            </View>
          </View>
        </ScrollView>
      ) : null}

      {screen === 'invoice' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Invoice and bill" />
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {invoice ? (
              <>
                <Text style={[styles.infoTitle, { color: theme.text }]}>
                  Invoice {invoice.invoiceNo}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Order {invoice.orderId}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Medicine: {medicines.find((item) => item.id === invoice.medicineId)?.brandName}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Pharmacy: {retailers.find((item) => item.id === invoice.retailerId)?.name}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Quantity: {invoice.quantity}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Payment: {invoice.paymentMethod.toUpperCase()}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Delivery: {invoice.deliveryMethod === 'home' ? 'Home delivery' : 'Pickup from pharmacy'}
                </Text>
                <View style={styles.billLines}>
                  <View style={styles.billRow}>
                    <Text style={[styles.billText, { color: theme.subtext }]}>Subtotal</Text>
                    <Text style={[styles.billText, { color: theme.text }]}>{formatCurrency(invoice.subtotal)}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={[styles.billText, { color: theme.subtext }]}>Delivery</Text>
                    <Text style={[styles.billText, { color: theme.text }]}>{formatCurrency(invoice.deliveryFee)}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={[styles.billTotal, { color: theme.text }]}>Total bill</Text>
                    <Text style={[styles.billTotal, { color: theme.text }]}>{formatCurrency(invoice.total)}</Text>
                  </View>
                </View>
                <HoverButton
                  themeMode={themeMode}
                  label="Download invoice"
                  onPress={() =>
                    Alert.alert('Download started', 'This prototype now shows the invoice action. Real PDF download comes with backend integration.')
                  }
                  icon={<Feather name="download" size={15} color={theme.buttonText} />}
                  style={styles.fullWidthButton}
                />
              </>
            ) : (
              <Text style={[styles.infoLine, { color: theme.subtext }]}>No invoice generated yet.</Text>
            )}
          </View>
        </ScrollView>
      ) : null}

      {screen === 'orders' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Your orders" />
          {orders.map((order) => {
            const retailer = retailers.find((item) => item.id === order.retailerId) ?? retailers[0];
            return (
              <View
                key={order.id}
                style={[
                  styles.infoCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.infoCardTop}>
                  <Text style={[styles.infoTitle, { color: theme.text }]}>{order.id}</Text>
                  <Text style={[styles.infoLineStrong, { color: theme.primary }]}>{order.status}</Text>
                </View>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  {retailer.name} • {order.dateLabel}
                </Text>
                <Text style={[styles.infoLine, { color: theme.subtext }]}>
                  Total {formatCurrency(order.total)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {screen === 'account' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SectionHeader themeMode={themeMode} title="Account" />
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>{signup.fullName || 'Customer'}</Text>
            <Text style={[styles.infoLine, { color: theme.subtext }]}>Email: {signup.email || 'Not added'}</Text>
            <Text style={[styles.infoLine, { color: theme.subtext }]}>Phone: {signup.phone || 'Not added'}</Text>
            <Text style={[styles.infoLine, { color: theme.subtext }]}>Address: {signup.address || 'Not added'}</Text>
          </View>
        </ScrollView>
      ) : null}

      <BottomNav
        mode={themeMode}
        active={screen === 'detail' || screen === 'pharmacies' || screen === 'prescription' || screen === 'payment' || screen === 'delivery' || screen === 'tracking' || screen === 'invoice' ? 'home' : screen}
        onChange={setScreen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  splashScreenWhite: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashAnimatedWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPill: {
    width: 256,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  brandHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainLoop: {
    position: 'absolute',
    width: 42,
    height: 24,
    borderRadius: 12,
    borderWidth: 5,
    transform: [{ rotate: '-42deg' }, { translateX: -10 }],
  },
  chainLoopOffset: {
    transform: [{ rotate: '-42deg' }, { translateX: 12 }],
  },
  chainBridge: {
    width: 28,
    height: 8,
    borderRadius: 999,
    transform: [{ rotate: '-42deg' }],
  },
  plusBar: {
    width: 46,
    height: 10,
    borderRadius: 999,
  },
  plusBarVertical: {
    position: 'absolute',
    transform: [{ rotate: '90deg' }],
  },
  brandWordmark: {
    marginTop: 18,
    alignItems: 'center',
  },
  brandWordText: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heartbeat: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  heartbeatLine: {
    height: 2,
    borderRadius: 999,
  },
  heartbeatPeak: {
    width: 16,
    height: 16,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    marginHorizontal: -1,
  },
  heartbeatPeakTall: {
    width: 24,
    height: 24,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    marginHorizontal: -2,
  },
  heartbeatPeakDown: {
    transform: [{ rotate: '135deg' }],
  },
  splashTitle: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '900',
  },
  splashText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
  authScroll: {
    padding: 16,
    gap: 16,
  },
  authTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  authSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
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
  headerBand: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  locationRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 100,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  utilityService: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityServiceDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  utilityServiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  shortcutButton: {
    minWidth: 120,
  },
  bannerRow: {
    gap: 10,
    paddingTop: 18,
    paddingBottom: 4,
  },
  bannerCard: {
    width: 300,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  bannerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 92,
  },
  bannerTitle: {
    marginTop: 54,
    fontSize: 24,
    fontWeight: '800',
  },
  bannerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '22%',
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  horizontalCards: {
    gap: 10,
  },
  productTile: {
    width: 170,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  productThumb: {
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbText: {
    fontSize: 28,
    fontWeight: '900',
  },
  productTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  productMeta: {
    marginTop: 5,
    fontSize: 12,
  },
  productPrice: {
    marginTop: 7,
    fontSize: 22,
    fontWeight: '800',
  },
  dealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dealCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  dealThumb: {
    height: 88,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealThumbText: {
    fontSize: 24,
    fontWeight: '900',
  },
  dealTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  dealPrice: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
  },
  sortRow: {
    gap: 8,
    paddingBottom: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  infoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  infoLine: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  infoLineStrong: {
    fontSize: 14,
    fontWeight: '800',
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  searchCardThumb: {
    width: 112,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCardThumbText: {
    fontSize: 28,
    fontWeight: '900',
  },
  searchCardBody: {
    flex: 1,
  },
  searchCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  searchCardMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  searchCardPrice: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
  },
  searchCardStrike: {
    marginTop: 3,
    fontSize: 12,
  },
  inlineButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  detailThumb: {
    height: 220,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailThumbText: {
    fontSize: 46,
    fontWeight: '900',
  },
  detailTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
  },
  detailSubTitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  detailPrice: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '900',
  },
  detailDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullWidthButton: {
    alignSelf: 'stretch',
    marginTop: 14,
  },
  trackRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  trackDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  trackContent: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  trackMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  billLines: {
    marginTop: 14,
    gap: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  billText: {
    fontSize: 13,
  },
  billTotal: {
    fontSize: 16,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bottomNavText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonBase: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
});
