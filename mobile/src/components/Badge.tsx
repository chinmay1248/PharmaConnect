import { StyleSheet, Text, View } from 'react-native';

type BadgeProps = {
  label: string;
  tone?: 'mint' | 'amber' | 'rose' | 'slate';
};

const tones = {
  mint: { backgroundColor: '#DDF6EB', color: '#176B45' },
  amber: { backgroundColor: '#FFF0D1', color: '#9D6208' },
  rose: { backgroundColor: '#FFE2E0', color: '#9A2E2B' },
  slate: { backgroundColor: '#E9EEF3', color: '#365065' },
};

export function Badge({ label, tone = 'slate' }: BadgeProps) {
  const palette = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
