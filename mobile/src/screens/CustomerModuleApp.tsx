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
import { formatCustomerAddress, signupOrLoginCustomer, validateSignupState } from '../services/customerAuth';
import { fetchCustomerInvoice, fetchCustomerOrderDetail, fetchCustomerOrders } from '../services/customerOrders';
import { fetchCatalogueMedicines, fetchMedicineDetail, fetchMedicineRetailers, searchMedicines } from '../services/medicineDiscovery';
import { buildCustomerOrderContext, createCustomerOrder } from '../services/orderFlow';
import { uploadCustomerPrescription } from '../services/prescriptions';
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
  SortedPharmacy,
  Screen,
  CustomerSession,
  CustomerOrderSummary,
  CustomerOrderTrackingState,
  PrescriptionUpload,
  SignupState,
} from './customer/customerTypes';
import { customerStyles } from './customer/customerStyles';

function filterMockMedicines(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return medicines.filter((medicine) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      medicine.brandName.toLowerCase().includes(normalizedQuery) ||
      medicine.genericName.toLowerCase().includes(normalizedQuery) ||
      medicine.company.toLowerCase().includes(normalizedQuery) ||
      medicine.diseases.some((disease) => disease.toLowerCase().includes(normalizedQuery))
    );
  });
}

function sortMockPharmacies(medicineId: string, sortBy: PharmacySort) {
  const list = retailers
    .map((retailer) => {
      const stock = retailer.stocks.find((item) => item.medicineId === medicineId);
      return stock ? { retailer, stock } : null;
    })
    .filter((item): item is SortedPharmacy => item !== null);

  return list.sort((a, b) => {
    if (sortBy === 'cheapest') {
      return a.stock.price - b.stock.price;
    }

    if (sortBy === 'rating') {
      return b.retailer.rating - a.retailer.rating;
    }

    return (a.retailer.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.retailer.distanceKm ?? Number.MAX_SAFE_INTEGER);
  });
}

function mapMockOrderToSummary(order: (typeof initialOrders)[number]): CustomerOrderSummary {
  return {
    id: order.id,
    retailerId: order.retailerId,
    dateLabel: order.dateLabel,
    status: order.status,
    total: order.total,
    items: order.items,
    paymentStatus: 'PENDING',
    prescriptionStatus: 'NOT_REQUIRED',
    invoiceId: null,
    invoiceNumber: null,
  };
}

