import Feather from '@expo/vector-icons/Feather';
import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Medicine } from '../../data/mockData';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';

type MedicineDetailScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  isCompactLayout: boolean;
  selectedMedicine: Medicine;
  isLoading: boolean;
  helperText: string | null;
  onOpenSearchFor: (term?: string) => void;
  onOpenPharmacies: (medicineId: string) => void;
  onOpenSearch: () => void;
};

// Renders the detailed medicine view, including diseases, substitutes, and CTA actions.
export function MedicineDetailScreen({
  mode,
  theme,
  contentContainerStyle,
  isCompactLayout,
  selectedMedicine,
  isLoading,
  helperText,
  onOpenSearchFor,
  onOpenPharmacies,
  onOpenSearch,
}: MedicineDetailScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Medicine details"
        description="Everything the customer should see before ordering."
      />
      {isLoading ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Refreshing medicine details from the backend...</Text>
        </View>
      ) : null}
      {helperText ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>{helperText}</Text>
        </View>
      ) : null}
      <View style={[customerStyles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[customerStyles.detailThumb, { backgroundColor: selectedMedicine.imageColor }]}>
          <Text style={customerStyles.detailThumbText}>{selectedMedicine.genericName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[customerStyles.detailTitle, { color: theme.text }]}>{selectedMedicine.brandName}</Text>
        <Text style={[customerStyles.detailSubTitle, { color: theme.subtext }]}>
          {selectedMedicine.genericName} - {selectedMedicine.dosage} - {selectedMedicine.packSize}
        </Text>
        <Text style={[customerStyles.detailPrice, { color: theme.text }]}>{formatCurrency(selectedMedicine.salePrice)}</Text>
        
        <View style={{ marginTop: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="check-circle" size={14} color={theme.accentPrimary} />
          <Text style={{ color: theme.accentPrimary, fontWeight: '800', fontSize: 13, fontStyle: 'italic' }}>PharmaConnect Assured</Text>
        </View>

        <Text style={[customerStyles.detailSubTitle, { color: theme.primary }]}>
          {selectedMedicine.prescriptionRequired ? 'Prescription required before dispatch' : 'No prescription needed'}
        </Text>
        <Text style={[customerStyles.detailDescription, { color: theme.subtext }]}>{selectedMedicine.description}</Text>

        <View style={customerStyles.tagRow}>
          {selectedMedicine.diseases.map((disease) => (
            <View
              key={disease}
              style={[customerStyles.infoTag, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            >
              <Text style={[customerStyles.infoTagText, { color: theme.text }]}>{disease}</Text>
            </View>
          ))}
        </View>

        <Text style={[customerStyles.subSectionTitle, { color: theme.text }]}>Substitutes</Text>
        {selectedMedicine.substitutes.length ? (
          <View style={customerStyles.tagRow}>
            {selectedMedicine.substitutes.map((substitute) => (
              <InteractivePressable
                key={substitute}
                onPress={() => onOpenSearchFor(substitute)}
                style={[customerStyles.infoTag, { backgroundColor: theme.surface, borderColor: theme.border }]}
                hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
                pressedStyle={{ backgroundColor: theme.elevated }}
              >
                <Text style={[customerStyles.infoTagText, { color: theme.text }]}>{substitute}</Text>
              </InteractivePressable>
            ))}
          </View>
        ) : (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Substitute brands will appear here once the backend has matched same-salt alternatives.
          </Text>
        )}

        <View style={{ marginTop: 24, gap: 12 }}>
          <ActionButton
            mode={mode}
            label="Add to Cart"
            variant="accentSecondary"
            onPress={() => onOpenPharmacies(selectedMedicine.id)}
            fullWidth={true}
          />
          <ActionButton
            mode={mode}
            label="Buy Now"
            icon="zap"
            variant="accentPrimary"
            onPress={() => onOpenPharmacies(selectedMedicine.id)}
            fullWidth={true}
          />
        </View>

        <View style={[customerStyles.inlineRow, isCompactLayout && customerStyles.inlineRowStack, { marginTop: 16 }]}>
          <ActionButton
            mode={mode}
            label="Compare sellers"
            icon="list"
            variant="soft"
            onPress={() => onOpenPharmacies(selectedMedicine.id)}
            fullWidth={isCompactLayout}
          />
          <ActionButton
            mode={mode}
            label="Back to search"
            icon="search"
            variant="secondary"
            onPress={onOpenSearch}
            fullWidth={isCompactLayout}
          />
        </View>
      </View>
    </ScrollView>
  );
}
