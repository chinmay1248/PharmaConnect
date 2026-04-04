import { Alert, ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Medicine, Retailer } from '../../data/mockData';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { InvoiceState } from './customerTypes';
import { customerStyles } from './customerStyles';

type InvoiceScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  invoice: InvoiceState | null;
  medicines: Medicine[];
  retailers: Retailer[];
};

// Renders the invoice and bill summary shown after an order is placed.
export function InvoiceScreen({
  mode,
  theme,
  contentContainerStyle,
  invoice,
  medicines,
  retailers,
}: InvoiceScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Invoice and bill"
        description="The customer can review and download the bill from here."
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {invoice ? (
          <>
            <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{invoice.invoiceNo}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Order: {invoice.orderId}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Medicine: {medicines.find((medicine) => medicine.id === invoice.medicineId)?.brandName}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Pharmacy: {retailers.find((retailer) => retailer.id === invoice.retailerId)?.name}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Quantity: {invoice.quantity}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Payment: {invoice.paymentMethod.toUpperCase()}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Delivery: {invoice.deliveryMethod === 'home' ? 'Home delivery' : 'Pickup from pharmacy'}
            </Text>

            <View style={customerStyles.billBox}>
              <View style={customerStyles.billRow}>
                <Text style={[customerStyles.billText, { color: theme.subtext }]}>Subtotal</Text>
                <Text style={[customerStyles.billText, { color: theme.text }]}>{formatCurrency(invoice.subtotal)}</Text>
              </View>
              <View style={customerStyles.billRow}>
                <Text style={[customerStyles.billText, { color: theme.subtext }]}>Delivery fee</Text>
                <Text style={[customerStyles.billText, { color: theme.text }]}>{formatCurrency(invoice.deliveryFee)}</Text>
              </View>
              <View style={customerStyles.billRow}>
                <Text style={[customerStyles.billTotal, { color: theme.text }]}>Total bill</Text>
                <Text style={[customerStyles.billTotal, { color: theme.text }]}>{formatCurrency(invoice.total)}</Text>
              </View>
            </View>

            <ActionButton
              mode={mode}
              label="Download invoice"
              icon="download"
              onPress={() => Alert.alert('Download invoice', 'PDF download can be connected when the backend invoice service is added.')}
              fullWidth
            />
          </>
        ) : (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>No invoice generated yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}
