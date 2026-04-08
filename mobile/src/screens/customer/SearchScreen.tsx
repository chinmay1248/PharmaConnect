import Feather from '@expo/vector-icons/Feather';
import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Medicine } from '../../data/mockData';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';

type SearchScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  recentSearches: string[];
  filteredMedicines: Medicine[];
  isLoading: boolean;
  helperText: string | null;
  onOpenSearchFor: (term?: string) => void;
  onGoToMedicine: (medicineId: string) => void;
  onOpenPharmacies: (medicineId: string) => void;
};

// Renders the customer search results screen and the recent search pills.
export function SearchScreen({
  mode,
  theme,
  contentContainerStyle,
  recentSearches,
  filteredMedicines,
  isLoading,
  helperText,
  onOpenSearchFor,
  onGoToMedicine,
  onOpenPharmacies,
}: SearchScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Search medicines"
        description="See medicine details first, then compare nearby pharmacies."
      />
      {recentSearches.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={customerStyles.horizontalRow}>
          {recentSearches.map((term) => (
            <InteractivePressable
              key={term}
              onPress={() => onOpenSearchFor(term)}
              style={[
                customerStyles.searchPill,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <Feather name="clock" size={14} color={theme.primary} />
              <Text style={[customerStyles.searchPillText, { color: theme.text }]}>{term}</Text>
            </InteractivePressable>
          ))}
        </ScrollView>
      ) : null}

      {isLoading ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Loading live catalogue results...</Text>
        </View>
      ) : null}

      {helperText ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>{helperText}</Text>
        </View>
      ) : null}

      {!filteredMedicines.length && !isLoading ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            No medicines matched this search yet. Try a brand name, salt, or disease keyword.
          </Text>
        </View>
      ) : null}

      {filteredMedicines.map((medicine) => (
        <InteractivePressable
          key={medicine.id}
          onPress={() => onGoToMedicine(medicine.id)}
          style={[
            customerStyles.searchCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
          pressedStyle={{ backgroundColor: theme.elevated }}
        >
          <View style={[customerStyles.searchCardThumb, { backgroundColor: medicine.imageColor }]}>
            <Text style={customerStyles.searchCardThumbText}>{medicine.genericName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={customerStyles.searchCardBody}>
            <Text style={[customerStyles.searchCardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
            <Text style={[customerStyles.searchCardMeta, { color: theme.subtext }]}>
              {medicine.genericName} - {medicine.company} - {medicine.packSize}
            </Text>
            <Text style={[customerStyles.searchCardMeta, { color: theme.subtext }]}>
              {medicine.rating} stars - {medicine.reviewCount} reviews
            </Text>
            <Text style={[customerStyles.searchCardPrice, { color: theme.text }]}>{formatCurrency(medicine.salePrice)}</Text>
            <Text style={[customerStyles.searchCardMeta, { color: theme.primary }]}>
              {medicine.couponPrice ? `Buy for ${formatCurrency(medicine.couponPrice)} with coupon` : 'Trusted nearby pricing'}
            </Text>
            <View style={customerStyles.inlineRow}>
              <ActionButton mode={mode} label="Details" icon="info" variant="secondary" onPress={() => onGoToMedicine(medicine.id)} />
              <ActionButton mode={mode} label="Compare pharmacies" icon="map-pin" onPress={() => onOpenPharmacies(medicine.id)} />
            </View>
          </View>
        </InteractivePressable>
      ))}
    </ScrollView>
  );
}
