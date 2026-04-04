import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Order } from '../../data/mockData';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { orderStepIndex } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';

type TrackingScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  activeOrder: Order;
  onOpenInvoice: () => void;
  onOpenOrders: () => void;
};

// Renders the tracking timeline after a customer places or opens an order.
export function TrackingScreen({
  mode,
  theme,
  contentContainerStyle,
  activeOrder,
  onOpenInvoice,
  onOpenOrders,
}: TrackingScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title={`Track ${activeOrder.id}`}
        description="Order progress is visible step by step after retailer confirmation."
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {['Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'].map((step, index) => {
          const active = index <= orderStepIndex(activeOrder.status);
          return (
            <View key={step} style={customerStyles.trackRow}>
              <View style={[customerStyles.trackDot, { backgroundColor: active ? theme.primary : theme.border }]} />
              <View style={customerStyles.trackCopy}>
                <Text style={[customerStyles.trackTitle, { color: active ? theme.text : theme.subtext }]}>{step}</Text>
                <Text style={[customerStyles.trackMeta, { color: theme.subtext }]}>
                  {active ? 'Visible in the customer timeline' : 'Waiting for the next update'}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={customerStyles.inlineRow}>
          <ActionButton mode={mode} label="View invoice" icon="file-text" onPress={onOpenInvoice} />
          <ActionButton mode={mode} label="Go to orders" icon="package" variant="secondary" onPress={onOpenOrders} />
        </View>
      </View>
    </ScrollView>
  );
}
