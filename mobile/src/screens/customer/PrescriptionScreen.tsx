import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { ActionButton } from './CustomerShared';
import { PrescriptionUpload } from './customerTypes';
import { customerStyles } from './customerStyles';

type PrescriptionScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  isCompactLayout: boolean;
  prescriptionUploaded: boolean;
  upload?: PrescriptionUpload | null;
  helperText?: string | null;
  isUploading?: boolean;
  onSubmitPrescription: (source: 'camera' | 'gallery') => void;
  onBackToCart: () => void;
};

// Renders the prescription upload step for Rx medicines.
export function PrescriptionScreen({
  mode,
  theme,
  contentContainerStyle,
  isCompactLayout,
  prescriptionUploaded,
  upload,
  helperText,
  isUploading = false,
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
          Upload the prescription before checkout so the retailer receives it with the order for review.
        </Text>
        {helperText ? <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text> : null}
        {upload ? (
          <View style={customerStyles.billBox}>
            <Text style={[customerStyles.billText, { color: theme.text }]}>File: {upload.originalFileName}</Text>
            <Text style={[customerStyles.billText, { color: theme.subtext }]}>Source: {upload.source}</Text>
            <Text style={[customerStyles.billText, { color: theme.subtext }]}>
              Uploaded: {new Date(upload.uploadedAt).toLocaleString()}
            </Text>
          </View>
        ) : null}
        <View style={[customerStyles.inlineRow, isCompactLayout && customerStyles.inlineRowStack]}>
          <ActionButton
            mode={mode}
            label={isUploading ? 'Uploading from camera...' : prescriptionUploaded ? 'Upload from camera again' : 'Upload from camera'}
            icon="camera"
            onPress={() => onSubmitPrescription('camera')}
            fullWidth={isCompactLayout}
          />
          <ActionButton
            mode={mode}
            label={isUploading ? 'Uploading from gallery...' : prescriptionUploaded ? 'Upload from gallery again' : 'Upload from gallery'}
            icon="image"
            variant="secondary"
            onPress={() => onSubmitPrescription('gallery')}
            fullWidth={isCompactLayout}
          />
          <ActionButton
            mode={mode}
            label="Back to cart"
            icon="arrow-left"
            variant="secondary"
            onPress={onBackToCart}
            fullWidth={isCompactLayout}
          />
        </View>
      </View>
    </ScrollView>
  );
}
