import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, useWindowDimensions, type ViewStyle } from 'react-native';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { ScreenTransition } from '../components/ScreenTransition';
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
import {
  buildSignupStateFromSession,
  createCustomerAddress,
  deleteCustomerAddress,
  CustomerAddressDraft,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  validateCustomerAddressDraft,
} from '../services/customerAuth';
import type { AuthSession } from '../services/session';
import {
  fetchCustomerInvoice,
  fetchCustomerOrderDetail,
  fetchCustomerOrderTracking,
  fetchCustomerOrders,
} from '../services/customerOrders';
import { fetchCatalogueMedicines, fetchMedicineDetail, fetchMedicineRetailers, searchMedicines } from '../services/medicineDiscovery';
import {
  fetchCustomerNotifications,
  markCustomerNotificationRead,
  markCustomerNotificationsRead,
} from '../services/notifications';
import { buildCustomerOrderContext, createCustomerOrder } from '../services/orderFlow';
import { subscribeToForegroundNotifications, subscribeToNotificationTaps } from '../services/pushNotifications';
import { uploadCustomerPrescription } from '../services/prescriptions';
import { ThemeMode, statusBarStyle, themes } from '../theme/theme';
import { AccountScreen } from './customer/AccountScreen';
import { CartScreen } from './customer/CartScreen';
import { CustomerHeader } from './customer/CustomerHeader';
import { DeliveryScreen } from './customer/DeliveryScreen';
import { HomeScreen } from './customer/HomeScreen';
import { InvoiceScreen } from './customer/InvoiceScreen';
import { MedicineDetailScreen } from './customer/MedicineDetailScreen';
import { NotificationsScreen } from './customer/NotificationsScreen';
import { OrdersScreen } from './customer/OrdersScreen';
import { PaymentScreen } from './customer/PaymentScreen';
import { PharmacyListScreen } from './customer/PharmacyListScreen';
import { PrescriptionScreen } from './customer/PrescriptionScreen';
import { SearchScreen } from './customer/SearchScreen';
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
  CustomerNotification,
  CustomerOrderSummary,
  CustomerOrderTrackingState,
  PrescriptionUpload,
  SignupState,
} from './customer/customerTypes';
import { customerStyles } from './customer/customerStyles';
import {
  emptySignupState,
  filterMockMedicines,
  mapMockOrderToSummary,
  mapSummaryToTracking,
  sortMockPharmacies,
} from './customer/customerHelpers';
import { useSplashAnimation } from './customer/useSplashAnimation';


type CustomerModuleAppProps = {
  session: AuthSession;
  onSignOut: () => void;
};

