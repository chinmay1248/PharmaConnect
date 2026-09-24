import { ScrollView, Text, View } from 'react-native';
import { RevenueTrendChart, TopItemsChart } from '../../components/AnalyticsCharts';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import { Kpi, normalizeStatus, styles } from './companyShared';
import type { B2BMedicine, B2BOrder, CompanySummary } from './companyTypes';

type CompanyAnalyticsTabProps = {
  mode: ThemeMode;
  summary: CompanySummary;
  orders: B2BOrder[];
  catalogue: B2BMedicine[];
};

export function CompanyAnalyticsTab({ mode, summary, orders, catalogue }: CompanyAnalyticsTabProps) {
  const theme = themes[mode];
  const m = summary.metrics;
  const byStatus = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(byStatus));
  const otc = catalogue.filter((medicine) => medicine.medicineType === 'OTC').length;
  const rx = catalogue.length - otc;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Analytics" description="Order workload, revenue, and catalogue mix." />
      <View style={styles.kpiGrid}>
        <Kpi mode={mode} label="Medicines" value={m.medicineCount} icon="archive" />
        <Kpi mode={mode} label="Pending" value={m.pendingWholesellerOrders} icon="clock" />
        <Kpi mode={mode} label="Delivered" value={m.deliveredWholesellerOrders} icon="check-circle" />
        <Kpi mode={mode} label="Revenue" value={formatCurrency(m.revenue)} icon="trending-up" />
      </View>

      <RevenueTrendChart mode={mode} theme={theme} data={summary.revenueTrend} currencyFormatter={formatCurrency} />
      <TopItemsChart
        mode={mode}
        theme={theme}
        data={summary.topItems}
        currencyFormatter={formatCurrency}
        title="Top selling medicines"
        emptyLabel="No paid wholesaler orders yet."
      />

      <SectionHeader mode={mode} title="Wholeseller orders by status" />
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

      <SectionHeader mode={mode} title="Catalogue mix" />
      <View style={styles.barRow}>
        <Text style={[styles.barLabel, { color: theme.subtext }]}>OTC</Text>
        <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(otc / Math.max(1, catalogue.length)) * 100}%` }]} />
        </View>
        <Text style={[styles.barValue, { color: theme.text }]}>{otc}</Text>
      </View>
      <View style={styles.barRow}>
        <Text style={[styles.barLabel, { color: theme.subtext }]}>Prescription</Text>
        <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.barFill, { backgroundColor: theme.warning, width: `${(rx / Math.max(1, catalogue.length)) * 100}%` }]} />
        </View>
        <Text style={[styles.barValue, { color: theme.text }]}>{rx}</Text>
      </View>
    </ScrollView>
  );
}
