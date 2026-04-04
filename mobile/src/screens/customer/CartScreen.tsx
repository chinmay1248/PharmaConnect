import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Medicine, Retailer } from '../../data/mockData';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { CartState } from './customerTypes';
import { customerStyles } from './customerStyles';

type CartScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  cart: CartState | null;
  cartMedicine: Medicine | null;
  cartRetailer: Retailer | null;
  cartUnitPrice: number;
  cartSubtotal: number;
  prescriptionUploaded: boolean;
  onUpdateQuantity: (change: number) => void;
  onContinueCheckout: () => void;
};

// Renders the cart review screen before the prescription or payment step.
export function CartScreen({
  mode,
  theme,
  contentContainerStyle,
  cart,
  cartMedicine,
  cartRetailer,
  cartUnitPrice,
  cartSubtotal,
  prescriptionUploaded,
  onUpdateQuantity,
  onContinueCheckout,
}: CartScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Review order"
        description="Product details, pharmacy details, quantity, and next step all in one place."
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {cartMedicine && cartRetailer ? (
          <>
            <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{cartMedicine.brandName}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              {cartMedicine.genericName} - {cartMedicine.packSize}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Pharmacy: {cartRetailer.name} - {cartRetailer.area}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Prescription: {cartMedicine.prescriptionRequired ? 'Required' : 'Not required'}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.text }]}>Price per pack: {formatCurrency(cartUnitPrice)}</Text>

            <View style={customerStyles.quantityRow}>
              <ActionButton mode={mode} label="-" variant="secondary" onPress={() => onUpdateQuantity(-1)} />
              <Text style={[customerStyles.quantityValue, { color: theme.text }]}>{cart?.quantity ?? 1}</Text>
              <ActionButton mode={mode} label="+" variant="secondary" onPress={() => onUpdateQuantity(1)} />
            </View>

            <View style={customerStyles.billBox}>
              <View style={customerStyles.billRow}>
                <Text style={[customerStyles.billText, { color: theme.subtext }]}>Subtotal</Text>
                <Text style={[customerStyles.billText, { color: theme.text }]}>{formatCurrency(cartSubtotal)}</Text>
              </View>
            </View>

            <ActionButton
              mode={mode}
              label={cartMedicine.prescriptionRequired && !prescriptionUploaded ? 'Continue to prescription' : 'Continue to payment'}
              icon="arrow-right"
              onPress={onContinueCheckout}
              fullWidth
            />
          </>
        ) : (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>No medicine selected yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}
