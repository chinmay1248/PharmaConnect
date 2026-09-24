import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode, type ThemePalette } from '../../theme/theme';
import type { B2BOrder, CompanyOrderFilter } from './companyTypes';

export const ORDER_FILTERS: Array<{ key: CompanyOrderFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'REJECTED', label: 'Rejected' },
];

export function normalizeStatus(status: string) {
  return status
    .replace('PENDING_APPROVAL', 'Pending approval')
    .replace('PAYMENT_PENDING', 'Payment pending')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function nextOrderStatus(order: B2BOrder): 'DISPATCHED' | 'DELIVERED' | null {
  if (order.status === 'APPROVED' || order.status === 'PAID') return 'DISPATCHED';
  if (order.status === 'DISPATCHED') return 'DELIVERED';
  return null;
}

export function matchesFilter(order: B2BOrder, filter: CompanyOrderFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'APPROVED') return ['APPROVED', 'PAID', 'PAYMENT_PENDING'].includes(order.status);
  if (filter === 'REJECTED') return order.status === 'REJECTED';
  return order.status === filter;
}

export function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function ActionButton({
  mode,
  label,
  icon,
  onPress,
  danger = false,
}: {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = themes[mode];
  const backgroundColor = danger ? theme.danger : theme.primary;
  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor, borderColor: backgroundColor }]}
      pressedStyle={{ opacity: 0.85 }}
    >
      <Feather name={icon} size={15} color={theme.buttonText} />
      <Text style={[styles.actionLabel, { color: theme.buttonText }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function Field({
  mode,
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  mode: ThemeMode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  const theme = themes[mode];
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.subtext }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        placeholderTextColor={theme.subtext}
      />
    </View>
  );
}

export function Kpi({ mode, label, value, icon }: { mode: ThemeMode; label: string; value: string | number; icon: keyof typeof Feather.glyphMap }) {
  const theme = themes[mode];
  return (
    <View style={[styles.kpi, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Feather name={icon} size={18} color={theme.primary} />
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.meta, { color: theme.subtext }]}>{label}</Text>
    </View>
  );
}

export function Chip({ mode, label, active, onPress }: { mode: ThemeMode; label: string; active: boolean; onPress: () => void }) {
  const theme = themes[mode];
  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.primarySoft : theme.surface, borderColor: active ? theme.primary : theme.border }]}
    >
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.text }]}>{label}</Text>
    </InteractivePressable>
  );
}

export function Tab({ mode, active, label, icon, onPress }: { mode: ThemeMode; active: boolean; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const theme = themes[mode];
  return (
    <InteractivePressable onPress={onPress} style={[styles.tab, { backgroundColor: active ? theme.primarySoft : 'transparent' }]}>
      <Feather name={icon} size={17} color={active ? theme.primary : theme.subtext} />
      <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.subtext }]}>{label}</Text>
    </InteractivePressable>
  );
}

type OrderCardProps = {
  mode: ThemeMode;
  order: B2BOrder;
  expandable?: boolean;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
};

// Shown on both the dashboard preview and the full orders list, expandable to reveal line
// items, tracking history, and the approve/reject/advance actions.
export function OrderCard({
  mode,
  order,
  expandable,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
}: OrderCardProps) {
  const theme = themes[mode];
  const canDecide = order.status === 'PENDING_APPROVAL';
  const advanceTo = nextOrderStatus(order);
  const expanded = expandable && expandedOrderId === order.id;

  return (
    <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <InteractivePressable
        onPress={expandable ? () => setExpandedOrderId(expanded ? null : order.id) : undefined}
        style={styles.cardHead}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>#{order.id.slice(-10).toUpperCase()}</Text>
          <Text style={[styles.meta, { color: theme.subtext }]}>
            {order.wholeseller?.businessName ?? 'Wholeseller'} · {normalizeStatus(order.status)}
          </Text>
        </View>
        <Text style={[styles.total, { color: theme.text }]}>{formatCurrency(order.totalAmount)}</Text>
      </InteractivePressable>

      {(!expandable || expanded) && (
        <View style={styles.cardBody}>
          {order.items.map((item) => (
            <View key={`${order.id}-${item.medicineId}`} style={styles.lineRow}>
              <Text style={[styles.meta, { color: theme.subtext, flex: 1 }]} numberOfLines={1}>
                {item.brandName} × {item.quantity}
              </Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}

          {order.rejectionReason ? (
            <Text style={[styles.meta, { color: theme.danger }]}>Rejected: {order.rejectionReason}</Text>
          ) : null}

          {expanded && order.trackingEvents && order.trackingEvents.length > 0 ? (
            <View style={styles.timeline}>
              {order.trackingEvents.map((event, index) => (
                <View key={event.id ?? index} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.meta, { color: theme.text, fontWeight: '700' }]}>{event.statusLabel}</Text>
                    {event.notes ? <Text style={[styles.meta, { color: theme.subtext }]}>{event.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {canDecide ? (
            <View style={{ gap: 8 }}>
              <View style={styles.actionRow}>
                <ActionButton mode={mode} label="Approve" icon="check" onPress={() => onApprove(order)} />
              </View>
              <TextInput
                value={expandedOrderId === order.id ? rejectReason : ''}
                onFocus={() => setExpandedOrderId(order.id)}
                onChangeText={setRejectReason}
                placeholder="Reason to reject (5+ characters)"
                placeholderTextColor={theme.subtext}
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              />
              <View style={styles.actionRow}>
                <ActionButton mode={mode} label="Reject" icon="x" danger onPress={() => onReject(order)} />
              </View>
            </View>
          ) : null}

          {advanceTo ? (
            <ActionButton mode={mode} label={`Mark ${normalizeStatus(advanceTo)}`} icon="truck" onPress={() => onAdvance(order)} />
          ) : null}
        </View>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { padding: 14, borderBottomWidth: 1, gap: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 14, paddingBottom: 120, gap: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { minWidth: 150, flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, gap: 7 },
  kpiValue: { fontSize: 21, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardBody: { gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18 },
  total: { fontSize: 15, fontWeight: '900' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13 },
  field: { flex: 1, minWidth: 96, gap: 4 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700' },
  timeline: { gap: 8, marginTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 11, width: 110 },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 999 },
  barValue: { fontSize: 12, fontWeight: '900', width: 32, textAlign: 'right' },
  actionButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionLabel: { fontSize: 12, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12, fontWeight: '800' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 2, padding: 8, borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
});

export type { ThemePalette };
