import { ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import { ActionButton, Chip, formatShortDate, normalizeStatusLabel, statusColor, styles } from './retailerShared';
import type {
  RetailerInventoryItem,
  RetailerPurchaseOrder,
  WholesellerInventoryItem,
  WholesellerSummary,
} from './retailerTypes';

type RetailerBuyTabProps = {
  mode: ThemeMode;
  inventory: RetailerInventoryItem[];
  wholesellers: WholesellerSummary[];
  selectedWholesellerId: string;
  setSelectedWholesellerId: (id: string) => void;
  buySearchText: string;
  setBuySearchText: (value: string) => void;
  buyResults: WholesellerInventoryItem[];
  purchaseOrders: RetailerPurchaseOrder[];
  placePurchaseOrder: (item: WholesellerInventoryItem) => Promise<void>;
  confirmPurchaseReceipt: (order: RetailerPurchaseOrder) => Promise<void>;
};

export function RetailerBuyTab({ mode, inventory, wholesellers, selectedWholesellerId, setSelectedWholesellerId, buySearchText, setBuySearchText, buyResults, purchaseOrders, placePurchaseOrder, confirmPurchaseReceipt }: RetailerBuyTabProps) {
  const theme = themes[mode];
  const lowStock = inventory.filter((item) => item.availableQuantity <= (item.reorderLevel ?? 0));
  const selectedWholeseller = wholesellers.find((item) => item.id === selectedWholesellerId) ?? wholesellers[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Buy stock" description="Find wholesalers and restock low inventory items." />
      <TextInput
        value={buySearchText}
        onChangeText={setBuySearchText}
        placeholder="Search medicines to restock"
        placeholderTextColor={theme.subtext}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />

      <SectionHeader mode={mode} title="Low stock" description="Tap a medicine to search wholesaler stock." />
      {lowStock.length ? lowStock.map((item) => (
        <InteractivePressable
          key={item.inventoryId}
          onPress={() => setBuySearchText(item.brandName)}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
          <Text style={[styles.cardMeta, { color: theme.subtext }]}>
            Available {item.availableQuantity}, reorder at {item.reorderLevel ?? 0}
          </Text>
        </InteractivePressable>
      )) : (
        <Text style={[styles.emptyText, { color: theme.subtext }]}>No low-stock items to restock.</Text>
      )}

      <SectionHeader mode={mode} title="Wholesalers" description={selectedWholeseller?.businessName ?? 'Select a wholesaler'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {wholesellers.map((wholeseller) => (
          <Chip
            key={wholeseller.id}
            mode={mode}
            label={wholeseller.businessName}
            active={selectedWholesellerId === wholeseller.id}
            onPress={() => setSelectedWholesellerId(wholeseller.id)}
          />
        ))}
      </ScrollView>

      {buyResults.map((item) => {
        const subtotal = item.salePrice * 20;
        const gst = subtotal * 0.05;

        return (
          <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                  {item.genericName} - {item.availableQuantity} units available
                </Text>
              </View>
              <Text style={[styles.stockNumber, { color: theme.text }]}>{formatCurrency(item.salePrice)}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Demo order 20 units: subtotal {formatCurrency(subtotal)}, GST {formatCurrency(gst)}, total {formatCurrency(subtotal + gst)}
            </Text>
            <ActionButton
              mode={mode}
              label="Place purchase order"
              icon="shopping-bag"
              onPress={() => {
                void placePurchaseOrder(item);
              }}
            />
          </View>
        );
      })}

      <SectionHeader mode={mode} title="Purchase orders" description="Restock requests sent to wholesalers." />
      {purchaseOrders.length ? purchaseOrders.map((order) => (
        <View key={order.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{order.id}</Text>
              <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                {order.wholeseller.businessName} - {formatShortDate(order.placedAt)} - {order.items.length} item{order.items.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={[styles.statusPill, { borderColor: statusColor(order.status), backgroundColor: `${statusColor(order.status)}22` }]}>
              <Text style={[styles.statusText, { color: statusColor(order.status) }]}>{normalizeStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={[styles.cardMeta, { color: theme.subtext }]}>
            Total {formatCurrency(order.totalAmount)} - Payment {order.latestPayment?.status ?? 'PENDING'}
          </Text>
          {['DISPATCHED', 'PAID', 'APPROVED'].includes(order.status) ? (
            <ActionButton
              mode={mode}
              label="Confirm receipt"
              icon="check-circle"
              variant="secondary"
              onPress={() => {
                void confirmPurchaseReceipt(order);
              }}
            />
          ) : null}
        </View>
      )) : (
        <Text style={[styles.emptyText, { color: theme.subtext }]}>Purchase orders placed from this screen will appear here.</Text>
      )}
    </ScrollView>
  );
}
