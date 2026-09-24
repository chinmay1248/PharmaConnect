import { ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton, Chip, Field, styles, type InventoryDraft } from './wholesellerShared';
import type { B2BInventoryItem, InventoryFilter } from './wholesellerTypes';

type InventoryTabProps = {
  mode: ThemeMode;
  medSearch: string;
  setMedSearch: (value: string) => void;
  medResults: Array<{ id: string; brandName: string; genericName: string; mrp: number }>;
  addPick: { id: string; brandName: string; mrp: number } | null;
  setAddPick: (pick: { id: string; brandName: string; mrp: number } | null) => void;
  addPrice: string;
  setAddPrice: (value: string) => void;
  addQty: string;
  setAddQty: (value: string) => void;
  inventoryFilter: InventoryFilter;
  setInventoryFilter: (filter: InventoryFilter) => void;
  visibleInventory: B2BInventoryItem[];
  draftFor: (item: B2BInventoryItem) => InventoryDraft;
  setDraft: (id: string, patch: Partial<InventoryDraft>) => void;
  isDirty: (item: B2BInventoryItem) => boolean;
  batchFor: string | null;
  setBatchFor: (id: string | null) => void;
  batchNo: string;
  setBatchNo: (value: string) => void;
  batchQty: string;
  setBatchQty: (value: string) => void;
  batchExpiry: string;
  setBatchExpiry: (value: string) => void;
  onAddInventoryItem: () => void;
  onSaveRow: (item: B2BInventoryItem) => void;
  onSubmitBatch: (item: B2BInventoryItem) => void;
};

export function WholesellerInventoryTab({
  mode,
  medSearch,
  setMedSearch,
  medResults,
  addPick,
  setAddPick,
  addPrice,
  setAddPrice,
  addQty,
  setAddQty,
  inventoryFilter,
  setInventoryFilter,
  visibleInventory,
  draftFor,
  setDraft,
  isDirty,
  batchFor,
  setBatchFor,
  batchNo,
  setBatchNo,
  batchQty,
  setBatchQty,
  batchExpiry,
  setBatchExpiry,
  onAddInventoryItem,
  onSaveRow,
  onSubmitBatch,
}: InventoryTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Inventory" description="Price, stock, reorder levels, and batch entries for your warehouse." />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Add a medicine</Text>
        <TextInput
          value={medSearch}
          onChangeText={setMedSearch}
          placeholder="Search the catalogue by brand or salt"
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        />
        {addPick ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.meta, { color: theme.text }]}>{addPick.brandName} · MRP {formatCurrency(addPick.mrp)}</Text>
            <View style={styles.fieldRow}>
              <Field mode={mode} label="Sale price" value={addPrice} onChangeText={setAddPrice} keyboardType="numeric" />
              <Field mode={mode} label="Opening stock" value={addQty} onChangeText={setAddQty} keyboardType="numeric" />
            </View>
            <View style={styles.actionRow}>
              <ActionButton mode={mode} label="Add to inventory" icon="plus" onPress={() => onAddInventoryItem()} />
              <ActionButton mode={mode} label="Cancel" icon="x" danger onPress={() => setAddPick(null)} />
            </View>
          </View>
        ) : (
          medResults.map((result) => (
            <InteractivePressable
              key={result.id}
              onPress={() => {
                setAddPick({ id: result.id, brandName: result.brandName, mrp: result.mrp });
                setAddPrice(String(Number((result.mrp * 0.9).toFixed(2))));
                setAddQty('100');
              }}
              style={[styles.resultRow, { borderColor: theme.border }]}
            >
              <Text style={[styles.meta, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                {result.brandName} · {result.genericName}
              </Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(result.mrp)}</Text>
            </InteractivePressable>
          ))
        )}
      </View>

      <View style={styles.chipRow}>
        {(['all', 'low', 'out'] as InventoryFilter[]).map((key) => (
          <Chip key={key} mode={mode} label={key === 'all' ? 'All' : key === 'low' ? 'Low stock' : 'Out of stock'} active={inventoryFilter === key} onPress={() => setInventoryFilter(key)} />
        ))}
      </View>

      {visibleInventory.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No inventory lines match this filter.</Text>
      ) : (
        visibleInventory.map((item) => {
          const draft = draftFor(item);
          const dirty = isDirty(item);
          return (
            <View key={item.inventoryId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {item.genericName} · {item.dosage} · {item.packSize}
                {item.medicineType ? ` · ${item.medicineType === 'PRESCRIPTION' ? 'Rx' : 'OTC'}` : ''}
              </Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {item.availableQuantity} available ({item.reservedQuantity} reserved)
              </Text>
              <View style={styles.fieldRow}>
                <Field mode={mode} label="Price" value={draft.salePrice} onChangeText={(v) => setDraft(item.inventoryId, { salePrice: v })} keyboardType="numeric" />
                <Field mode={mode} label="Stock" value={draft.stockQuantity} onChangeText={(v) => setDraft(item.inventoryId, { stockQuantity: v })} keyboardType="numeric" />
                <Field mode={mode} label="Reorder" value={draft.reorderLevel} onChangeText={(v) => setDraft(item.inventoryId, { reorderLevel: v })} keyboardType="numeric" />
              </View>
              <View style={styles.actionRow}>
                {dirty ? <ActionButton mode={mode} label="Save" icon="save" onPress={() => onSaveRow(item)} /> : null}
                <ActionButton
                  mode={mode}
                  label={batchFor === item.inventoryId ? 'Close batch' : 'Add batch'}
                  icon="box"
                  onPress={() => setBatchFor(batchFor === item.inventoryId ? null : item.inventoryId)}
                />
              </View>
              {batchFor === item.inventoryId ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.fieldRow}>
                    <Field mode={mode} label="Batch no." value={batchNo} onChangeText={setBatchNo} />
                    <Field mode={mode} label="Quantity" value={batchQty} onChangeText={setBatchQty} keyboardType="numeric" />
                  </View>
                  <Field mode={mode} label="Expiry (YYYY-MM-DD)" value={batchExpiry} onChangeText={setBatchExpiry} />
                  <View style={styles.actionRow}>
                    <ActionButton mode={mode} label="Log batch" icon="plus" onPress={() => onSubmitBatch(item)} />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
