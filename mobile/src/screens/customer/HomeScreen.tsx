import Feather from '@expo/vector-icons/Feather';
import { Alert, ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Category, Medicine, QuickService, Shortcut, Retailer } from '../../data/mockData';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton, categoryIcons, serviceIcons } from './CustomerShared';
import { customerStyles } from './customerStyles';

type HomeScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  quickServices: QuickService[];
  shortcutChips: Shortcut[];
  categories: Category[];
  banners: { id: string; title: string; subtitle: string; accent: string }[];
  medicines: Medicine[];
  retailers: Retailer[];
  cartMedicine: Medicine | null;
  categoryCardWidth: number;
  mobileProductCardWidth: number;
  dealCardWidth: number;
  onOpenPrescription: () => void;
  onOpenOrders: () => void;
  onOpenAccount: () => void;
  onOpenSearchFor: (term?: string) => void;
  onGoToMedicine: (medicineId: string) => void;
  onOpenPharmacies: (medicineId: string) => void;
};

// Computes the lowest visible retailer price for a medicine on the home deals section.
function getLowestPrice(medicine: Medicine, retailers: Retailer[]) {
  const prices = retailers.flatMap((retailer) =>
    retailer.stocks.filter((stock) => stock.medicineId === medicine.id).map((stock) => stock.price),
  );

  return prices.length ? Math.min(...prices) : medicine.salePrice;
}

// Renders the customer home screen with shortcuts, banners, categories, and deal cards.
export function HomeScreen({
  mode,
  theme,
  contentContainerStyle,
  quickServices,
  shortcutChips,
  categories,
  banners,
  medicines,
  retailers,
  cartMedicine,
  categoryCardWidth,
  mobileProductCardWidth,
  dealCardWidth,
  onOpenPrescription,
  onOpenOrders,
  onOpenAccount,
  onOpenSearchFor,
  onGoToMedicine,
  onOpenPharmacies,
}: HomeScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <View style={customerStyles.rowWrap}>
        {quickServices.map((service) => (
          <InteractivePressable
            key={service.id}
            onPress={() => {
              if (service.title === 'Rx Upload') {
                onOpenPrescription();
                return;
              }
              if (service.title === 'Deals') {
                onOpenSearchFor('deal');
                return;
              }
              if (service.title === 'Refill') {
                onOpenSearchFor('daily');
                return;
              }
              Alert.alert(service.title, `${service.title} can be wired to a dedicated flow in the next pass.`);
            }}
            style={[
              customerStyles.utilityChip,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <Feather name={serviceIcons[service.title]} size={15} color={theme.primary} />
            <Text style={[customerStyles.utilityChipText, { color: theme.text }]}>{service.title}</Text>
          </InteractivePressable>
        ))}
      </View>

      <View style={[customerStyles.rowWrap, customerStyles.shortcutRow]}>
        {shortcutChips.map((chip) => (
          <InteractivePressable
            key={chip.id}
            onPress={() => {
              if (chip.title === 'Orders') {
                onOpenOrders();
                return;
              }
              if (chip.title === 'Buy Again') {
                onOpenSearchFor(cartMedicine?.genericName ?? medicines[0].genericName);
                return;
              }
              if (chip.title === 'Account') {
                onOpenAccount();
                return;
              }
              Alert.alert('Lists', 'List management can be connected in the next step.');
            }}
            style={[
              customerStyles.shortcutChip,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <Text style={[customerStyles.shortcutChipText, { color: theme.text }]}>{chip.title}</Text>
          </InteractivePressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={customerStyles.horizontalRow}>
        {banners.map((banner) => (
          <InteractivePressable
            key={banner.id}
            onPress={() => onOpenSearchFor(banner.title.includes('Nearby') ? 'nearby' : 'daily')}
            style={[
              customerStyles.bannerCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={[customerStyles.bannerAccent, { backgroundColor: banner.accent }]} />
            <Text style={[customerStyles.bannerTitle, { color: '#0a1624' }]}>{banner.title}</Text>
            <Text style={[customerStyles.bannerText, { color: theme.subtext }]}>{banner.subtitle}</Text>
            <ActionButton
              mode={mode}
              label="Explore"
              icon="arrow-right"
              variant="secondary"
              onPress={() => onOpenSearchFor(banner.title)}
            />
          </InteractivePressable>
        ))}
      </ScrollView>

      <SectionHeader
        mode={mode}
        title="Top categories for you"
        description="Jump straight to the medicines people usually search first."
      />
      <View style={customerStyles.categoryGrid}>
        {categories.map((category) => (
          <InteractivePressable
            key={category.id}
            onPress={() => onOpenSearchFor(category.title)}
            style={[
              customerStyles.categoryCard,
              { width: categoryCardWidth },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={[customerStyles.categoryIconWrap, { backgroundColor: category.tint }]}>
              <Feather name={categoryIcons[category.title] ?? 'box'} size={18} color={theme.primaryStrong} />
            </View>
            <Text numberOfLines={2} style={[customerStyles.categoryLabel, { color: theme.text }]}>
              {category.title}
            </Text>
          </InteractivePressable>
        ))}
      </View>

      <SectionHeader mode={mode} title="Reorder previous medicines" action="See all" onAction={onOpenOrders} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={customerStyles.horizontalRow}>
        {medicines.map((medicine) => (
          <InteractivePressable
            key={medicine.id}
            onPress={() => onGoToMedicine(medicine.id)}
            style={[
              customerStyles.productCard,
              { width: mobileProductCardWidth },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={[customerStyles.productThumb, { backgroundColor: medicine.imageColor }]}>
              <Text style={customerStyles.productThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={[customerStyles.productTitle, { color: theme.text }]} numberOfLines={2}>
              {medicine.brandName}
            </Text>
            <Text style={[customerStyles.productMeta, { color: theme.subtext }]}>{medicine.monthlyOrders}</Text>
            <Text style={[customerStyles.productPrice, { color: theme.text }]}>{formatCurrency(medicine.salePrice)}</Text>
          </InteractivePressable>
        ))}
      </ScrollView>

      <SectionHeader mode={mode} title="Nearby pharmacy deals" action="See all" onAction={() => onOpenSearchFor()} />
      <View style={customerStyles.dealGrid}>
        {medicines.map((medicine) => (
          <InteractivePressable
            key={medicine.id}
            onPress={() => onOpenPharmacies(medicine.id)}
            style={[
              customerStyles.dealCard,
              { width: dealCardWidth },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={[customerStyles.dealThumb, { backgroundColor: medicine.imageColor }]}>
              <Text style={customerStyles.dealThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={[customerStyles.dealTitle, { color: theme.text }]} numberOfLines={2}>
              {medicine.brandName}
            </Text>
            <Text style={[customerStyles.dealMeta, { color: theme.subtext }]}>
              Compare closest, cheapest, and top rated pharmacies
            </Text>
            <Text style={[customerStyles.dealPrice, { color: theme.text }]}>
              From {formatCurrency(getLowestPrice(medicine, retailers))}
            </Text>
          </InteractivePressable>
        ))}
      </View>
    </ScrollView>
  );
}
