import { ScrollView, Text, TextInput, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import { ActionButton, Chip, styles, type InventoryFilter } from './retailerShared';
import type { RetailerInventoryItem } from './retailerTypes';

type RetailerInventoryTabProps = {
  mode: ThemeMode;
  filteredInventory: RetailerInventoryItem[];
  searchText: string;
  setSearchText: (value: string) => void;
  inventoryFilter: InventoryFilter;
  setInventoryFilter: (filter: InventoryFilter) => void;
  increaseInventoryStock: (item: RetailerInventoryItem) => Promise<void>;
  addDemoBatch: (item: RetailerInventoryItem) => Promise<void>;
};

export function RetailerInventoryTab({ mode, filteredInventory, searchText, setSearchText, inventoryFilter, setInventoryFilter, increaseInventoryStock, addDemoBatch }: RetailerInventoryTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Inventory" description="Stock, selling price, and reorder risk by medicine." />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search medicines in inventory"
        placeholderTextColor={theme.subtext}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <View style={styles.chipRow}>
        <Chip mode={mode} label="All" active={inventoryFilter === 'all'} onPress={() => setInventoryFilter('all')} />
        <Chip mode={mode} label="Low Stock" active={inventoryFilter === 'low'} onPress={() => setInventoryFilter('low')} />
        <Chip mode={mode} label="Out" active={inventoryFilter === 'out'} onPress={() => setInventoryFilter('out')} />
      </View>
      {filteredInventory.map((item) => {
        const isLow = item.availableQuantity <= (item.reorderLevel ?? 0);
        const fill = Math.min(100, Math.max(0, (item.availableQuantity / Math.max(item.reorderLevel ?? 20, 1)) * 100));

        return (
          <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
                <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                  {item.genericName} - {item.dosage ?? 'Dose'} - {item.packSize ?? 'Pack'}
                </Text>
              </View>
              <Text style={[styles.stockNumber, { color: isLow ? '#ef4444' : theme.text }]}>{item.availableQuantity}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Selling {formatCurrency(item.salePrice)} - Reorder at {item.reorderLevel ?? 0}
            </Text>
            <View style={[styles.stockTrack, { backgroundColor: theme.elevated }]}>
              <View style={[styles.stockFill, { width: `${fill}%`, backgroundColor: isLow ? '#f59e0b' : '#16a34a' }]} />
            </View>
            <View style={styles.actionRow}>
              <ActionButton
                mode={mode}
                label="+10 stock"
                icon="plus"
                variant="secondary"
                onPress={() => {
                  void increaseInventoryStock(item);
                }}
              />
              <ActionButton
                mode={mode}
                label="Add batch"
                icon="layers"
                variant="secondary"
                onPress={() => {
                  void addDemoBatch(item);
                }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
