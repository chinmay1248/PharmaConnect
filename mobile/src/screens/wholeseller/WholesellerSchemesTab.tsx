import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { ActionButton, Chip, Field, styles } from './wholesellerShared';
import type { RetailerListItem, Scheme } from './wholesellerTypes';

type SchemesTabProps = {
  mode: ThemeMode;
  schemeTitle: string;
  setSchemeTitle: (value: string) => void;
  schemeDesc: string;
  setSchemeDesc: (value: string) => void;
  schemeType: 'PERCENT' | 'FLAT';
  setSchemeType: (type: 'PERCENT' | 'FLAT') => void;
  schemeValue: string;
  setSchemeValue: (value: string) => void;
  schemeDays: string;
  setSchemeDays: (value: string) => void;
  schemeRetailerId: string | null;
  setSchemeRetailerId: (id: string | null) => void;
  retailers: RetailerListItem[];
  schemes: Scheme[];
  onSubmitScheme: () => void;
};

export function WholesellerSchemesTab({
  mode,
  schemeTitle,
  setSchemeTitle,
  schemeDesc,
  setSchemeDesc,
  schemeType,
  setSchemeType,
  schemeValue,
  setSchemeValue,
  schemeDays,
  setSchemeDays,
  schemeRetailerId,
  setSchemeRetailerId,
  retailers,
  schemes,
  onSubmitScheme,
}: SchemesTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Schemes" description="Discount schemes offered to all retailers or one targeted pharmacy." />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>New scheme</Text>
        <Field mode={mode} label="Title" value={schemeTitle} onChangeText={setSchemeTitle} />
        <Field mode={mode} label="Description" value={schemeDesc} onChangeText={setSchemeDesc} />
        <View style={styles.chipRow}>
          <Chip mode={mode} label="Percent" active={schemeType === 'PERCENT'} onPress={() => setSchemeType('PERCENT')} />
          <Chip mode={mode} label="Flat" active={schemeType === 'FLAT'} onPress={() => setSchemeType('FLAT')} />
        </View>
        <View style={styles.fieldRow}>
          <Field mode={mode} label={schemeType === 'PERCENT' ? 'Discount %' : 'Discount ₹'} value={schemeValue} onChangeText={setSchemeValue} keyboardType="numeric" />
          <Field mode={mode} label="Runs for (days)" value={schemeDays} onChangeText={setSchemeDays} keyboardType="numeric" />
        </View>
        <Text style={[styles.meta, { color: theme.subtext }]}>Target (optional)</Text>
        <View style={styles.chipRow}>
          <Chip mode={mode} label="All retailers" active={schemeRetailerId === null} onPress={() => setSchemeRetailerId(null)} />
          {retailers.slice(0, 8).map((retailer) => (
            <Chip
              key={retailer.id}
              mode={mode}
              label={retailer.businessName}
              active={schemeRetailerId === retailer.id}
              onPress={() => setSchemeRetailerId(retailer.id)}
            />
          ))}
        </View>
        <View style={styles.actionRow}>
          <ActionButton mode={mode} label="Publish scheme" icon="tag" onPress={() => onSubmitScheme()} />
        </View>
      </View>

      {schemes.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No schemes yet.</Text>
      ) : (
        schemes.map((scheme) => (
          <View key={scheme.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{scheme.title}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {scheme.status} · {scheme.discountType ?? '—'} {scheme.discountValue ?? ''} · {scheme.retailerName ?? 'All retailers'}
            </Text>
            {scheme.description ? <Text style={[styles.meta, { color: theme.subtext }]}>{scheme.description}</Text> : null}
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {new Date(scheme.startsAt).toLocaleDateString()} – {new Date(scheme.endsAt).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
