import { ScrollView, Text, View } from 'react-native';
import { RevenueTrendChart, TopItemsChart } from '../../components/AnalyticsCharts';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { Kpi, normalizeStatus, styles, type StockAlert } from './wholesellerShared';
import type { B2BOrder, WholesellerSummary } from './wholesellerTypes';

type AnalyticsTabProps = {
  mode: ThemeMode;
  summary: WholesellerSummary;
  retailerOrders: B2BOrder[];
  stockAlerts: StockAlert[];
};

export function WholesellerAnalyticsTab({
  mode,
  summary,
  retailerOrders,
  stockAlerts,
}: AnalyticsTabProps) {
  const theme = themes[mode];
  const m = summary.metrics;
  const byStatus = retailerOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(byStatus));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Analytics" description="Order workload, revenue, and stock risk." />
      <View style={styles.kpiGrid}>
        <Kpi mode={mode} label="Total orders" value={m.totalRetailerOrders} icon="layers" />
        <Kpi mode={mode} label="Pending" value={m.pendingRetailerOrders} icon="clock" />
        <Kpi mode={mode} label="Delivered" value={m.deliveredRetailerOrders} icon="check-circle" />
        <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
      </View>

      <RevenueTrendChart mode={mode} theme={theme} data={summary.revenueTrend} currencyFormatter={formatCurrency} />
      <TopItemsChart
        mode={mode}
        theme={theme}
        data={summary.topItems}
        currencyFormatter={formatCurrency}
        title="Top selling medicines"
        emptyLabel="No paid retailer orders yet."
      />

      <SectionHeader mode={mode} title="Retailer orders by status" />
      {Object.keys(byStatus).length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No orders yet.</Text>
      ) : (
        Object.entries(byStatus).map(([status, count]) => (
          <View key={status} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: theme.subtext }]}>{normalizeStatus(status)}</Text>
            <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
              <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(count / maxCount) * 100}%` }]} />
            </View>
            <Text style={[styles.barValue, { color: theme.text }]}>{count}</Text>
          </View>
        ))
      )}

      <SectionHeader mode={mode} title="Stock alerts" />
      {stockAlerts.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No lines below reorder level.</Text>
      ) : (
        stockAlerts.map((alert) => (
          <View key={alert.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{alert.brandName}</Text>
            <Text style={[styles.meta, { color: theme.danger }]}>{alert.availableQuantity} available · reorder at {alert.reorderLevel ?? 0}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
