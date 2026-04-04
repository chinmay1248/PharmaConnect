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
  selectedMedicine: Medicine;
  onOpenSearchFor: (term?: string) => void;
  onOpenPharmacies: (medicineId: string) => void;
  onOpenSearch: () => void;
};

// Renders the detailed medicine view, including diseases, substitutes, and CTA actions.
export function MedicineDetailScreen({
  mode,
  theme,
  contentContainerStyle,
  selectedMedicine,
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
      <View style={[customerStyles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[customerStyles.detailThumb, { backgroundColor: selectedMedicine.imageColor }]}>
          <Text style={customerStyles.detailThumbText}>{selectedMedicine.genericName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[customerStyles.detailTitle, { color: theme.text }]}>{selectedMedicine.brandName}</Text>
        <Text style={[customerStyles.detailSubTitle, { color: theme.subtext }]}>
          {selectedMedicine.genericName} - {selectedMedicine.dosage} - {selectedMedicine.packSize}
        </Text>
        <Text style={[customerStyles.detailPrice, { color: theme.text }]}>{formatCurrency(selectedMedicine.salePrice)}</Text>
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

        <View style={customerStyles.inlineRow}>
          <ActionButton mode={mode} label="Compare pharmacies" icon="map-pin" onPress={() => onOpenPharmacies(selectedMedicine.id)} />
          <ActionButton mode={mode} label="Back to search" icon="search" variant="secondary" onPress={onOpenSearch} />
        </View>
      </View>
    </ScrollView>
  );
}
