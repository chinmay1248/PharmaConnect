import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import { KpiCard, OrderCard, styles, type InventoryFilter, type OrderFilter } from './retailerShared';
import type { RetailerOrder, RetailerSummary, RetailerTab } from './retailerTypes';

type RetailerDashboardTabProps = {
  mode: ThemeMode;
  orders: RetailerOrder[];
  summary: RetailerSummary;
  selectedOrder: RetailerOrder | null;
  onSelectOrder: (id: string) => void;
  setOrderFilter: (filter: OrderFilter) => void;
  setInventoryFilter: (filter: InventoryFilter) => void;
  setActiveTab: (tab: RetailerTab) => void;
};

export function RetailerDashboardTab({ mode, orders, summary, selectedOrder, onSelectOrder, setOrderFilter, setInventoryFilter, setActiveTab }: RetailerDashboardTabProps) {
  const theme = themes[mode];
  const recentOrders = orders.slice(0, 5);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Retailer dashboard" description="Live order workload, sales, and stock risk." />
      <View style={styles.kpiGrid}>
        <KpiCard mode={mode} label="Pending Orders" value={summary.metrics.pendingOrders} icon="clock" tone="#f59e0b" onPress={() => { setOrderFilter('PENDING_ACTION'); setActiveTab('orders'); }} />
        <KpiCard mode={mode} label="Revenue" value={formatCurrency(summary.metrics.revenue)} icon="trending-up" tone="#16a34a" />
        <KpiCard mode={mode} label="Delivered" value={summary.metrics.deliveredOrders} icon="check-circle" tone="#1d8cf8" />
        <KpiCard mode={mode} label="Low Stock" value={summary.metrics.lowStockCount} icon="alert-triangle" tone="#ef4444" onPress={() => { setInventoryFilter('low'); setActiveTab('inventory'); }} />
      </View>

      <SectionHeader mode={mode} title="Recent orders" description="Newest customer orders for this pharmacy." />
      {recentOrders.map((order) => (
      <OrderCard
        key={order.id}
        mode={mode}
        order={order}
        active={selectedOrder?.id === order.id}
        onPress={() => onSelectOrder(order.id)}
      />
    ))}

      <SectionHeader mode={mode} title="Alerts" description="Inventory items at or below reorder level." />
      {summary.stockAlerts.length ? summary.stockAlerts.map((item) => (
        <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
          <Text style={[styles.cardMeta, { color: theme.subtext }]}>
            Available {item.availableQuantity}, reorder at {item.reorderLevel ?? 0}
          </Text>
        </View>
      )) : (
        <Text style={[styles.emptyText, { color: theme.subtext }]}>No stock alerts right now.</Text>
      )}
    </ScrollView>
  );
}
