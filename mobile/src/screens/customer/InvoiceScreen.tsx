import { Alert, Linking, ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Medicine, Retailer } from '../../data/mockData';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { buildCustomerInvoiceDownloadUrl } from '../../services/customerOrders';
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
  helperText?: string | null;
};

// Renders the invoice and bill summary shown after an order is placed.
export function InvoiceScreen({
  mode,
  theme,
  contentContainerStyle,
  invoice,
  medicines,
  retailers,
  helperText,
}: InvoiceScreenProps) {
  async function downloadInvoice() {
    if (!invoice) {
      return;
    }

    const fallbackDownloadUrl = invoice.invoiceId ? buildCustomerInvoiceDownloadUrl(invoice.invoiceId) : null;
    const downloadUrl = invoice.pdfUrl?.trim() || fallbackDownloadUrl;

    if (!downloadUrl) {
      Alert.alert(
        'Invoice unavailable',
        'This order is in local prototype mode, so no backend invoice download link is available yet.',
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(downloadUrl);

      if (!supported) {
        throw new Error('This device cannot open the invoice download link right now.');
      }

      await Linking.openURL(downloadUrl);
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error
          ? error.message
          : 'The invoice download link could not be opened right now.',
      );
    }
  }

  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Invoice and bill"
        description="The customer can review and download the bill from here."
      />
      {helperText ? <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text> : null}
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {invoice ? (
          <>
            <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{invoice.invoiceNo}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Order: {invoice.orderId}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Medicine: {medicines.find((medicine) => medicine.id === invoice.medicineId)?.brandName}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Pharmacy: {invoice.retailerName ?? retailers.find((retailer) => retailer.id === invoice.retailerId)?.name}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Quantity: {invoice.quantity}</Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Payment: {invoice.paymentMethod.toUpperCase()}</Text>
            {invoice.paymentStatus ? (
              <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Payment status: {invoice.paymentStatus}</Text>
            ) : null}
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              Delivery: {invoice.deliveryMethod === 'home' ? 'Home delivery' : 'Pickup from pharmacy'}
            </Text>
            {invoice.generatedAt ? (
              <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
                Generated: {new Date(invoice.generatedAt).toLocaleString()}
              </Text>
            ) : null}

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
              onPress={() => {
                void downloadInvoice();
              }}
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