// Main customer module component that controls the full frontend flow and screen switching.
// Authentication happens before this component mounts, so it always starts with a live session.
export function CustomerModuleApp({ session, onSignOut }: CustomerModuleAppProps) {
  // Layout values used to keep the UI neat across mobile and web widths.
  const { width: viewportWidth } = useWindowDimensions();

  // Core app state for theme, navigation, checkout progress, and user details.
  const [stage, setStage] = useState<AppStage>('splash');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
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
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
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
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [searchHelperText, setSearchHelperText] = useState<string | null>(null);
  const [detailHelperText, setDetailHelperText] = useState<string | null>(null);
  const [retailerHelperText, setRetailerHelperText] = useState<string | null>(null);
  const [ordersHelperText, setOrdersHelperText] = useState<string | null>(null);
  const [trackingHelperText, setTrackingHelperText] = useState<string | null>(null);
  const [invoiceHelperText, setInvoiceHelperText] = useState<string | null>(null);
  const [notificationsHelperText, setNotificationsHelperText] = useState<string | null>(null);
  const [prescriptionHelperText, setPrescriptionHelperText] = useState<string | null>(null);
  const [accountHelperText, setAccountHelperText] = useState<string | null>(null);
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(session);
  const [signup, setSignup] = useState<SignupState>(() => buildSignupStateFromSession(session));
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const theme = themes[themeMode];
  const horizontalPadding = viewportWidth >= 1024 ? 24 : 14;
  const sectionWidth = Math.min(Math.max(viewportWidth - horizontalPadding * 2, 320), 980);
  const gridGap = 10;
  const isCompactLayout = sectionWidth < 380;
  const categoryColumns = sectionWidth >= 900 ? 6 : sectionWidth >= 700 ? 5 : sectionWidth >= 520 ? 4 : 3;
  const dealColumns = sectionWidth >= 900 ? 3 : sectionWidth >= 620 ? 2 : 1;
  const optionColumns = sectionWidth >= 820 ? 3 : sectionWidth >= 500 ? 2 : 1;
  const categoryCardWidth = Math.max(96, Math.floor((sectionWidth - gridGap * (categoryColumns - 1)) / categoryColumns));
  const dealCardWidth = Math.max(180, Math.floor((sectionWidth - gridGap * (dealColumns - 1)) / dealColumns));
  const optionCardWidth = Math.max(180, Math.floor((sectionWidth - gridGap * (optionColumns - 1)) / optionColumns));
  const bannerCardWidth = Math.min(Math.max(sectionWidth * (sectionWidth >= 700 ? 0.46 : 0.78), 250), 390);
  const mobileProductCardWidth = Math.min(Math.max(sectionWidth * 0.42, 176), 240);
  const isHomeScreen = screen === 'home';

  // Keeps the in-module copy of the session aligned when the app refreshes the signed-in profile.
  useEffect(() => {
    setCustomerSession(session);
    setSignup(buildSignupStateFromSession(session));
  }, [session]);

  const { splashOpacity, splashScale } = useSplashAnimation(stage, setStage);

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

  async function loadNotifications(options?: { silent?: boolean }) {
    if (!customerSession) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      setNotificationsHelperText('Sign in with a backend-linked customer account to see live notifications.');
      return;
    }

    if (!options?.silent) {
      setNotificationsLoading(true);
    }

    setNotificationsHelperText(null);

    try {
      const payload = await fetchCustomerNotifications(customerSession.user.id);

      setNotifications(payload.notifications);
      setUnreadNotificationCount(payload.unreadCount);
    } catch (error) {
      setNotificationsHelperText(
        error instanceof Error
          ? `Notifications could not be loaded right now: ${error.message}`
          : 'Notifications could not be loaded right now.',
      );
    } finally {
      if (!options?.silent) {
        setNotificationsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (stage !== 'app' || !customerSession) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    void loadNotifications({ silent: true });
  }, [customerSession, stage]);

  useEffect(() => {
    if (stage !== 'app' || screen !== 'notifications') {
      return;
    }

    void loadNotifications();

    const notificationRefreshInterval = setInterval(() => {
      void loadNotifications({ silent: true });
    }, 30000);

    return () => {
      clearInterval(notificationRefreshInterval);
    };
  }, [screen, stage]);

  // A push that arrives while the app is open refreshes the inbox badge; tapping one opens the
  // order it refers to, which is the same behaviour as tapping the notification in the inbox.
  useEffect(() => {
    if (stage !== 'app' || !customerSession) {
      return;
    }

    const unsubscribeForeground = subscribeToForegroundNotifications(() => {
      void loadNotifications({ silent: true });
    });

    const unsubscribeTaps = subscribeToNotificationTaps((payload) => {
      void loadNotifications({ silent: true });

      if (payload.referenceKind === 'customer_order' && payload.referenceId) {
        openOrderTracking(payload.referenceId);
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTaps();
    };
  }, [customerSession, stage]);

  useEffect(() => {
    if (stage !== 'app' || screen !== 'tracking' || !activeOrderId || !customerSession) {
      return;
    }

    // While the tracking screen is open, poll only the timeline and courier position. A courier on
    // the move updates its location far more often than the rest of the order changes, so this runs
    // on a much tighter interval than a full order refetch could afford.
    const trackingRefreshInterval = setInterval(() => {
      void fetchCustomerOrderTracking(activeOrderId)
        .then((tracking) => {
          setActiveOrder((current) =>
            current && current.id === tracking.orderId
              ? {
                  ...current,
                  status: tracking.status,
                  trackingEvents: tracking.trackingEvents,
                  delivery: tracking.delivery,
                  retailerPhone: tracking.retailerPhone,
                }
              : current,
          );
          setTrackingHelperText(null);
        })
        .catch(() => {
          setTrackingHelperText('Tracking auto-refresh could not reach the backend. Manual refresh is still available.');
        });
    }, 10000);

    return () => {
      clearInterval(trackingRefreshInterval);
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

  function openNotifications() {
    setScreen('notifications');
    void loadNotifications();
  }

  async function refreshActiveTracking() {
    if (!activeOrderId) {
      setTrackingHelperText('Choose an order first to refresh its tracking timeline.');
      return;
    }

    const fallbackSummary = orders.find((order) => order.id === activeOrderId);

    if (!customerSession) {
      setActiveOrder(fallbackSummary ? mapSummaryToTracking(fallbackSummary) : null);
      setTrackingHelperText('Showing local tracking because this is not a backend-linked customer session.');
      return;
    }

    setTrackingLoading(true);
    setTrackingHelperText(null);

    try {
      const detail = await fetchCustomerOrderDetail(activeOrderId);
      setActiveOrder(detail);
      setTrackingHelperText('Tracking timeline refreshed from the backend.');
    } catch (error) {
      setActiveOrder(fallbackSummary ? mapSummaryToTracking(fallbackSummary) : null);
      setTrackingHelperText(
        error instanceof Error
          ? `Tracking could not be refreshed right now: ${error.message}`
          : 'Tracking could not be refreshed right now.',
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  async function openNotification(notification: CustomerNotification) {
    if (!notification.isRead) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );
      setUnreadNotificationCount((current) => Math.max(current - 1, 0));

      try {
        await markCustomerNotificationRead(notification.id);
      } catch {
        void loadNotifications({ silent: true });
      }
    }

    if (notification.referenceKind === 'customer_order' && notification.referenceId) {
      openOrderTracking(notification.referenceId);
      return;
    }

    setNotificationsHelperText('This notification is marked read. No linked customer order is attached.');
  }

  function resetPrescriptionState() {
    setPrescriptionUploaded(false);
    setPrescriptionUpload(null);
    setPrescriptionHelperText(null);
  }

  function resetOrderState() {
    const initialSummary = initialOrders[0] ? mapMockOrderToSummary(initialOrders[0]) : null;

    setOrders(initialOrders.map(mapMockOrderToSummary));
    setActiveOrderId(initialSummary?.id ?? null);
    setActiveOrder(initialSummary ? mapSummaryToTracking(initialSummary) : null);
    setInvoice(null);
    setOrdersHelperText(null);
    setTrackingHelperText(null);
    setInvoiceHelperText(null);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setNotificationsHelperText(null);
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
      void loadNotifications({ silent: true });
      setScreen('tracking');
      Alert.alert(
        'Order placed',
        createdOrder.paymentFlow === 'gateway_pending'
          ? 'The order was created and a Razorpay payment order is ready. Client checkout is the next step before payment can be marked successful.'
          : 'The order was created in the backend and is now waiting for retailer approval.',
      );
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

  function logoutCustomer() {
    setCustomerSession(null);
    setAccountHelperText(null);
    setScreen('home');
    setSearchQuery('');
    setPaymentMethod(null);
    setDeliveryMethod(null);
    setCart(null);
    resetPrescriptionState();
    resetOrderState();
    setNotifications([]);
    setUnreadNotificationCount(0);
    setSignup(emptySignupState);
    onSignOut();
  }

  async function markAllNotificationsRead() {
    if (!customerSession) {
      setNotificationsHelperText('Sign in with a backend-linked customer account to mark notifications read.');
      return;
    }

    if (unreadNotificationCount === 0) {
      setNotificationsHelperText('All customer notifications are already marked as read.');
      return;
    }

    setNotificationsLoading(true);
    setNotificationsHelperText(null);

    try {
      await markCustomerNotificationsRead(customerSession.user.id);
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
      setUnreadNotificationCount(0);
      setNotificationsHelperText('All notifications marked as read.');
    } catch (error) {
      setNotificationsHelperText(
        error instanceof Error
          ? `Notifications could not be marked read right now: ${error.message}`
          : 'Notifications could not be marked read right now.',
      );
      Alert.alert(
        'Notification update failed',
        error instanceof Error ? error.message : 'Notifications could not be marked read right now.',
      );
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function saveAddress(draft: CustomerAddressDraft, addressId?: string) {
    const validationMessage = validateCustomerAddressDraft(draft);

    if (validationMessage) {
      Alert.alert('Address details', validationMessage);
      return false;
    }

    if (!customerSession) {
      const localAddress = [draft.line1, draft.line2, draft.area, draft.city, draft.state, draft.postalCode]
        .filter((segment) => segment.trim())
        .join(', ');

      setSignup((current) => ({ ...current, address: localAddress }));
      setAccountHelperText('Saved this address in local prototype mode.');
      return true;
    }

    if (addressSubmitting) {
      return false;
    }

    setAddressSubmitting(true);
    setAccountHelperText(null);

    try {
      const updatedSession = addressId
        ? await updateCustomerAddress(customerSession, addressId, draft)
        : await createCustomerAddress(customerSession, draft);

      let finalSession = updatedSession;

      if (draft.isDefault && addressId) {
        finalSession = await setDefaultCustomerAddress(updatedSession, addressId);
      }

      setCustomerSession(finalSession);
      setSignup(buildSignupStateFromSession(finalSession));
      setAccountHelperText(addressId ? 'Address updated successfully.' : 'Address saved successfully.');
      return true;
    } catch (error) {
      setAccountHelperText(
        error instanceof Error
          ? `Address could not be saved right now: ${error.message}`
          : 'Address could not be saved right now.',
      );
      Alert.alert(
        'Address update failed',
        error instanceof Error ? error.message : 'Address could not be saved right now.',
      );
      return false;
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function markDefaultAddress(addressId: string) {
    if (!customerSession || addressSubmitting) {
      return false;
    }

    setAddressSubmitting(true);
    setAccountHelperText(null);

    try {
      const updatedSession = await setDefaultCustomerAddress(customerSession, addressId);
      setCustomerSession(updatedSession);
      setSignup(buildSignupStateFromSession(updatedSession));
      setAccountHelperText('Default address updated.');
      return true;
    } catch (error) {
      setAccountHelperText(
        error instanceof Error
          ? `Default address could not be updated: ${error.message}`
          : 'Default address could not be updated.',
      );
      Alert.alert(
        'Default address failed',
        error instanceof Error ? error.message : 'Default address could not be updated right now.',
      );
      return false;
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function removeAddress(addressId: string) {
    if (!customerSession || addressSubmitting) {
      return false;
    }

    setAddressSubmitting(true);
    setAccountHelperText(null);

    try {
      const updatedSession = await deleteCustomerAddress(customerSession, addressId);
      setCustomerSession(updatedSession);
      setSignup(buildSignupStateFromSession(updatedSession));
      setAccountHelperText('Address removed from your profile.');
      return true;
    } catch (error) {
      setAccountHelperText(
        error instanceof Error
          ? `Address could not be removed right now: ${error.message}`
          : 'Address could not be removed right now.',
      );
      Alert.alert(
        'Delete failed',
        error instanceof Error ? error.message : 'Address could not be removed right now.',
      );
      return false;
    } finally {
      setAddressSubmitting(false);
    }
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
    if (screen === 'account' || screen === 'notifications') {
      return 'account';
    }
    return 'home';
  }

  const centeredContentStyle: ViewStyle = {
    paddingBottom: 118,
    paddingHorizontal: horizontalPadding,
    width: '100%',
    maxWidth: sectionWidth,
    alignSelf: 'center',
  };

  const contentContainerStyle = [customerStyles.scrollContent, centeredContentStyle];

  // Shows the animated splash screen while the first screen's data loads.
  if (stage !== 'app') {
    return <SplashScreen splashOpacity={splashOpacity} splashScale={splashScale} />;
  }

  // Chooses which main screen body should be visible right now.
  function renderScreen() {
    if (screen === 'search') {
      return (
        <SearchScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          isCompactLayout={isCompactLayout}
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
          isCompactLayout={isCompactLayout}
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
          isCompactLayout={isCompactLayout}
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
          isCompactLayout={isCompactLayout}
          activeOrder={activeOrder}
          helperText={
            trackingLoading
              ? 'Loading the latest tracking timeline from the backend.'
              : trackingHelperText
          }
          isLoading={trackingLoading}
          onRefresh={() => {
            void refreshActiveTracking();
          }}
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

    if (screen === 'notifications') {
      return (
        <NotificationsScreen
          mode={themeMode}
          theme={theme}
          contentContainerStyle={contentContainerStyle}
          notifications={notifications}
          unreadCount={unreadNotificationCount}
          helperText={
            notificationsLoading ? 'Refreshing customer notifications from the backend.' : notificationsHelperText
          }
          isLoading={notificationsLoading}
          onRefresh={() => {
            void loadNotifications();
          }}
          onMarkAllRead={() => {
            void markAllNotificationsRead();
          }}
          onOpenNotification={(notification) => {
            void openNotification(notification);
          }}
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
          helperText={addressSubmitting ? 'Saving address changes...' : accountHelperText}
          isSavingAddress={addressSubmitting}
          onSaveAddress={saveAddress}
          onSetDefaultAddress={markDefaultAddress}
          onDeleteAddress={removeAddress}
          onLogout={logoutCustomer}
        />
      );
    }

    return (
      <HomeScreen
        mode={themeMode}
        theme={theme}
        contentContainerStyle={contentContainerStyle}
        bannerCardWidth={bannerCardWidth}
        isCompactLayout={isCompactLayout}
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
        onPressNotifications={openNotifications}
        unreadNotificationCount={unreadNotificationCount}
        onPressCart={() => setScreen('cart')}
      />

      {/* Visible page body based on the current screen state, with a smooth
          fade + rise each time the screen changes. */}
      <ScreenTransition screenKey={screen}>{renderScreen()}</ScreenTransition>

      {/* Sticky bottom navigation. */}
      <BottomTabBar
        mode={themeMode}
        activeTab={currentTab()}
        onChange={(tab) => navigateTo(tab === 'account' ? 'account' : tab)}
      />
    </SafeAreaView>
  );
}
