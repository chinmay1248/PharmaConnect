import { ScrollView, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import type { ThemeMode } from '../../theme/theme';
import { Kpi, OrderCard, styles } from './companyShared';
import type { B2BOrder, CompanySummary } from './companyTypes';

type CompanyDashboardTabProps = {
  mode: ThemeMode;
  summary: CompanySummary;
  orders: B2BOrder[];
  onViewAllOrders: () => void;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
};

export function CompanyDashboardTab({
  mode,
  summary,
  orders,
  onViewAllOrders,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
}: CompanyDashboardTabProps) {
  const m = summary.metrics;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Company dashboard" description="Catalogue reach, wholesaler orders, and offer activity." />
      <View style={styles.kpiGrid}>
        <Kpi mode={mode} label="Medicines" value={m.medicineCount} icon="archive" />
        <Kpi mode={mode} label="Pending orders" value={m.pendingWholesellerOrders} icon="clock" />
        <Kpi mode={mode} label="Delivered" value={m.deliveredWholesellerOrders} icon="check-circle" />
        <Kpi mode={mode} label="Active offers" value={m.activeOffers} icon="tag" />
        <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
      </View>
      <SectionHeader mode={mode} title="Newest wholeseller orders" description="Bulk orders waiting on company fulfilment." action="View all" onAction={onViewAllOrders} />
      {orders.slice(0, 4).map((order) => (
        <OrderCard
          key={order.id}
          mode={mode}
          order={order}
          expandedOrderId={expandedOrderId}
          setExpandedOrderId={setExpandedOrderId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onApprove={onApprove}
          onReject={onReject}
          onAdvance={onAdvance}
        />
      ))}
    </ScrollView>
  );
}
