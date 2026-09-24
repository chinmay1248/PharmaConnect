import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { Chip, ORDER_FILTERS, OrderCard, styles } from './wholesellerShared';
import type { B2BOrder, WholesellerOrderFilter } from './wholesellerTypes';

type RetailerOrdersTabProps = {
  mode: ThemeMode;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
  orderFilter: WholesellerOrderFilter;
  setOrderFilter: (filter: WholesellerOrderFilter) => void;
  filteredOrders: B2BOrder[];
};

export function WholesellerRetailerOrdersTab({
  mode,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
  orderFilter,
  setOrderFilter,
  filteredOrders,
}: RetailerOrdersTabProps) {
  const theme = themes[mode];
  const orderCardProps = {
    mode,
    expandedOrderId,
    setExpandedOrderId,
    rejectReason,
    setRejectReason,
    onApprove,
    onReject,
    onAdvance,
  };
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Retailer orders" description="Approve, reject with a reason, dispatch, and track pharmacy restock requests." />
      <View style={styles.chipRow}>
        {ORDER_FILTERS.map((filter) => (
          <Chip
            key={filter.key}
            mode={mode}
            label={filter.label}
            active={orderFilter === filter.key}
            onPress={() => setOrderFilter(filter.key)}
          />
        ))}
      </View>
      {filteredOrders.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No orders match this filter.</Text>
      ) : (
        filteredOrders.map((order) => <OrderCard key={order.id} {...orderCardProps} order={order} expandable />)
      )}
    </ScrollView>
  );
}
