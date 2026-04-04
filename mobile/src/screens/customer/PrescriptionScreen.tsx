import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';

type PrescriptionScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  prescriptionUploaded: boolean;
  onSubmitPrescription: () => void;
  onBackToCart: () => void;
};

// Renders the prescription upload step for Rx medicines.
export function PrescriptionScreen({
  mode,
  theme,
  contentContainerStyle,
  prescriptionUploaded,
  onSubmitPrescription,
  onBackToCart,
}: PrescriptionScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Upload prescription"
        description="This step appears only when the selected medicine needs retailer approval."
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Upload prescription, then the retailer can approve or reject the order according to the PharmaConnect customer flow.
        </Text>
        <View style={customerStyles.inlineRow}>
          <ActionButton
            mode={mode}
            label={prescriptionUploaded ? 'Prescription uploaded' : 'Upload now'}
            icon="upload"
            onPress={onSubmitPrescription}
          />
          <ActionButton mode={mode} label="Back to cart" icon="arrow-left" variant="secondary" onPress={onBackToCart} />
        </View>
      </View>
    </ScrollView>
  );
}
