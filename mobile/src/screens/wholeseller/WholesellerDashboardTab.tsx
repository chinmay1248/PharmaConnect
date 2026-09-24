import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { Kpi, OrderCard, styles, type StockAlert } from './wholesellerShared';
import type { B2BOrder, WholesellerSummary } from './wholesellerTypes';

type DashboardTabProps = {
  mode: ThemeMode;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
  summary: WholesellerSummary;
  stockAlerts: StockAlert[];
  retailerOrders: B2BOrder[];
  onViewAll: () => void;
};

export function WholesellerDashboardTab({
  mode,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
  summary,
  stockAlerts,
  retailerOrders,
  onViewAll,
}: DashboardTabProps) {
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
  const m = summary.metrics;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Distribution dashboard" description="Retailer demand, stock risk, and upstream buying at a glance." />
      <View style={styles.kpiGrid}>
        <Kpi mode={mode} label="Pending retailer orders" value={m.pendingRetailerOrders} icon="clock" />
        <Kpi mode={mode} label="Delivered" value={m.deliveredRetailerOrders} icon="check-circle" />
        <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
        <Kpi mode={mode} label="Active schemes" value={m.activeSchemes} icon="tag" />
        <Kpi mode={mode} label="Low stock lines" value={m.lowStockCount} icon="alert-triangle" />
        <Kpi mode={mode} label="Total orders" value={m.totalRetailerOrders} icon="layers" />
      </View>

      <SectionHeader mode={mode} title="Stock alerts" description="Lines at or below their reorder level." />
      {stockAlerts.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No lines are below their reorder level.</Text>
      ) : (
        stockAlerts.slice(0, 6).map((alert) => (
          <View key={alert.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{alert.brandName}</Text>
            <Text style={[styles.meta, { color: theme.danger }]}>
              {alert.availableQuantity} available · reorder at {alert.reorderLevel ?? 0}
            </Text>
          </View>
        ))
      )}

      <SectionHeader mode={mode} title="Latest retailer orders" description="Newest pharmacy restock requests." action="View all" onAction={() => onViewAll()} />
      {retailerOrders.slice(0, 4).map((order) => <OrderCard key={order.id} {...orderCardProps} order={order} />)}
    </ScrollView>
  );
}
