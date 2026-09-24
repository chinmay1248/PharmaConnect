import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { ActionButton, Chip, Field, styles } from './companyShared';
import type { B2BMedicine } from './companyTypes';

export type MedicineDraft = { mrp: string; medicineType: 'OTC' | 'PRESCRIPTION' };

type CompanyCatalogueTabProps = {
  mode: ThemeMode;
  catalogue: B2BMedicine[];
  showAddMed: boolean;
  setShowAddMed: (updater: (current: boolean) => boolean) => void;
  newBrand: string;
  setNewBrand: (value: string) => void;
  newGeneric: string;
  setNewGeneric: (value: string) => void;
  newDosage: string;
  setNewDosage: (value: string) => void;
  newPack: string;
  setNewPack: (value: string) => void;
  newMrp: string;
  setNewMrp: (value: string) => void;
  newType: 'OTC' | 'PRESCRIPTION';
  setNewType: (value: 'OTC' | 'PRESCRIPTION') => void;
  submitNewMedicine: () => void;
  medDraftFor: (medicine: B2BMedicine) => MedicineDraft;
  medIsDirty: (medicine: B2BMedicine) => boolean;
  setMedDrafts: (updater: (current: Record<string, MedicineDraft>) => Record<string, MedicineDraft>) => void;
  saveMedicine: (medicine: B2BMedicine) => void;
};

export function CompanyCatalogueTab({
  mode,
  catalogue,
  showAddMed,
  setShowAddMed,
  newBrand,
  setNewBrand,
  newGeneric,
  setNewGeneric,
  newDosage,
  setNewDosage,
  newPack,
  setNewPack,
  newMrp,
  setNewMrp,
  newType,
  setNewType,
  submitNewMedicine,
  medDraftFor,
  medIsDirty,
  setMedDrafts,
  saveMedicine,
}: CompanyCatalogueTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader
        mode={mode}
        title="Catalogue"
        description="Medicines your company manufactures and supplies to wholesalers."
        action={showAddMed ? 'Close' : 'Add medicine'}
        onAction={() => setShowAddMed((current) => !current)}
      />

      {showAddMed ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>New medicine</Text>
          <Field mode={mode} label="Brand name" value={newBrand} onChangeText={setNewBrand} />
          <Field mode={mode} label="Composition / generic" value={newGeneric} onChangeText={setNewGeneric} />
          <View style={styles.fieldRow}>
            <Field mode={mode} label="Dosage" value={newDosage} onChangeText={setNewDosage} />
            <Field mode={mode} label="Pack size" value={newPack} onChangeText={setNewPack} />
            <Field mode={mode} label="MRP" value={newMrp} onChangeText={setNewMrp} keyboardType="numeric" />
          </View>
          <View style={styles.chipRow}>
            <Chip mode={mode} label="OTC" active={newType === 'OTC'} onPress={() => setNewType('OTC')} />
            <Chip mode={mode} label="Prescription" active={newType === 'PRESCRIPTION'} onPress={() => setNewType('PRESCRIPTION')} />
          </View>
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label="Add to catalogue" icon="plus" onPress={submitNewMedicine} />
          </View>
        </View>
      ) : null}

      {catalogue.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No medicines in the catalogue yet.</Text>
      ) : (
        catalogue.map((medicine) => {
          const draft = medDraftFor(medicine);
          const dirty = medIsDirty(medicine);
          return (
            <View key={medicine.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>
                {medicine.genericName} · {medicine.dosage} · {medicine.packSize}
              </Text>
              <View style={styles.fieldRow}>
                <Field
                  mode={mode}
                  label="MRP"
                  value={draft.mrp}
                  onChangeText={(v) => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), mrp: v } }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.chipRow}>
                <Chip
                  mode={mode}
                  label="OTC"
                  active={draft.medicineType === 'OTC'}
                  onPress={() => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), medicineType: 'OTC' } }))}
                />
                <Chip
                  mode={mode}
                  label="Prescription"
                  active={draft.medicineType === 'PRESCRIPTION'}
                  onPress={() => setMedDrafts((c) => ({ ...c, [medicine.id]: { ...medDraftFor(medicine), medicineType: 'PRESCRIPTION' } }))}
                />
              </View>
              {dirty ? (
                <View style={styles.actionRow}>
                  <ActionButton mode={mode} label="Save" icon="save" onPress={() => saveMedicine(medicine)} />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
