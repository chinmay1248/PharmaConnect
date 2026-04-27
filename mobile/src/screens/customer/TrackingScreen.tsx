import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { orderStepIndex } from '../../utils/format';
import { ActionButton } from './CustomerShared';
import { CustomerOrderTrackingState } from './customerTypes';
import { customerStyles } from './customerStyles';

type TrackingScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  isCompactLayout: boolean;
  activeOrder: CustomerOrderTrackingState | null;
  helperText?: string | null;
  onOpenInvoice: () => void;
  onOpenOrders: () => void;
};

function formatTrackingTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function findStepMeta(order: CustomerOrderTrackingState, index: number) {
  const normalizedEvents = order.trackingEvents.map((event) => ({
    ...event,
    normalizedLabel: event.statusLabel.toLowerCase(),
  }));

  if (index === 0) {
    return normalizedEvents.find((event) => event.normalizedLabel.includes('order placed')) ?? null;
  }

  if (index === 1) {
    return (
      normalizedEvents.find(
        (event) =>
          event.normalizedLabel.includes('approved') ||
          event.normalizedLabel.includes('payment confirmed') ||
          event.normalizedLabel.includes('confirmed'),
      ) ?? null
    );
  }

  if (index === 2) {
    return normalizedEvents.find((event) => event.normalizedLabel.includes('packed')) ?? null;
  }

  if (index === 3) {
    return (
      normalizedEvents.find(
        (event) =>
          event.normalizedLabel.includes('out for delivery') ||
          event.normalizedLabel.includes('ready for pickup') ||
          event.normalizedLabel.includes('dispatched'),
      ) ?? null
    );
  }

  return normalizedEvents.find((event) => event.normalizedLabel.includes('delivered')) ?? null;
}

// Renders the tracking timeline after a customer places or opens an order.
export function TrackingScreen({
  mode,
  theme,
  contentContainerStyle,
  isCompactLayout,
  activeOrder,
  helperText,
  onOpenInvoice,
  onOpenOrders,
}: TrackingScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title={activeOrder ? `Track ${activeOrder.id}` : 'Track your order'}
        description="Order progress is visible step by step after retailer confirmation."
      />
      {helperText ? <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text> : null}
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {activeOrder ? (
          ['Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'].map((step, index) => {
            const active = index <= orderStepIndex(activeOrder.status);
            const stepMeta = findStepMeta(activeOrder, index);
            const timestamp = formatTrackingTimestamp(stepMeta?.createdAt);

            return (
              <View key={step} style={customerStyles.trackRow}>
                <View style={[customerStyles.trackDot, { backgroundColor: active ? theme.primary : theme.border }]} />
                <View style={customerStyles.trackCopy}>
                  <Text style={[customerStyles.trackTitle, { color: active ? theme.text : theme.subtext }]}>{step}</Text>
                  <Text style={[customerStyles.trackMeta, { color: theme.subtext }]}>
                    {timestamp
                      ? `${timestamp}${stepMeta?.notes ? ` - ${stepMeta.notes}` : ''}`
                      : active
                        ? 'Visible in the customer timeline'
                        : 'Waiting for the next update'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Select an order to view its live tracking timeline.
          </Text>
        )}
        {activeOrder ? (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Payment: {activeOrder.paymentStatus ?? 'Pending'} - Delivery:{' '}
            {activeOrder.deliveryMethod === 'home' ? 'Home delivery' : 'Pickup'}
          </Text>
        ) : null}
        {activeOrder?.rejectionReason ? (
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Rejection reason: {activeOrder.rejectionReason}
          </Text>
        ) : null}
        {activeOrder ? (
          <View style={[customerStyles.inlineRow, isCompactLayout && customerStyles.inlineRowStack]}>
            <ActionButton mode={mode} label="View invoice" icon="file-text" onPress={onOpenInvoice} fullWidth={isCompactLayout} />
            <ActionButton
              mode={mode}
              label="Go to orders"
              icon="package"
              variant="secondary"
              onPress={onOpenOrders}
              fullWidth={isCompactLayout}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
