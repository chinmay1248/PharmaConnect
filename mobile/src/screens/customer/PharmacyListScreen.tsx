import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';
import { PharmacySort, SortedPharmacy } from './customerTypes';

type PharmacyListScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  sortBy: PharmacySort;
  sortedPharmacies: SortedPharmacy[];
  onChangeSort: (sort: PharmacySort) => void;
  onSelectRetailer: (retailerId: string) => void;
};

// Renders the nearby pharmacy comparison screen with sorting controls.
export function PharmacyListScreen({
  mode,
  theme,
  contentContainerStyle,
  sortBy,
  sortedPharmacies,
  onChangeSort,
  onSelectRetailer,
}: PharmacyListScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Choose pharmacy"
        description="Sort by what matters first before you place the order."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={customerStyles.horizontalRow}>
        {[
          { id: 'closest', label: 'Closest pharmacy' },
          { id: 'cheapest', label: 'Cheapest first' },
          { id: 'rating', label: 'Highest rating' },
        ].map((option) => {
          const active = sortBy === option.id;
          return (
            <InteractivePressable
              key={option.id}
              onPress={() => onChangeSort(option.id as PharmacySort)}
              style={[
                customerStyles.sortPill,
                {
                  backgroundColor: active ? theme.primarySoft : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <Text style={[customerStyles.sortPillText, { color: active ? theme.primaryStrong : theme.text }]}>
                {option.label}
              </Text>
            </InteractivePressable>
          );
        })}
      </ScrollView>

      {sortedPharmacies.map(({ retailer, stock }) => (
        <InteractivePressable
          key={retailer.id}
          onPress={() => onSelectRetailer(retailer.id)}
          style={[
            customerStyles.pharmacyCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
          pressedStyle={{ backgroundColor: theme.elevated }}
        >
          <View style={customerStyles.pharmacyHeader}>
            <View style={customerStyles.pharmacyHeaderCopy}>
              <Text style={[customerStyles.pharmacyName, { color: theme.text }]}>{retailer.name}</Text>
              <Text style={[customerStyles.pharmacyMeta, { color: theme.subtext }]}>
                {retailer.area} - {retailer.distanceKm} km - {retailer.deliveryTime}
              </Text>
            </View>
            <Text style={[customerStyles.pharmacyPrice, { color: theme.text }]}>{formatCurrency(stock.price)}</Text>
          </View>
          <View style={customerStyles.pharmacyStats}>
            <Text style={[customerStyles.pharmacyMeta, { color: theme.primary }]}>Rating {retailer.rating}</Text>
            <Text style={[customerStyles.pharmacyMeta, { color: theme.subtext }]}>Stock {stock.stockQty}</Text>
            <Text style={[customerStyles.pharmacyMeta, { color: theme.subtext }]}>
              {retailer.deliveryAvailable ? 'Home delivery available' : 'Pickup only'}
            </Text>
          </View>
          <ActionButton mode={mode} label="Select pharmacy" icon="shopping-bag" onPress={() => onSelectRetailer(retailer.id)} />
        </InteractivePressable>
      ))}
    </ScrollView>
  );
}
