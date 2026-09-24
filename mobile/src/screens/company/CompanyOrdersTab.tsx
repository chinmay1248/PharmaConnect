import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { Chip, ORDER_FILTERS, OrderCard, styles } from './companyShared';
import type { B2BOrder, CompanyOrderFilter } from './companyTypes';

type CompanyOrdersTabProps = {
  mode: ThemeMode;
  orderFilter: CompanyOrderFilter;
  setOrderFilter: (filter: CompanyOrderFilter) => void;
  filteredOrders: B2BOrder[];
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
};

export function CompanyOrdersTab({
  mode,
  orderFilter,
  setOrderFilter,
  filteredOrders,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
}: CompanyOrdersTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Wholeseller orders" description="Approve, reject with a reason, dispatch, and close upstream orders." />
      <View style={styles.chipRow}>
        {ORDER_FILTERS.map((filter) => (
          <Chip key={filter.key} mode={mode} label={filter.label} active={orderFilter === filter.key} onPress={() => setOrderFilter(filter.key)} />
        ))}
      </View>
      {filteredOrders.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No orders match this filter.</Text>
      ) : (
        filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            mode={mode}
            order={order}
            expandable
            expandedOrderId={expandedOrderId}
            setExpandedOrderId={setExpandedOrderId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onApprove={onApprove}
            onReject={onReject}
            onAdvance={onAdvance}
          />
        ))
      )}
    </ScrollView>
  );
}
