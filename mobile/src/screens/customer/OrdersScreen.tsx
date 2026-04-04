import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Order, Retailer } from '../../data/mockData';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { customerStyles } from './customerStyles';

type OrdersScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  orders: Order[];
  retailers: Retailer[];
  onOpenTracking: () => void;
};

// Renders the customer's order history and active order list.
export function OrdersScreen({
  mode,
  theme,
  contentContainerStyle,
  orders,
  retailers,
  onOpenTracking,
}: OrdersScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Your orders"
        description="Past and active medicine orders stay visible here."
      />
      {orders.map((order) => {
        const retailer = retailers.find((item) => item.id === order.retailerId) ?? retailers[0];
        return (
          <InteractivePressable
            key={order.id}
            onPress={onOpenTracking}
            style={[
              customerStyles.infoCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={customerStyles.infoHeader}>
              <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{order.id}</Text>
              <Text style={[customerStyles.orderStatus, { color: theme.primary }]}>{order.status}</Text>
            </View>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
              {retailer.name} - {order.dateLabel}
            </Text>
            <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Total: {formatCurrency(order.total)}</Text>
          </InteractivePressable>
        );
      })}
    </ScrollView>
  );
}
