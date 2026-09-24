import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { ActionButton, Chip, Field, styles } from './companyShared';
import type { Offer, WholesellerListItem } from './companyTypes';

type CompanyOffersTabProps = {
  mode: ThemeMode;
  wholesellers: WholesellerListItem[];
  offers: Offer[];
  offerWholesellerId: string | null;
  setOfferWholesellerId: (id: string) => void;
  offerTitle: string;
  setOfferTitle: (value: string) => void;
  offerDesc: string;
  setOfferDesc: (value: string) => void;
  offerType: 'PERCENT' | 'FLAT';
  setOfferType: (value: 'PERCENT' | 'FLAT') => void;
  offerValue: string;
  setOfferValue: (value: string) => void;
  offerDays: string;
  setOfferDays: (value: string) => void;
  submitOffer: () => void;
};

export function CompanyOffersTab({
  mode,
  wholesellers,
  offers,
  offerWholesellerId,
  setOfferWholesellerId,
  offerTitle,
  setOfferTitle,
  offerDesc,
  setOfferDesc,
  offerType,
  setOfferType,
  offerValue,
  setOfferValue,
  offerDays,
  setOfferDays,
  submitOffer,
}: CompanyOffersTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Offers" description="Targeted discount offers sent to a wholesaler." />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>New offer</Text>
        <Text style={[styles.meta, { color: theme.subtext }]}>Wholesaler</Text>
        <View style={styles.chipRow}>
          {wholesellers.slice(0, 10).map((wholeseller) => (
            <Chip
              key={wholeseller.id}
              mode={mode}
              label={wholeseller.businessName}
              active={offerWholesellerId === wholeseller.id}
              onPress={() => setOfferWholesellerId(wholeseller.id)}
            />
          ))}
        </View>
        <Field mode={mode} label="Title" value={offerTitle} onChangeText={setOfferTitle} />
        <Field mode={mode} label="Description" value={offerDesc} onChangeText={setOfferDesc} />
        <View style={styles.chipRow}>
          <Chip mode={mode} label="Percent" active={offerType === 'PERCENT'} onPress={() => setOfferType('PERCENT')} />
          <Chip mode={mode} label="Flat" active={offerType === 'FLAT'} onPress={() => setOfferType('FLAT')} />
        </View>
        <View style={styles.fieldRow}>
          <Field mode={mode} label={offerType === 'PERCENT' ? 'Discount %' : 'Discount ₹'} value={offerValue} onChangeText={setOfferValue} keyboardType="numeric" />
          <Field mode={mode} label="Runs for (days)" value={offerDays} onChangeText={setOfferDays} keyboardType="numeric" />
        </View>
        <View style={styles.actionRow}>
          <ActionButton mode={mode} label="Publish offer" icon="tag" onPress={submitOffer} />
        </View>
      </View>

      {offers.length === 0 ? (
        <Text style={[styles.meta, { color: theme.subtext }]}>No offers yet.</Text>
      ) : (
        offers.map((offer) => (
          <View key={offer.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{offer.title}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {offer.wholesellerName} · {offer.status} · {offer.discountType ?? '—'} {offer.discountValue ?? ''}
            </Text>
            {offer.description ? <Text style={[styles.meta, { color: theme.subtext }]}>{offer.description}</Text> : null}
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {new Date(offer.startsAt).toLocaleDateString()} – {new Date(offer.endsAt).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
