import { StyleSheet, Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  title: {
    color: '#17384D',
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    color: '#637B8D',
    fontSize: 13,
    lineHeight: 19,
  },
});