function mapSummaryToTracking(order: CustomerOrderSummary): CustomerOrderTrackingState {
  return {
    ...order,
    deliveryMethod: 'home',
    trackingEvents: [
      {
        id: `${order.id}-placed`,
        statusLabel: 'Order placed',
        notes: 'Visible in the local prototype timeline.',
      },
    ],
    rejectionReason: null,
  };
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
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [sortBy, setSortBy] = useState<PharmacySort>('closest');
  const [cart, setCart] = useState<CartState | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(null);
  const [prescriptionUploaded, setPrescriptionUploaded] = useState(false);
  const [prescriptionUpload, setPrescriptionUpload] = useState<PrescriptionUpload | null>(null);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>(() => initialOrders.map(mapMockOrderToSummary));
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialOrders[0]?.id ?? null);
  const [activeOrder, setActiveOrder] = useState<CustomerOrderTrackingState | null>(() =>
    initialOrders[0] ? mapSummaryToTracking(mapMockOrderToSummary(initialOrders[0])) : null,
  );
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [catalogueMedicines, setCatalogueMedicines] = useState(medicines);
  const [searchResults, setSearchResults] = useState(medicines);
  const [detailMedicinesById, setDetailMedicinesById] = useState<Record<string, (typeof medicines)[number]>>({});
  const [liveSortedPharmacies, setLiveSortedPharmacies] = useState<SortedPharmacy[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retailerLoading, setRetailerLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [searchHelperText, setSearchHelperText] = useState<string | null>(null);
  const [detailHelperText, setDetailHelperText] = useState<string | null>(null);
  const [retailerHelperText, setRetailerHelperText] = useState<string | null>(null);
  const [ordersHelperText, setOrdersHelperText] = useState<string | null>(null);
  const [trackingHelperText, setTrackingHelperText] = useState<string | null>(null);
  const [invoiceHelperText, setInvoiceHelperText] = useState<string | null>(null);
  const [prescriptionHelperText, setPrescriptionHelperText] = useState<string | null>(null);
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null);
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

  useEffect(() => {
    if (stage !== 'app') {
      return;
    }

    let active = true;
    setCatalogueLoading(true);
    setSearchHelperText(null);

    fetchCatalogueMedicines()
      .then((liveCatalogue) => {
        if (!active || !liveCatalogue.length) {
          return;
        }

        setCatalogueMedicines(liveCatalogue);
        setSearchResults((current) => (searchQuery.trim() ? current : liveCatalogue));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setCatalogueMedicines(medicines);
        setSearchHelperText('Showing the local prototype catalogue until the backend API is reachable.');
      })
      .finally(() => {
        if (active) {
          setCatalogueLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [stage]);

  useEffect(() => {
    if (!catalogueMedicines.length) {
      return;
    }

    const currentSelectionExists = catalogueMedicines.some((medicine) => medicine.id === selectedMedicineId);

    if (!selectedMedicineId || !currentSelectionExists) {
      setSelectedMedicineId(catalogueMedicines[0].id);
    }
  }, [catalogueMedicines, selectedMedicineId]);

  useEffect(() => {
    if (stage !== 'app') {
      return;
    }

    const query = searchQuery.trim();

    if (!query) {
      setSearchResults(catalogueMedicines);
      setSearchLoading(catalogueLoading);
      return;
    }

    let active = true;
    const timeoutId = setTimeout(() => {
      setSearchLoading(true);
      setSearchHelperText(null);

      searchMedicines(query)
        .then((results) => {
          if (!active) {
            return;
          }

          setSearchResults(results);
        })
        .catch(() => {
          if (!active) {
            return;
          }

          setSearchResults(filterMockMedicines(query));
          setSearchHelperText('Showing mock search results because the live discovery API could not be reached.');
        })
        .finally(() => {
          if (active) {
            setSearchLoading(false);
          }
        });
    }, 260);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [catalogueLoading, catalogueMedicines, searchQuery, stage]);

  useEffect(() => {
    if (stage !== 'app' || !selectedMedicineId) {
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailHelperText(null);

    fetchMedicineDetail(selectedMedicineId)
      .then((medicine) => {
        if (!active) {
          return;
        }

        setDetailMedicinesById((current) => ({
          ...current,
          [medicine.id]: medicine,
        }));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setDetailHelperText('Showing prototype details until this medicine is fully synced with the backend.');
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedMedicineId, stage]);

  useEffect(() => {
    if (stage !== 'app' || screen !== 'pharmacies' || !selectedMedicineId) {
      return;
    }

    let active = true;
    setRetailerLoading(true);
    setRetailerHelperText(null);
    setLiveSortedPharmacies([]);

    fetchMedicineRetailers(selectedMedicineId, sortBy)
      .then((pharmacies) => {
        if (!active) {
          return;
        }

        setLiveSortedPharmacies(pharmacies);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setLiveSortedPharmacies(sortMockPharmacies(selectedMedicineId, sortBy));
        setRetailerHelperText('Showing prototype retailer comparison because live stock data is not available right now.');
      })
      .finally(() => {
        if (active) {
          setRetailerLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [screen, selectedMedicineId, sortBy, stage]);

  useEffect(() => {
    if (stage !== 'app' || !customerSession) {
      return;
    }

    let active = true;
    setOrdersLoading(true);
    setOrdersHelperText(null);

    fetchCustomerOrders(customerSession.user.id)
      .then((liveOrders) => {
        if (!active) {
          return;
        }

        if (liveOrders.length) {
          setOrders(liveOrders);
          setActiveOrderId((current) =>
            current && liveOrders.some((order) => order.id === current) ? current : liveOrders[0].id,
          );
        } else {
          setOrders([]);
          setActiveOrderId(null);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setOrders(initialOrders.map(mapMockOrderToSummary));
        setOrdersHelperText('Showing local order history until the backend order list is reachable.');
      })
      .finally(() => {
        if (active) {
          setOrdersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [customerSession, stage]);

  useEffect(() => {
    if (stage !== 'app') {
      return;
    }

    if (!activeOrderId) {
      setActiveOrder(null);
      return;
    }

    const fallbackSummary = orders.find((order) => order.id === activeOrderId);

    if (!customerSession) {
      setActiveOrder(fallbackSummary ? mapSummaryToTracking(fallbackSummary) : null);
      return;
    }

    let active = true;
    setTrackingLoading(true);
    setTrackingHelperText(null);

    fetchCustomerOrderDetail(activeOrderId)
      .then((detail) => {
        if (!active) {
          return;
        }

        setActiveOrder(detail);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setActiveOrder(fallbackSummary ? mapSummaryToTracking(fallbackSummary) : null);
        setTrackingHelperText('Showing the local tracking timeline until the backend order detail API is reachable.');
      })
      .finally(() => {
        if (active) {
          setTrackingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeOrderId, customerSession, orders, stage]);

  useEffect(() => {
    if (stage !== 'app' || screen !== 'invoice') {
      return;
    }

    if (!activeOrderId) {
      setInvoice(null);
      return;
    }

    if (!customerSession) {
      return;
    }

    let active = true;
    setInvoiceLoading(true);
    setInvoiceHelperText(null);

    fetchCustomerInvoice(activeOrderId)
      .then((liveInvoice) => {
        if (!active || !liveInvoice) {
          return;
        }

        setInvoice(liveInvoice);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setInvoiceHelperText('Showing the current prototype invoice because the live invoice API is unavailable right now.');
      })
      .finally(() => {
        if (active) {
          setInvoiceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeOrderId, customerSession, screen, stage]);

  const allKnownMedicines = useMemo(() => {
    const entries = [...medicines, ...catalogueMedicines, ...searchResults, ...Object.values(detailMedicinesById)];
    const byId = new Map(entries.map((medicine) => [medicine.id, medicine]));

    return Array.from(byId.values());
  }, [catalogueMedicines, detailMedicinesById, searchResults]);

  const selectedMedicine = useMemo(
    () => allKnownMedicines.find((medicine) => medicine.id === selectedMedicineId) ?? allKnownMedicines[0] ?? medicines[0],
    [allKnownMedicines, selectedMedicineId],
  );

  const fallbackSortedPharmacies = useMemo(
    () => sortMockPharmacies(selectedMedicine.id, sortBy),
    [selectedMedicine.id, sortBy],
  );

  const sortedPharmacies = useMemo(() => {
    if (liveSortedPharmacies.length) {
      return liveSortedPharmacies;
    }

    return fallbackSortedPharmacies;
  }, [fallbackSortedPharmacies, liveSortedPharmacies]);

  const allKnownRetailers = useMemo(() => {
    const entries = [...retailers, ...sortedPharmacies.map((entry) => entry.retailer)];
    const byId = new Map(entries.map((retailer) => [retailer.id, retailer]));

    return Array.from(byId.values());
  }, [sortedPharmacies]);

  // Pulls the selected medicine and retailer details into the cart summary.
  const cartMedicine = cart
    ? allKnownMedicines.find((medicine) => medicine.id === cart.medicineId) ?? allKnownMedicines[0] ?? medicines[0]
    : null;
  const cartRetailer = cart
    ? allKnownRetailers.find((retailer) => retailer.id === cart.retailerId) ?? allKnownRetailers[0] ?? retailers[0]
    : null;
  const cartUnitPrice =
    cart && cartRetailer
      ? cartRetailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ??
        cartMedicine?.salePrice ??
        0
      : 0;
  const cartSubtotal = cart ? cart.quantity * cartUnitPrice : 0;
  const visibleOrders = ordersLoading && !orders.length ? initialOrders.map(mapMockOrderToSummary) : orders;

  // Changes the currently visible top-level customer screen.
  function navigateTo(screenId: Screen) {
    setScreen(screenId);
  }

  function openOrderTracking(orderId: string) {
    setActiveOrderId(orderId);
    setScreen('tracking');
  }

  function resetPrescriptionState() {
    setPrescriptionUploaded(false);
    setPrescriptionUpload(null);
    setPrescriptionHelperText(null);
  }

  // Opens the selected medicine's detail page.
  function goToMedicine(medicineId: string) {
    if (medicineId !== selectedMedicineId) {
      resetPrescriptionState();
    }
    setSelectedMedicineId(medicineId);
    setScreen('detail');
  }

  // Opens the search screen and optionally pre-fills a term.
  function openSearchFor(term?: string) {
    setSearchQuery(term ?? '');
    setScreen('search');
  }

  // Opens the pharmacy comparison screen for one medicine.
  function openPharmacies(medicineId: string) {
    if (medicineId !== selectedMedicineId) {
      resetPrescriptionState();
    }
    setSelectedMedicineId(medicineId);
    setScreen('pharmacies');
  }

  // Stores the chosen pharmacy and prepares the cart for checkout.
  function selectRetailer(retailerId: string) {
    if (!cart || cart.medicineId !== selectedMedicine.id || cart.retailerId !== retailerId) {
      resetPrescriptionState();
    }
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

  // Uploads prescription metadata to the backend when available, then advances checkout.
  async function submitPrescription(source: 'camera' | 'gallery') {
    if (prescriptionSubmitting) {
      return;
    }

    setPrescriptionSubmitting(true);
    setPrescriptionHelperText(null);

    try {
      const uploaded = await uploadCustomerPrescription({
        customerSession,
        medicineId: selectedMedicine.id,
        source,
      });

      setPrescriptionUpload(uploaded);
      setPrescriptionUploaded(true);
      setScreen('payment');
      setPrescriptionHelperText(
        customerSession
          ? 'Prescription uploaded to the backend and ready for order creation.'
          : 'Prescription prepared in local mode and ready for the prototype checkout flow.',
      );
    } catch (error) {
      setPrescriptionUpload(null);
      setPrescriptionUploaded(false);
      setPrescriptionHelperText(
        error instanceof Error
          ? `Prescription upload could not be completed right now: ${error.message}`
          : 'Prescription upload could not be completed right now.',
      );
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Prescription upload could not be completed right now.',
      );
    } finally {
      setPrescriptionSubmitting(false);
    }
  }

  function createLocalOrder() {
    if (!cart || !paymentMethod || !deliveryMethod) {
      return;
    }

    const retailer = allKnownRetailers.find((item) => item.id === cart.retailerId) ?? allKnownRetailers[0] ?? retailers[0];
    const unitPrice =
      retailer.stocks.find((item) => item.medicineId === cart.medicineId)?.price ?? selectedMedicine.salePrice;
    const subtotal = unitPrice * cart.quantity;
    const deliveryFee = deliveryMethod === 'home' ? 20 : 0;
    const total = subtotal + deliveryFee;
    const orderId = `ORD-${2200 + orders.length * 13}`;
    const localOrder: CustomerOrderSummary = {
      id: orderId,
      retailerId: retailer.id,
      retailerName: retailer.name,
      dateLabel: 'Just now',
      status: 'Confirmed',
      total,
      items: [{ medicineId: cart.medicineId, quantity: cart.quantity, unitPrice }],
      paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'SUCCESS',
      paymentMethod:
        paymentMethod === 'upi'
          ? 'UPI'
          : paymentMethod === 'card'
            ? 'CARD'
            : paymentMethod === 'bank'
              ? 'BANK_TRANSFER'
              : 'CASH_ON_DELIVERY',
      prescriptionStatus: selectedMedicine.prescriptionRequired ? 'UPLOADED' : 'NOT_REQUIRED',
      invoiceId: null,
      invoiceNumber: null,
    };

    setOrders((current) => [localOrder, ...current]);
    setActiveOrderId(orderId);
    setActiveOrder(mapSummaryToTracking(localOrder));

    setInvoice({
      invoiceNo: `INV-${3300 + orders.length * 11}`,
      orderId,
      medicineId: cart.medicineId,
      retailerId: retailer.id,
      retailerName: retailer.name,
      quantity: cart.quantity,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'SUCCESS',
      deliveryMethod,
    });
    setScreen('tracking');
  }

  // Creates a real backend order when possible, then falls back to the local demo flow.
  async function placeOrder() {
    if (!cart || !paymentMethod || !deliveryMethod) {
      Alert.alert('Complete checkout', 'Please choose payment and delivery to place the order.');
      return;
    }

    if (orderSubmitting) {
      return;
    }

    setOrderSubmitting(true);

    try {
      const createdOrder = await createCustomerOrder(
        {
          retailerId: cart.retailerId,
          medicineId: cart.medicineId,
          quantity: cart.quantity,
          paymentMethod,
          deliveryMethod,
          prescriptionRequired: selectedMedicine.prescriptionRequired,
          prescriptionUpload,
        },
        customerSession ? buildCustomerOrderContext(customerSession) : undefined,
      );

      setOrders((current) => [
        {
          id: createdOrder.orderId,
          retailerId: createdOrder.retailerId,
          retailerName: cartRetailer?.name ?? null,
          dateLabel: 'Just now',
          status: createdOrder.displayStatus,
          total: createdOrder.total,
          items: [
            {
              medicineId: createdOrder.medicineId,
              quantity: createdOrder.quantity,
              unitPrice: createdOrder.subtotal / Math.max(createdOrder.quantity, 1),
            },
          ],
          paymentStatus: createdOrder.invoice.paymentStatus ?? 'PENDING',
          paymentMethod:
            paymentMethod === 'upi'
              ? 'UPI'
              : paymentMethod === 'card'
                ? 'CARD'
                : paymentMethod === 'bank'
                  ? 'BANK_TRANSFER'
                  : 'CASH_ON_DELIVERY',
          prescriptionStatus: selectedMedicine.prescriptionRequired ? 'UPLOADED' : 'NOT_REQUIRED',
          invoiceId: createdOrder.invoice.invoiceId ?? null,
          invoiceNumber: createdOrder.invoice.invoiceNo,
        },
        ...current,
      ]);

      setActiveOrderId(createdOrder.orderId);
      setTrackingHelperText(
        customerSession
          ? 'Refreshing this order from the backend so tracking and invoice details stay live.'
          : null,
      );
      setInvoice(createdOrder.invoice);
      setScreen('tracking');
      Alert.alert('Order placed', 'The order was created in the backend and is now waiting for retailer approval.');
    } catch (error) {
      createLocalOrder();
      Alert.alert(
        'Using local demo order',
        error instanceof Error
          ? `The backend order could not be created right now, so the app used the local demo flow instead.\n\n${error.message}`
          : 'The backend order could not be created right now, so the app used the local demo flow instead.',
      );
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function continueFromSignup() {
    if (authSubmitting) {
      return;
    }

    const validationMessage = validateSignupState(signup);

    if (validationMessage) {
      Alert.alert('Complete your details', validationMessage);
      return;
    }

    setAuthSubmitting(true);

    try {
      const session = await signupOrLoginCustomer(signup);
      const defaultAddress = session.user.addresses.find((address) => address.isDefault) ?? session.user.addresses[0];

      setCustomerSession(session);
      setSignup((current) => ({
        ...current,
        fullName: session.user.fullName,
        email: session.user.email,
        phone: session.user.phone,
        address: defaultAddress ? formatCustomerAddress(defaultAddress) : current.address,
      }));
      setStage('app');
      Alert.alert('Account synced', 'Customer signup is now connected to the backend auth service.');
    } catch (error) {
      setCustomerSession(null);
      setStage('app');
      Alert.alert(
        'Using local profile',
        error instanceof Error
          ? `The backend signup could not be completed right now, so the app switched to local prototype mode.\n\n${error.message}`
          : 'The backend signup could not be completed right now, so the app switched to local prototype mode.',
      );
    } finally {
      setAuthSubmitting(false);
    }
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
        onContinue={continueFromSignup}
        helperText={
          authSubmitting
            ? 'Creating or restoring your backend customer account.'
            : 'This screen now tries live customer signup first and falls back to local prototype mode if the backend is unavailable.'
        }
        isSubmitting={authSubmitting}
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
          filteredMedicines={searchResults}
          isLoading={searchLoading}
          helperText={searchHelperText}
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
          isLoading={detailLoading}
          helperText={detailHelperText}
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
          isLoading={retailerLoading}
          helperText={retailerHelperText}
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
          upload={prescriptionUpload}
          helperText={
            prescriptionSubmitting ? 'Uploading prescription details to the backend.' : prescriptionHelperText
          }
          isUploading={prescriptionSubmitting}
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
          helperText={
            trackingLoading
              ? 'Loading the latest tracking timeline from the backend.'
              : trackingHelperText
          }
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
          medicines={allKnownMedicines}
          retailers={allKnownRetailers}
          helperText={
            invoiceLoading ? 'Loading the latest invoice summary from the backend.' : invoiceHelperText
          }
        />
      );
    }

    if (screen === 'orders') {
      return (
        <OrdersScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          orders={visibleOrders}
          retailers={allKnownRetailers}
          helperText={
            ordersLoading ? 'Loading the latest order history from the backend.' : ordersHelperText
          }
          onOpenTracking={openOrderTracking}
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
          customerSession={customerSession}
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
        medicines={catalogueMedicines}
        retailers={allKnownRetailers}
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
