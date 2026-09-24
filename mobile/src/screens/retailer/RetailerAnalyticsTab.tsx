import { ScrollView, View } from 'react-native';
import { RevenueTrendChart, TopItemsChart } from '../../components/AnalyticsCharts';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import { KpiCard, styles } from './retailerShared';
import type { RetailerSummary } from './retailerTypes';

type RetailerAnalyticsTabProps = {
  mode: ThemeMode;
  summary: RetailerSummary;
};

export function RetailerAnalyticsTab({ mode, summary }: RetailerAnalyticsTabProps) {
  const theme = themes[mode];
  const revenue = summary.metrics.revenue;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Analytics" description="Sales and operational summary for the retailer." />
      <View style={styles.kpiGrid}>
        <KpiCard mode={mode} label="Revenue" value={formatCurrency(revenue)} icon="bar-chart-2" tone="#16a34a" />
        <KpiCard mode={mode} label="Total Orders" value={summary.metrics.totalOrders} icon="package" tone="#1d8cf8" />
        <KpiCard mode={mode} label="Active" value={summary.metrics.activeOrders} icon="activity" tone="#8b5cf6" />
        <KpiCard mode={mode} label="Low Stock" value={summary.metrics.lowStockCount} icon="alert-circle" tone="#ef4444" />
      </View>
      <RevenueTrendChart mode={mode} theme={theme} data={summary.revenueTrend} currencyFormatter={formatCurrency} />
      <TopItemsChart
        mode={mode}
        theme={theme}
        data={summary.topItems}
        currencyFormatter={formatCurrency}
        title="Top selling medicines"
        emptyLabel="No paid customer orders yet."
      />
    </ScrollView>
  );
}
